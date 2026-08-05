import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// ─── In-memory cache ───────────────────────────────────────────────────────
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 минуты

interface CacheEntry {
  data: any[];
  updatedAt: string | null;
  seats: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
// Хранит промисы активных запросов — чтобы дублирующие запросы ждали первый,
// а не параллельно долбили внешний сервер
const inFlight = new Map<string, Promise<CacheEntry>>();

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}
// ──────────────────────────────────────────────────────────────────────────

async function fetchAndParse(type: string, id: string): Promise<CacheEntry> {
  const url = `https://pk.rgsu.net/${type}/${id}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from RGSU: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const students: any[] = [];

  let seats = 0;
  $('.faculty-intro__card').each((i, el) => {
    const caption = $(el).find('.faculty-intro__card-caption').text().trim();
    if (/мест/i.test(caption)) {
      const val = parseInt($(el).find('.faculty-intro__card-text').text().trim().replace(/\D/g, ''), 10);
      if (!isNaN(val)) seats = val;
    }
  });

  const updMatch = $('.main-screen__text').text().trim().match(/Сведения\s+обновлены:\s*(.+)/i);
  const updatedAt = updMatch ? updMatch[1].trim() : null;

  const table = $('table').first();
  if (table.length) {
    const rows = table.find('tbody tr');
    rows.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 10) {
        const parseNum = (text: string) => parseInt(text.trim(), 10) || 0;
        const parseStr = (text: string) => text.trim();
        const uniqueCode = parseStr($(cells[1]).text());
        if (uniqueCode && uniqueCode !== '-') {
          if (type === 'contest') {
            students.push({
              id: `student-${i}`,
              uniqueCode,
              totalPoints: parseNum($(cells[2]).text()),
              examPoints: parseNum($(cells[3]).text()),
              subjects: [parseNum($(cells[4]).text()), parseNum($(cells[5]).text()), parseNum($(cells[6]).text())],
              achievementPoints: parseNum($(cells[7]).text()),
              hasOriginal: parseStr($(cells[8]).text()).toLowerCase() === 'да',
              semesterPayment: parseStr($(cells[9]).text()) || 'Нет',
              priority: parseNum($(cells[10]).text()),
              mainHigherPriority: '-',
              higherPassingPriority: '-',
              preemptiveRight1: parseStr($(cells[11]).text()) || 'Нет',
              preemptiveRight2: parseStr($(cells[12]).text()) || 'Нет',
              idAtEquality: parseStr($(cells[13]).text()) || 'Нет',
              withoutExams: parseStr($(cells[14]).text()) || 'Нет',
              basisBVI: parseStr($(cells[15]).text()) || '-',
              status: parseStr($(cells[16]).text()) || '',
            });
          } else {
            students.push({
              id: `student-${i}`,
              uniqueCode,
              totalPoints: parseNum($(cells[2]).text()),
              examPoints: parseNum($(cells[3]).text()),
              subjects: [parseNum($(cells[4]).text()), parseNum($(cells[5]).text()), parseNum($(cells[6]).text())],
              achievementPoints: parseNum($(cells[7]).text()),
              hasOriginal: parseStr($(cells[8]).text()).toLowerCase() === 'да',
              priority: parseNum($(cells[9]).text()),
              mainHigherPriority: parseStr($(cells[10]).text()) || '-',
              higherPassingPriority: parseStr($(cells[11]).text()) || '-',
              preemptiveRight1: parseStr($(cells[12]).text()) || 'Нет',
              preemptiveRight2: parseStr($(cells[13]).text()) || 'Нет',
              idAtEquality: parseStr($(cells[14]).text()) || 'Нет',
              withoutExams: parseStr($(cells[15]).text()) || 'Нет',
              basisBVI: parseStr($(cells[16]).text()) || '-',
              status: parseStr($(cells[17]).text()) || '',
            });
          }
        }
      }
    });
  }

  const entry: CacheEntry = { data: students, updatedAt, seats, fetchedAt: Date.now() };
  cache.set(`${type}:${id}`, entry);
  return entry;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        res.json({ success: true, data: cached.data, updatedAt: cached.updatedAt, seats: cached.seats });
        return;
      }

      // 2. Если уже идёт запрос для этого ключа — ждём его результата
      if (inFlight.has(cacheKey)) {
        console.log(`[cache WAIT] ${cacheKey}`);
        const entry = await inFlight.get(cacheKey)!;
        res.setHeader('X-Cache', 'WAIT');
        res.json({ success: true, data: entry.data, updatedAt: entry.updatedAt, seats: entry.seats });
        return;
      }

      // 3. Запускаем новый запрос и сохраняем промис
      console.log(`[cache MISS] ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');
      const promise = fetchAndParse(type, id).finally(() => inFlight.delete(cacheKey));
      inFlight.set(cacheKey, promise);

      const entry = await promise;
      res.json({ success: true, data: entry.data, updatedAt: entry.updatedAt, seats: entry.seats });

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
