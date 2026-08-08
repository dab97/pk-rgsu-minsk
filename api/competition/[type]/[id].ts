import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LRUCache } from 'lru-cache';
import { loadArchivedOrder, loadArchivedOrderViaFetch } from '../../../shared/archive';
import { competitionIdFromPath } from '../../../shared/competition-map';

// ── Валидация входных параметров (вынесено из parser.ts) ──────────────────
const VALID_ID_REGEX = /^[A-Za-z0-9_\-]{1,256}(\/enrolled)?$/;
function isValidId(id: string): boolean { return VALID_ID_REGEX.test(id); }
function isValidType(type: string): boolean { return type === 'competition' || type === 'contest'; }
function buildSafeRgsuUrl(type: string, id: string): URL | null {
  if (!isValidType(type) || !isValidId(id)) return null;
  try {
    const url = new URL(`https://pk.rgsu.net/${type}/${id}`);
    if (url.hostname !== 'pk.rgsu.net') return null;
    return url;
  } catch {
    return null;
  }
}
// ──────────────────────────────────────────────────────────────────────────
type ParsedStudent = {
  id: string;
  uniqueCode: string;
  totalPoints: number;
  examPoints: number;
  subjects: number[];
  achievementPoints: number;
  hasOriginal: boolean;
  hasContract?: boolean;
  semesterPayment?: string;
  priority: number;
  mainHigherPriority: string;
  higherPassingPriority: string;
  preemptiveRight1: string;
  preemptiveRight2: string;
  idAtEquality: string;
  withoutExams: string;
  basisBVI: string;
  status: string;
};

type ParseResult = {
  students: ParsedStudent[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
};

const parseNum = (text: string): number => parseInt(text.trim(), 10) || 0;
const parseStr = (text: string): string => text.trim();

// Безопасное извлечение содержимого <td>...</td> через indexOf (защита от ReDoS)
function extractCells(trHtml: string): string[] {
  const cells: string[] = [];
  let i = 0;
  const len = trHtml.length;
  while (i < len) {
    const openMatch = trHtml.indexOf('<td', i);
    if (openMatch === -1) break;
    const closeAngle = trHtml.indexOf('>', openMatch);
    if (closeAngle === -1) break;
    const contentStart = closeAngle + 1;
    const closeTd = trHtml.indexOf('</td>', contentStart);
    if (closeTd === -1) break;
    const inner = trHtml.slice(contentStart, closeTd).replace(/<[^>]+>/g, '').trim();
    cells.push(inner);
    i = closeTd + 5;
  }
  return cells;
}

function parseCompetitionRow(cells: string[], index: number): ParsedStudent | null {
  try {
    if (cells.length < 18) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;
    return {
      id: `student-${index}`, uniqueCode,
      totalPoints: parseNum(cells[2]), examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: parseStr(cells[8]).toLowerCase() === 'да',
      priority: parseNum(cells[9]),
      mainHigherPriority: parseStr(cells[10]) || '-',
      higherPassingPriority: parseStr(cells[11]) || '-',
      preemptiveRight1: parseStr(cells[12]) || 'Нет',
      preemptiveRight2: parseStr(cells[13]) || 'Нет',
      idAtEquality: parseStr(cells[14]) || 'Нет',
      withoutExams: parseStr(cells[15]) || 'Нет',
      basisBVI: parseStr(cells[16]) || '-',
      status: parseStr(cells[17]) || '',
    };
  } catch { return null; }
}

function parseContestRow(cells: string[], index: number): ParsedStudent | null {
  try {
    if (cells.length < 17) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;
    return {
      id: `student-${index}`, uniqueCode,
      totalPoints: parseNum(cells[2]), examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: parseStr(cells[8]).toLowerCase() === 'да',
      semesterPayment: parseStr(cells[9]) || 'Нет',
      priority: parseNum(cells[10]),
      mainHigherPriority: '-', higherPassingPriority: '-',
      preemptiveRight1: parseStr(cells[11]) || 'Нет',
      preemptiveRight2: parseStr(cells[12]) || 'Нет',
      idAtEquality: parseStr(cells[13]) || 'Нет',
      withoutExams: parseStr(cells[14]) || 'Нет',
      basisBVI: parseStr(cells[15]) || '-',
      status: parseStr(cells[16]) || '',
    };
  } catch { return null; }
}

function parseEnrolledRow(cells: string[], index: number): ParsedStudent | null {
  try {
    const codeCell = cells.find((c) => {
      const str = parseStr(c);
      return (
        str.length >= 5 &&
        /\d/.test(str) &&
        !str.includes('госуслуг') &&
        !str.includes('код') &&
        !str.includes('№') &&
        !str.includes('Сумма') &&
        !str.includes('баллов')
      );
    });
    if (!codeCell) return null;
    const uniqueCode = parseStr(codeCell);

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2] || '0'),
      examPoints: parseNum(cells[3] || '0'),
      subjects: [0, 0, 0],
      achievementPoints: parseNum(cells[4] || '0'),
      hasOriginal: true,
      priority: 1,
      mainHigherPriority: '1',
      higherPassingPriority: '1',
      preemptiveRight1: 'Нет',
      preemptiveRight2: 'Нет',
      idAtEquality: 'Нет',
      withoutExams: cells[5] ? parseStr(cells[5]) : 'Нет',
      basisBVI: cells[5] ? parseStr(cells[5]) : '-',
      status: 'Зачислен',
    };
  } catch {
    return null;
  }
}

