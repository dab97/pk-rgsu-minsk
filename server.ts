import express from "express";
import path from "path";
import os from "os";
import helmet from "helmet";
import { LRUCache } from "lru-cache";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";
import { parseRgsuHtml, isValidId, isValidType, buildSafeRgsuUrl, type ParseResult, type ParsedStudent } from "./shared/parser";
import { loadArchivedOrder } from "./shared/archive";
import { competitionIdFromPath } from "./shared/competition-map";

// ─── Limits ────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 3 * 60 * 1000; // 3 минуты по умолчанию
const MAX_RESPONSE_BYTES = Number(process.env.MAX_RESPONSE_BYTES) || 5 * 1024 * 1024; // 5 МБ
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // запросов в минуту на IP
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 500;

interface CacheEntry {
  data: ParsedStudent[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
  fetchedAt: number;
}

// LRU-кэш с TTL: автоматически вытесняет старые и редко используемые записи
const cache = new LRUCache<string, CacheEntry>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS,
  ttlAutopurge: true,
});
// Хранит промисы активных запросов — чтобы дублирующие запросы ждали первый,
// а не параллельно долбили внешний сервер
const inFlight = new Map<string, Promise<CacheEntry>>();

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.data.length === 0) {
    cache.delete(key);
    return null;
  }
  return entry;
}
// ──────────────────────────────────────────────────────────────────────────

async function fetchAndParse(type: string, id: string): Promise<CacheEntry> {
  const url = `https://pk.rgsu.net/${type}/${id}`;
  const fetchTimeout = Number(process.env.FETCH_TIMEOUT_MS) || 10000;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(fetchTimeout),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from RGSU: ${response.status} ${response.statusText}`);
  }

  // Защита от OOM: проверяем Content-Length и читаем не больше MAX_RESPONSE_BYTES
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Response too large: ${contentLength} bytes (limit ${MAX_RESPONSE_BYTES})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const html = buf.toString('utf8');

  const result: ParseResult = parseRgsuHtml(html, type);

  const entry: CacheEntry = { data: result.students, updatedAt: result.updatedAt, seats: result.seats, warnings: result.warnings, fetchedAt: Date.now() };
  if (result.students.length > 0) {
    cache.set(`${type}:${id}`, entry);
  }
  return entry;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers (helmet). CSP не включаем по умолчанию — Vite dev
  // middleware требует inline-скрипты и eval для HMR, поэтому строгая CSP
  // применяется только в production.
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Rate limiting для API: защита от перегрузки внешнего RGSU-сервера и DoS
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
  });

  // API route for fetching competition data
  app.use('/api/competition/', apiLimiter);

  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || !req.path.startsWith('/api/competition/')) {
      return next();
    }
    let cacheKey = '';
    try {
      const subPath = req.path.replace(/^\/api\/competition\//, '');
      const parts = subPath.split('/');
      const type = parts[0] || '';
      const id = parts.slice(1).join('/') || '';

      // Защита от SSRF/path traversal: единая валидация через общий модуль
      if (!isValidType(type)) {
        res.status(400).json({ success: false, error: 'Invalid competition type' });
        return;
      }
      if (!isValidId(id) || !buildSafeRgsuUrl(type, id)) {
        res.status(400).json({ success: false, error: 'Invalid id' });
        return;
      }

      cacheKey = `${type}:${id}`;
      const competitionId = competitionIdFromPath(`https://pk.rgsu.net/${type}/${id}`);
      console.log(`[API Request] key=${cacheKey} comp=${competitionId}`);

      // 1. Отдаём из кэша если свежий
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[cache HIT] ${cacheKey} (students: ${cached.data.length})`);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Source', 'live');
        res.json({
          success: true,
          source: 'live',
          competitionId,
          data: cached.data,
          updatedAt: cached.updatedAt,
          seats: cached.seats,
          warnings: cached.warnings,
        });
        return;
      }

      // 2. Если уже идёт запрос для этого ключа — ждём его результата
      if (inFlight.has(cacheKey)) {
        console.log(`[cache WAIT] ${cacheKey}`);
        const entry = await inFlight.get(cacheKey)!;
        res.setHeader('X-Cache', 'WAIT');
        res.setHeader('X-Source', 'live');
        res.json({
          success: true,
          source: 'live',
          competitionId,
          data: entry.data,
          updatedAt: entry.updatedAt,
          seats: entry.seats,
          warnings: entry.warnings,
        });
        return;
      }

      // 3. Запускаем новый запрос и сохраняем промис
      console.log(`[cache MISS] ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', 'live');
      const promise = fetchAndParse(type, id).finally(() => inFlight.delete(cacheKey));
      inFlight.set(cacheKey, promise);

      const entry = await promise;
      console.log(`[API Done] ${cacheKey} -> ${entry.data.length} students parsed`);
      res.json({
        success: true,
        source: 'live',
        competitionId,
        data: entry.data,
        updatedAt: entry.updatedAt,
        seats: entry.seats,
        warnings: entry.warnings,
      });

    } catch (error: any) {
      // Логируем тип ошибки и категорию, но не полный error.message —
      // он может содержать URL с чувствительными id
      const kind = error.name === 'TimeoutError' ? 'TIMEOUT'
        : /too large|exceeded/i.test(error.message || '') ? 'TOO_LARGE'
        : 'FETCH_FAILED';
      console.error(`[API Error] key=${cacheKey} kind=${kind}`);

      // Fallback: пробуем отдать заархивированный приказ, если он есть
      // (приказы о зачислении не меняются после публикации)
      if (cacheKey) {
        const compId = competitionIdFromPath(`https://pk.rgsu.net/${cacheKey.replace(':', '/')}`);
        if (compId) {
          const archived = await loadArchivedOrder(compId);
          if (archived) {
            console.warn(`[API Fallback] serving archive for ${compId}`);
            res.setHeader('X-Source', 'archive');
            res.setHeader('X-Cache', 'BYPASS');
            res.setHeader('X-Archive-Date', archived.archivedAt);
            res.json({
              success: true,
              source: 'archive',
              competitionId: compId,
              data: archived.data.students,
              updatedAt: archived.data.updatedAt,
              seats: archived.data.seats,
              warnings: [
                ...archived.data.warnings,
                'Данные из локального архива — сервер pk.rgsu.net временно недоступен',
              ],
              archivedAt: archived.archivedAt,
            });
            return;
          }
        }
      }

      const isTimeout = kind === 'TIMEOUT';
      const status = isTimeout ? 504 : 502;
      const safeError = isTimeout
        ? 'Upstream timeout'
        : kind === 'TOO_LARGE'
          ? 'Upstream response too large'
          : 'Upstream fetch failed';
      res.status(status).json({
        success: false,
        error: safeError,
        isTimeout,
      });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((n) => n && n.family === 'IPv4' && !n.internal)
      .map((n) => `  LAN: http://${n.address}:${PORT}`)
      .join('\n');
    console.log(`Server running on:\n  Local: http://localhost:${PORT}\n${lan}`);
  });
}

startServer();
