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
    if (cells.length < 18) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2]),
      examPoints: parseNum(cells[3]),
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
  } catch {
    return null;
  }
}

function parseContestRow(cells: string[], index: number): ParsedStudent | null {
  try {
    if (cells.length < 17) return null;
    const uniqueCode = parseStr(cells[1]);
    if (!uniqueCode || uniqueCode === '-') return null;

    return {
      id: `student-${index}`,
      uniqueCode,
      totalPoints: parseNum(cells[2]),
      examPoints: parseNum(cells[3]),
      subjects: [parseNum(cells[4]), parseNum(cells[5]), parseNum(cells[6])],
      achievementPoints: parseNum(cells[7]),
      hasOriginal: parseStr(cells[8]).toLowerCase() === 'да',
      semesterPayment: parseStr(cells[9]) || 'Нет',
      priority: parseNum(cells[10]),
      mainHigherPriority: '-',
      higherPassingPriority: '-',
      preemptiveRight1: parseStr(cells[11]) || 'Нет',
      preemptiveRight2: parseStr(cells[12]) || 'Нет',
      idAtEquality: parseStr(cells[13]) || 'Нет',
      withoutExams: parseStr(cells[14]) || 'Нет',
      basisBVI: parseStr(cells[15]) || '-',
      status: parseStr(cells[16]) || '',
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

  const rowRegex = /<tr\s+data-unique-code="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let rowIndex = 0;
  let skippedRows = 0;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const trHtml = rowMatch[1];
    const cells = extractCells(trHtml);
    if (cells.length >= 10) {
      const parser = type === 'contest' ? parseContestRow : parseCompetitionRow;
      const student = parser(cells, rowIndex);
      if (student) {
        students.push(student);
      } else {
        skippedRows++;
      }
    } else {
      skippedRows++;
    }
    rowIndex++;
  }

  if (students.length === 0 && rowIndex === 0) {
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