function parseRgsuHtml(html: string, type: string): ParseResult {
  const students: ParsedStudent[] = [];
  const warnings: string[] = [];
  let seats = 0;
  const seatCaptionNeedle = 'faculty-intro__card-caption';
  const seatTextNeedle = 'faculty-intro__card-text';
  let searchFrom = 0;
  while (true) {
    const capIdx = html.indexOf(seatCaptionNeedle, searchFrom);
    if (capIdx === -1) break;
    const capOpenEnd = html.indexOf('>', capIdx);
    if (capOpenEnd === -1) break;
    const before = html.slice(Math.max(0, capIdx - 10), capIdx);
    const tagNameMatch = before.match(/<([a-zA-Z][a-zA-Z0-9]*)\s*$/);
    const tagName = tagNameMatch ? tagNameMatch[1] : 'div';
    const tagEnd = html.indexOf(`</${tagName}>`, capOpenEnd);
    if (tagEnd === -1) break;
    const caption = html.slice(capOpenEnd + 1, tagEnd);
    if (/Количество мест|Места/i.test(caption) || /мест/i.test(caption)) {
      const textIdx = html.indexOf(seatTextNeedle, tagEnd);
      if (textIdx !== -1) {
        const textOpenEnd = html.indexOf('>', textIdx);
        if (textOpenEnd !== -1) {
          const textBefore = html.slice(Math.max(0, textIdx - 10), textIdx);
          const textTagMatch = textBefore.match(/<([a-zA-Z][a-zA-Z0-9]*)\s*$/);
          const textTagName = textTagMatch ? textTagMatch[1] : 'div';
          const textCloseIdx = html.indexOf(`</${textTagName}>`, textOpenEnd);
          if (textCloseIdx !== -1) {
            const digits = html.slice(textOpenEnd + 1, textCloseIdx).trim().match(/^\d+/);
            if (digits) seats = parseInt(digits[0], 10) || 0;
          }
        }
      }
      break;
    }
    searchFrom = tagEnd + 1;
  }

  const updIdx = html.indexOf('Сведения');
  let updatedAt: string | null = null;
  if (updIdx !== -1) {
    const updSlice = html.slice(updIdx, updIdx + 500);
    const m = updSlice.match(/Сведения\s+обновлены:\s*([^<]+)/i);
    if (m) updatedAt = m[1].trim();
  }

  const rowsWithCode: string[] = [];
  const rowsAny: string[] = [];
  let pos = 0;
  while (pos < html.length) {
    const trOpen = html.indexOf('<tr', pos);
    if (trOpen === -1) break;
    const trOpenEnd = html.indexOf('>', trOpen);
    if (trOpenEnd === -1) break;
    const openTag = html.slice(trOpen, trOpenEnd + 1);
    const trClose = html.indexOf('</tr>', trOpenEnd + 1);
    if (trClose === -1) break;
    const content = html.slice(trOpenEnd + 1, trClose);
    rowsAny.push(content);
    if (/data-unique-code\s*=\s*"/.test(openTag)) rowsWithCode.push(content);
    pos = trClose + 5;
  }

  const sourceRows = rowsWithCode.length > 0 ? rowsWithCode : rowsAny;
  let skipped = 0;
  sourceRows.forEach((trHtml, index) => {
    const cells = extractCells(trHtml);
    if (cells.length < 5) { skipped++; return; }
    let student: ParsedStudent | null = null;
    if (cells.length >= 15) {
      student = type === 'contest' ? parseContestRow(cells, index) : parseCompetitionRow(cells, index);
    } else {
      student = parseEnrolledRow(cells, index);
    }
    if (student) students.push(student);
    else skipped++;
  });

  if (students.length === 0 && sourceRows.length === 0) warnings.push('Таблица с данными не найдена на странице.');
  else if (skipped > 0 && students.length === 0) warnings.push('Не удалось распознать ни одной строки.');
  else if (skipped > 0) warnings.push(`Пропущено ${skipped} строк.`);
  if (students.length === 0 && seats === 0) warnings.push('Ни студенты, ни места не найдены.');
  return { students, updatedAt, seats, warnings };
}
// ──────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 50000;
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS) || 2;
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS) || 1000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 3 * 60 * 1000;
const MAX_RESPONSE_BYTES = Number(process.env.MAX_RESPONSE_BYTES) || 5 * 1024 * 1024; // 5 МБ
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 500;

