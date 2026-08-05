import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRgsuHtml, type ParseResult } from '../../../shared/parser';

const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 50000;
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS) || 2;
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS) || 1000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 3 * 60 * 1000;

interface CacheEntry {
  data: ParseResult;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CacheEntry>>();

function getCached(key: string): ParseResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

async function fetchHtml(url: string): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://pk.rgsu.net/',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from RGSU: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function fetchAndParse(type: string, id: string): Promise<CacheEntry> {
  const url = `https://pk.rgsu.net/${type}/${id}`;
  const html = await fetchHtml(url);
  const result = await parseRgsuHtml(html, type);
  const entry: CacheEntry = { data: result, fetchedAt: Date.now() };
  cache.set(`${type}:${id}`, entry);
  return entry;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, id } = req.query;

  if (typeof type !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid params' });
  }

  if (type !== 'competition' && type !== 'contest') {
    return res.status(400).json({ success: false, error: 'Invalid competition type' });
  }

  const cacheKey = `${type}:${id}`;

  // 1. Отдаём из кэша если свежий
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: cached.students, updatedAt: cached.updatedAt, seats: cached.seats, warnings: cached.warnings });
  }

  // 2. Если уже идёт запрос для этого ключа — ждём его результата
  if (inFlight.has(cacheKey)) {
    const entry = await inFlight.get(cacheKey)!;
    res.setHeader('X-Cache', 'WAIT');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: entry.data.students, updatedAt: entry.data.updatedAt, seats: entry.data.seats, warnings: entry.data.warnings });
  }

  // 3. Запускаем новый запрос
  try {
    const promise = fetchAndParse(type, id).finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, promise);

    const entry = await promise;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: entry.data.students, updatedAt: entry.data.updatedAt, seats: entry.data.seats, warnings: entry.data.warnings });
  } catch (error: any) {
    console.error('Error fetching competition data:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      isTimeout: error.name === 'TimeoutError',
    });
  }
}
