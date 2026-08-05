import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 50000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, id } = req.query;

  if (typeof type !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid params' });
  }

  if (type !== 'competition' && type !== 'contest') {
    return res.status(400).json({ success: false, error: 'Invalid competition type' });
  }

  const url = `https://pk.rgsu.net/${type}/${id}`;

  try {
    const html = await fetchHtml(url);
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
                subjects: [
                  parseNum($(cells[4]).text()),
                  parseNum($(cells[5]).text()),
                  parseNum($(cells[6]).text()),
                ],
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
                subjects: [
                  parseNum($(cells[4]).text()),
                  parseNum($(cells[5]).text()),
                  parseNum($(cells[6]).text()),
                ],
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

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');
    return res.json({ success: true, data: students, updatedAt, seats });
  } catch (error: any) {
    console.error('Error fetching competition data:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      isTimeout: error.name === 'TimeoutError',
    });
  }
}