interface CacheEntry { data: ParseResult; fetchedAt: number; }
const cache = new LRUCache<string, CacheEntry>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS,
  ttlAutopurge: true,
});

function getCached(key: string): ParseResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.data.students.length === 0) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

async function readBoundedHtml(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Response too large: ${contentLength} bytes`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
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
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

async function fetchHtml(url: string): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://pk.rgsu.net/',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`RGSU ${response.status} ${response.statusText}`);
      return await readBoundedHtml(response);
    } catch (error: any) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let type = '';
  let id = '';

  if (Array.isArray(req.query.path)) {
    type = req.query.path[0] || '';
    id = req.query.path.slice(1).join('/') || '';
  } else {
    type = typeof req.query.type === 'string' ? req.query.type : '';
    id = typeof req.query.id === 'string' ? req.query.id : '';
  }

  if (!type || !id) return res.status(400).json({ success: false, error: 'Invalid params' });

  // Защита от SSRF/path traversal: единая валидация
  if (!buildSafeRgsuUrl(type, id)) {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  const cacheKey = `${type}:${id}`;
  const competitionId = competitionIdFromPath(`https://pk.rgsu.net/${type}/${id}`);

  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Source', 'live');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({
      success: true,
      source: 'live',
      competitionId,
      data: cached.students,
      updatedAt: cached.updatedAt,
      seats: cached.seats,
      warnings: cached.warnings,
    });
  }

  try {
    const html = await fetchHtml(`https://pk.rgsu.net/${type}/${id}`);
    const result = parseRgsuHtml(html, type);
    cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Source', 'live');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({
      success: true,
      source: 'live',
      competitionId,
      data: result.students,
      updatedAt: result.updatedAt,
      seats: result.seats,
      warnings: result.warnings,
    });
  } catch (error: any) {
    // Не логируем полный error.message (может содержать URL c id)
    const kind = error.name === 'TimeoutError' ? 'TIMEOUT'
      : /too large|exceeded/i.test(error.message || '') ? 'TOO_LARGE'
      : 'FETCH_FAILED';
    console.error(`[API Error] key=${cacheKey} kind=${kind}`);

    // Fallback: пробуем отдать заархивированный приказ (если есть локальный архив
    // или публичный URL на свой же /orders/*.json для serverless)
    if (competitionId) {
      const archived =
        (await loadArchivedOrder(competitionId)) ??
        (await loadArchivedOrderViaFetch(competitionId));
      if (archived) {
        console.warn(`[API Fallback] serving archive for ${competitionId}`);
        res.setHeader('X-Source', 'archive');
        res.setHeader('X-Cache', 'BYPASS');
        res.setHeader('X-Archive-Date', archived.archivedAt);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.json({
          success: true,
          source: 'archive',
          competitionId,
          data: archived.data.students,
          updatedAt: archived.data.updatedAt,
          seats: archived.data.seats,
          warnings: [
            ...archived.data.warnings,
            'Данные из локального архива — сервер pk.rgsu.net временно недоступен',
          ],
          archivedAt: archived.archivedAt,
        });
      }
    }

    const isTimeout = kind === 'TIMEOUT';
    const status = isTimeout ? 504 : 502;
    const safeError = isTimeout
      ? 'Upstream timeout'
      : kind === 'TOO_LARGE'
        ? 'Upstream response too large'
        : 'Upstream fetch failed';
    return res.status(status).json({ success: false, error: safeError, isTimeout });
  }
}
