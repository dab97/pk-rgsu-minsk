export type ParsedStudent = {
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

export type ParseResult = {
  students: ParsedStudent[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
};

const parseNum = (text: string): number => parseInt(text.trim(), 10) || 0;
const parseStr = (text: string): string => text.trim();

// Валидация входных параметров API (защита от SSRF/path traversal)
export const VALID_ID_REGEX = /^[A-Za-z0-9_\-]{1,256}(\/enrolled)?$/;

export function isValidId(id: string): boolean {
  return VALID_ID_REGEX.test(id);
}

export function isValidType(type: string): boolean {
  return type === 'competition' || type === 'contest';
}

export function buildSafeRgsuUrl(type: string, id: string): URL | null {
  if (!isValidType(type) || !isValidId(id)) return null;
  try {
    const url = new URL(`https://pk.rgsu.net/${type}/${id}`);
    if (url.hostname !== 'pk.rgsu.net') return null;
    return url;
  } catch {
    return null;
  }
}

// Безопасное извлечение содержимого <td>...</td> через парсинг по символу '>'
// вместо regex с [\s\S]*? (предотвращает ReDoS)
function extractCells(trHtml: string): string[] {
  const cells: string[] = [];
  let i = 0;
  const len = trHtml.length;
  while (i < len) {
    const openMatch = trHtml.indexOf('<td', i);
    if (openMatch === -1) break;
    // пропускаем атрибуты до '>'
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

// Безопасное извлечение строк <tr ...>...</tr> через indexOf вместо [\s\S]*?
// (реализация встроена непосредственно в parseRgsuHtml)

function parseCompetitionRow(cells: string[], index: number): ParsedStudent | null {
  try {
    if (cells.length < 10) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2]),
      examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: cells[8] ? parseStr(cells[8]).toLowerCase() === 'да' : false,
      priority: cells[9] ? parseNum(cells[9]) : 1,
      mainHigherPriority: cells[10] ? parseStr(cells[10]) : '-',
      higherPassingPriority: cells[11] ? parseStr(cells[11]) : '1',
      preemptiveRight1: cells[12] ? parseStr(cells[12]) : 'Нет',
      preemptiveRight2: cells[13] ? parseStr(cells[13]) : 'Нет',
      idAtEquality: cells[14] ? parseStr(cells[14]) : 'Нет',
      withoutExams: cells[15] ? parseStr(cells[15]) : 'Нет',
      basisBVI: cells[16] ? parseStr(cells[16]) : '-',
      status: cells[17] ? parseStr(cells[17]) : 'Зачислен',
    };
  } catch {
    return null;
  }
}

function parseContestRow(cells: string[], index: number): ParsedStudent | null {
  try {
    if (cells.length < 10) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;

    // Реальные заголовки колонок для contest-страниц:
    // cells[8] = «Наличие заключённого договора» (Да/Нет)
    // cells[9] = «Оплата по договору» (Да/Нет)
    // cells[10] = «Приоритет»
    const hasContract = cells[8] ? parseStr(cells[8]).toLowerCase() === 'да' : false;
    const semesterPayment = cells[9] ? parseStr(cells[9]) : 'Нет';

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2]),
      examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: false,
      hasContract,
      semesterPayment,
      priority: cells[10] ? parseNum(cells[10]) : 1,
      mainHigherPriority: '-',
      higherPassingPriority: '-',
      preemptiveRight1: cells[11] ? parseStr(cells[11]) : 'Нет',
      preemptiveRight2: cells[12] ? parseStr(cells[12]) : 'Нет',
      idAtEquality: cells[13] ? parseStr(cells[13]) : 'Нет',
      withoutExams: cells[14] ? parseStr(cells[14]) : 'Нет',
      basisBVI: cells[15] ? parseStr(cells[15]) : '-',
      status: cells[16] ? parseStr(cells[16]) : 'Зачислен',
    };
  } catch {
    return null;
  }
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

export function parseRgsuHtml(html: string, type: string): ParseResult {
  const students: ParsedStudent[] = [];
  const warnings: string[] = [];

  let seats = 0;
  // seats: ищем faculty-intro__card-caption с "Количество мест"/"Места",
  // затем ближайший card-text с числом. Линейный indexOf — без backtracking.
  const seatCaptionNeedle = 'faculty-intro__card-caption';
  const seatTextNeedle = 'faculty-intro__card-text';
  let searchFrom = 0;
  while (true) {
    const capIdx = html.indexOf(seatCaptionNeedle, searchFrom);
    if (capIdx === -1) break;
    const capOpenEnd = html.indexOf('>', capIdx);
    if (capOpenEnd === -1) break;
    // определяем тип тега, чтобы корректно найти его закрытие
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

  // Извлекаем строки tr: сначала те, что содержат data-unique-code
  const rowsWithCode: string[] = [];
  const rowsAny: string[] = [];
  {
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
  }

  const sourceRows = rowsWithCode.length > 0 ? rowsWithCode : rowsAny;
  let skipped = 0;

  sourceRows.forEach((trHtml, index) => {
    const cells = extractCells(trHtml);
    if (cells.length < 5) {
      skipped++;
      return;
    }
    let student: ParsedStudent | null = null;
    if (cells.length >= 15) {
      student = type === 'contest' ? parseContestRow(cells, index) : parseCompetitionRow(cells, index);
    } else {
      student = parseEnrolledRow(cells, index);
    }
    if (student) students.push(student);
    else skipped++;
  });

  if (students.length === 0 && sourceRows.length === 0) {
    warnings.push('Таблица с данными не найдена на странице.');
  } else if (skipped > 0 && students.length === 0) {
    warnings.push('Не удалось распознать ни одной строки. Возможно, изменилась структура HTML.');
  } else if (skipped > 0) {
    warnings.push(`Пропущено ${skipped} строк из-за ошибок парсинга.`);
  }

  if (students.length === 0 && seats === 0) {
    warnings.push('Ни студенты, ни места не найдены. Проверьте URL или структуру страницы.');
  }

  return { students, updatedAt, seats, warnings };
}
