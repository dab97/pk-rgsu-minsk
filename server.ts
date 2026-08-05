import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import { parseRgsuHtml, type ParseResult, type ParsedStudent } from "./shared/parser";

// ─── In-memory cache ───────────────────────────────────────────────────────
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 3 * 60 * 1000; // 3 минуты по умолчанию

interface CacheEntry {
  data: ParsedStudent[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
// Хранит промисы активных запросов — чтобы дублирующие запросы ждали первый,
// а не параллельно долбили внешний сервер
const inFlight = new Map<string, Promise<CacheEntry>>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.fetchedAt > CACHE_TTL_MS) cache.delete(key);
  }
}

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

// Периодическая очистка каждую минуту
setInterval(evictExpired, 60_000).unref();
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
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from RGSU: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const result: ParseResult = await parseRgsuHtml(html, type);

  const entry: CacheEntry = { data: result.students, updatedAt: result.updatedAt, seats: result.seats, warnings: result.warnings, fetchedAt: Date.now() };
  cache.set(`${type}:${id}`, entry);
  return entry;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // API route for fetching competition data
  app.get("/api/competition/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      if (type !== 'competition' && type !== 'contest') {
        res.status(400).json({ success: false, error: 'Invalid competition type' });
        return;
      }

      const cacheKey = `${type}:${id}`;

      // 1. Отдаём из кэша если свежий
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[cache HIT] ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        res.json({ success: true, data: cached.data, updatedAt: cached.updatedAt, seats: cached.seats, warnings: cached.warnings });
        return;
      }

      // 2. Если уже идёт запрос для этого ключа — ждём его результата
      if (inFlight.has(cacheKey)) {
        console.log(`[cache WAIT] ${cacheKey}`);
        const entry = await inFlight.get(cacheKey)!;
        res.setHeader('X-Cache', 'WAIT');
        res.json({ success: true, data: entry.data, updatedAt: entry.updatedAt, seats: entry.seats, warnings: entry.warnings });
        return;
      }

      // 3. Запускаем новый запрос и сохраняем промис
      console.log(`[cache MISS] ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');
      const promise = fetchAndParse(type, id).finally(() => inFlight.delete(cacheKey));
      inFlight.set(cacheKey, promise);

      const entry = await promise;
      res.json({ success: true, data: entry.data, updatedAt: entry.updatedAt, seats: entry.seats, warnings: entry.warnings });

    } catch (error: any) {
      console.error('Error fetching competition data:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        isTimeout: error.name === 'TimeoutError',
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
