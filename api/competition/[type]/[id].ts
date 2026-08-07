import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Inlined parser (shared/parser.ts) ──────────────────────────────────────
type ParsedStudent = {
  id: string;
  uniqueCode: string;
  totalPoints: number;
  examPoints: number;
  subjects: number[];
  achievementPoints: number;
  hasOriginal: boolean;
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

function extractCells(trHtml: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = cellRegex.exec(trHtml)) !== null) {
    const inner = match[1].replace(/<[^>]+>/g, '').trim();
    cells.push(inner);
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
  const seatCardMatch = html.match(/<span class="faculty-intro__card-caption">[^<]*(?:Количество мест|Места)[^<]*<\/span>\s*<p class="faculty-intro__card-text">\s*(\d+)/i);
  if (seatCardMatch) {
    seats = parseInt(seatCardMatch[1], 10) || 0;
  } else {
    const seatMatch = html.match(/faculty-intro__card-caption[^>]*>[^<]*мест/i);
    if (seatMatch && seatMatch.index !== undefined) {
      const cardBlock = html.slice(seatMatch.index, seatMatch.index + 500);
      const valMatch = cardBlock.match(/faculty-intro__card-text[^>]*>\s*(\d+)/i);
      if (valMatch) seats = parseInt(valMatch[1], 10) || 0;
    }
  }
  const updMatch = html.match(/Сведения\s+обновлены:\s*([^<]+)/i);
  const updatedAt = updMatch ? updMatch[1].trim() : null;

  const parseRowsFromRegex = (regex: RegExp) => {
    let match;
    let index = 0;
    let skipped = 0;
    while ((match = regex.exec(html)) !== null) {
      const trHtml = match[1];
      const cells = extractCells(trHtml);
      if (cells.length >= 5) {
        let student: ParsedStudent | null = null;
        if (cells.length >= 15) {
          student = type === 'contest' ? parseContestRow(cells, index) : parseCompetitionRow(cells, index);
        } else {
          student = parseEnrolledRow(cells, index);
        }
        if (student) {
          students.push(student);
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
      index++;
    }
    return { count: index, skipped };
  };

  let rowRegex = /<tr\s+data-unique-code="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let { count: rowCount, skipped: skippedRows } = parseRowsFromRegex(rowRegex);

  if (students.length === 0) {
    rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const res = parseRowsFromRegex(rowRegex);
    rowCount = res.count;
    skippedRows = res.skipped;
  }

  if (students.length === 0 && rowCount === 0) warnings.push('Таблица с данными не найдена на странице.');
  else if (skippedRows > 0 && students.length === 0) warnings.push('Не удалось распознать ни одной строки.');
  else if (skippedRows > 0) warnings.push(`Пропущено ${skippedRows} строк.`);
  if (students.length === 0 && seats === 0) warnings.push('Ни студенты, ни места не найдены.');
  return { students, updatedAt, seats, warnings };
}
// ──────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 50000;
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS) || 2;
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS) || 1000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 3 * 60 * 1000;

interface CacheEntry { data: ParseResult; fetchedAt: number; }
const cache = new Map<string, CacheEntry>();

function getCached(key: string): ParseResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
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
      });
      if (!response.ok) throw new Error(`RGSU ${response.status} ${response.statusText}`);
      return await response.text();
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
  if (type !== 'competition' && type !== 'contest') return res.status(400).json({ success: false, error: 'Invalid type' });

  const cacheKey = `${type}:${id}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: cached.students, updatedAt: cached.updatedAt, seats: cached.seats, warnings: cached.warnings });
  }

  try {
    const html = await fetchHtml(`https://pk.rgsu.net/${type}/${id}`);
    const result = parseRgsuHtml(html, type);
    cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: result.students, updatedAt: result.updatedAt, seats: result.seats, warnings: result.warnings });
  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message, isTimeout: error.name === 'TimeoutError' });
  }
}
