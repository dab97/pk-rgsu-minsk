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

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2]),
      examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: cells[8] ? parseStr(cells[8]).toLowerCase() === 'да' : false,
      semesterPayment: cells[9] ? parseStr(cells[9]) : 'Нет',
      priority: cells[10] ? parseNum(cells[10]) : 1,
      mainHigherPriority: '-',
      higherPassingPriority: '1',
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
  // Primary: find card whose caption contains "Количество мест" or starts with "Места"
  const seatCardMatch = html.match(/<span class="faculty-intro__card-caption">[^<]*(?:Количество мест|Места)[^<]*<\/span>\s*<p class="faculty-intro__card-text">\s*(\d+)/i);
  if (seatCardMatch) {
    seats = parseInt(seatCardMatch[1], 10) || 0;
  } else {
    // Fallback: any caption containing "мест"
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

  // Try matching data-unique-code rows first
  let rowRegex = /<tr\s+data-unique-code="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let { count: rowCount, skipped: skippedRows } = parseRowsFromRegex(rowRegex);

  // If no students found with data-unique-code, fallback to any tr tags
  if (students.length === 0) {
    rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const res = parseRowsFromRegex(rowRegex);
    rowCount = res.count;
    skippedRows = res.skipped;
  }

  if (students.length === 0 && rowCount === 0) {
    warnings.push('Таблица с данными не найдена на странице.');
  } else if (skippedRows > 0 && students.length === 0) {
    warnings.push('Не удалось распознать ни одной строки. Возможно, изменилась структура HTML.');
  } else if (skippedRows > 0) {
    warnings.push(`Пропущено ${skippedRows} строк из-за ошибок парсинга.`);
  }

  if (students.length === 0 && seats === 0) {
    warnings.push('Ни студенты, ни места не найдены. Проверьте URL или структуру страницы.');
  }

  return { students, updatedAt, seats, warnings };
}
