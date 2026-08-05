import type { CheerioAPI } from 'cheerio';

export type ParsedStudent = {
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

export type ParseResult = {
  students: ParsedStudent[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
};

const parseNum = (text: string): number => parseInt(text.trim(), 10) || 0;
const parseStr = (text: string): string => text.trim();

function parseContestRow($: CheerioAPI, cells: any, index: number): ParsedStudent | null {
  try {
    const uniqueCode = parseStr($(cells[1]).text());
    if (!uniqueCode || uniqueCode === '-') return null;

    return {
      id: `student-${index}`,
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
    };
  } catch {
    return null;
  }
}

function parseCompetitionRow($: CheerioAPI, cells: any, index: number): ParsedStudent | null {
  try {
    const uniqueCode = parseStr($(cells[1]).text());
    if (!uniqueCode || uniqueCode === '-') return null;

    return {
      id: `student-${index}`,
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
    };
  } catch {
    return null;
  }
}

export async function parseRgsuHtml(html: string, type: string): Promise<ParseResult> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const students: ParsedStudent[] = [];
  const warnings: string[] = [];

  let seats = 0;
  $('.faculty-intro__card').each((_, el) => {
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
    let skippedRows = 0;

    rows.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 10) {
        const parser = type === 'contest' ? parseContestRow : parseCompetitionRow;
        const student = parser($, cells, i);
        if (student) {
          students.push(student);
        } else {
          skippedRows++;
        }
      } else {
        skippedRows++;
      }
    });

    if (skippedRows > 0 && students.length === 0) {
      warnings.push(`Не удалось распознать ни одной строки. Возможно, изменилась структура HTML.`);
    } else if (skippedRows > 0) {
      warnings.push(`Пропущено ${skippedRows} строк из-за ошибок парсинга.`);
    }
  } else {
    warnings.push('Таблица с данными не найдена на странице.');
  }

  if (students.length === 0 && seats === 0) {
    warnings.push('Ни студенты, ни места не найдены. Проверьте URL или структуру страницы.');
  }

  return { students, updatedAt, seats, warnings };
}
