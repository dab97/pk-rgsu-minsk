import { describe, it, expect } from 'vitest';
import { parseRgsuHtml, isValidId, isValidType, buildSafeRgsuUrl } from './parser';

const competitionHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="main-screen__text">Сведения обновлены: 01.08.2026 12:00</div>
  <div class="faculty-intro__card">
    <div class="faculty-intro__card-caption">Мест (бюджет)</div>
    <div class="faculty-intro__card-text">16</div>
  </div>
  <table>
    <tbody>
      <tr data-unique-code="ABC123" data-number="1">
        <td class="text-center"><div class="table__text">1</div></td>
        <td><div class="table__text"> ABC123 </div></td>
        <td class="color-blue"><div class="table__text"> 285 </div></td>
        <td><div class="table__text"> 100 </div></td>
        <td><div class="table__text"> 95 </div></td>
        <td><div class="table__text"> 90 </div></td>
        <td><div class="table__text"> 100 </div></td>
        <td><div class="table__text"> 0 </div></td>
        <td><div class="table__text"> да </div></td>
        <td class="color-blue"><div class="table__text"> 1 </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> в конкурсе </div></td>
      </tr>
      <tr data-unique-code="DEF456" data-number="2">
        <td class="text-center"><div class="table__text">2</div></td>
        <td><div class="table__text"> DEF456 </div></td>
        <td class="color-blue"><div class="table__text"> 270 </div></td>
        <td><div class="table__text"> 90 </div></td>
        <td><div class="table__text"> 90 </div></td>
        <td><div class="table__text"> 90 </div></td>
        <td><div class="table__text"> 100 </div></td>
        <td><div class="table__text"> 0 </div></td>
        <td><div class="table__text"> нет </div></td>
        <td class="color-blue"><div class="table__text"> 2 </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> в конкурсе </div></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

const contestHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="main-screen__text">Сведения обновлены: 01.08.2026 12:00</div>
  <div class="faculty-intro__card">
    <div class="faculty-intro__card-caption">Мест (платное)</div>
    <div class="faculty-intro__card-text">45</div>
  </div>
  <table>
    <tbody>
      <tr data-unique-code="XYZ789" data-number="1">
        <td class="text-center"><div class="table__text">1</div></td>
        <td><div class="table__text"> XYZ789 </div></td>
        <td class="color-blue"><div class="table__text"> 250 </div></td>
        <td><div class="table__text"> 80 </div></td>
        <td><div class="table__text"> 85 </div></td>
        <td><div class="table__text"> 85 </div></td>
        <td><div class="table__text"> 100 </div></td>
        <td><div class="table__text"> 0 </div></td>
        <td><div class="table__text"> да </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td class="color-blue"><div class="table__text"> 1 </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> Нет </div></td>
        <td><div class="table__text"> - </div></td>
        <td><div class="table__text"> в конкурсе </div></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

const emptyHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="main-screen__text">Сведения обновлены: 01.08.2026 12:00</div>
  <div class="faculty-intro__card">
    <div class="faculty-intro__card-caption">Мест</div>
    <div class="faculty-intro__card-text">8</div>
  </div>
</body>
</html>
`;

const brokenHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="some-other-content">Нет данных</div>
</body>
</html>
`;

describe('parseRgsuHtml', () => {
  describe('competition type', () => {
    it('parses students correctly', () => {
      const result = parseRgsuHtml(competitionHtml, 'competition');

      expect(result.students).toHaveLength(2);
      expect(result.students[0].uniqueCode).toBe('ABC123');
      expect(result.students[0].totalPoints).toBe(285);
      expect(result.students[0].examPoints).toBe(100);
      expect(result.students[0].subjects).toEqual([95, 90, 100]);
      expect(result.students[0].hasOriginal).toBe(true);
      expect(result.students[0].priority).toBe(1);
    });

    it('parses seats correctly', () => {
      const result = parseRgsuHtml(competitionHtml, 'competition');
      expect(result.seats).toBe(16);
    });

    it('parses updatedAt correctly', () => {
      const result = parseRgsuHtml(competitionHtml, 'competition');
      expect(result.updatedAt).toBe('01.08.2026 12:00');
    });

    it('parses higherPassingPriority for competition type', () => {
      const result = parseRgsuHtml(competitionHtml, 'competition');
      expect(result.students[0].mainHigherPriority).toBeDefined();
      expect(result.students[0].higherPassingPriority).toBeDefined();
    });
  });

  describe('contest type', () => {
    it('parses students correctly', () => {
      const result = parseRgsuHtml(contestHtml, 'contest');

      expect(result.students).toHaveLength(1);
      expect(result.students[0].uniqueCode).toBe('XYZ789');
      expect(result.students[0].totalPoints).toBe(250);
      expect(result.students[0].hasContract).toBe(true);
      expect(result.students[0].semesterPayment).toBe('Нет');
    });

    it('parses seats correctly', () => {
      const result = parseRgsuHtml(contestHtml, 'contest');
      expect(result.seats).toBe(45);
    });

    it('sets mainHigherPriority and higherPassingPriority to - for contest', () => {
      const result = parseRgsuHtml(contestHtml, 'contest');
      expect(result.students[0].mainHigherPriority).toBe('-');
      expect(result.students[0].higherPassingPriority).toBe('-');
    });

    it('parses contract (cells[8]) and payment (cells[9]) independently', () => {
      // Реальный кейс: договор заключён, но оплаты нет (как у 1854067)
      const html = `
        <html><body>
          <table><tbody>
            <tr data-unique-code="1854067" data-number="14">
              <td><div class="table__text">14</div></td>
              <td><div class="table__text"> 1854067 </div></td>
              <td><div class="table__text"> 250 </div></td>
              <td><div class="table__text"> 250 </div></td>
              <td><div class="table__text"> 64 </div></td>
              <td><div class="table__text"> 88 </div></td>
              <td><div class="table__text"> 98 </div></td>
              <td><div class="table__text"> 0 </div></td>
              <td><div class="table__text"> Да </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> 1 </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> Участвует в конкурсе </div></td>
            </tr>
          </tbody></table>
        </body></html>
      `;
      const result = parseRgsuHtml(html, 'contest');
      expect(result.students).toHaveLength(1);
      expect(result.students[0].uniqueCode).toBe('1854067');
      expect(result.students[0].hasContract).toBe(true);   // cells[8] === 'Да'
      expect(result.students[0].semesterPayment).toBe('Нет'); // cells[9] === 'Нет'
    });
  });

  describe('edge cases', () => {
    it('returns empty students for HTML without table', () => {
      const result = parseRgsuHtml(emptyHtml, 'competition');
      expect(result.students).toHaveLength(0);
      expect(result.seats).toBe(8);
      expect(result.warnings).toContain('Таблица с данными не найдена на странице.');
    });

    it('returns warnings for completely broken HTML', () => {
      const result = parseRgsuHtml(brokenHtml, 'competition');
      expect(result.students).toHaveLength(0);
      expect(result.seats).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('skips rows with insufficient cells', () => {
      const html = `
        <html><body>
          <table><tbody>
            <tr data-unique-code="ABC" data-number="1"><td>1</td><td>ABC</td></tr>
            <tr data-unique-code="XYZ123" data-number="2">
              <td class="text-center"><div class="table__text">2</div></td>
              <td><div class="table__text"> XYZ123 </div></td>
              <td class="color-blue"><div class="table__text"> 200 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 60 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 0 </div></td>
              <td><div class="table__text"> нет </div></td>
              <td class="color-blue"><div class="table__text"> 1 </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> в конкурсе </div></td>
            </tr>
          </tbody></table>
        </body></html>
      `;
      const result = parseRgsuHtml(html, 'competition');
      expect(result.students).toHaveLength(1);
      expect(result.students[0].uniqueCode).toBe('XYZ123');
    });

    it('skips rows with dash as uniqueCode', () => {
      const html = `
        <html><body>
          <table><tbody>
            <tr data-unique-code="-" data-number="1">
              <td class="text-center"><div class="table__text">1</div></td>
              <td><div class="table__text"> - </div></td>
              <td class="color-blue"><div class="table__text"> 200 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 60 </div></td>
              <td><div class="table__text"> 70 </div></td>
              <td><div class="table__text"> 0 </div></td>
              <td><div class="table__text"> нет </div></td>
              <td class="color-blue"><div class="table__text"> 1 </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> Нет </div></td>
              <td><div class="table__text"> - </div></td>
              <td><div class="table__text"> в конкурсе </div></td>
            </tr>
          </tbody></table>
        </body></html>
      `;
      const result = parseRgsuHtml(html, 'competition');
      expect(result.students).toHaveLength(0);
    });

    it('parses updatedAt with different formats', () => {
      const html = `
        <html><body>
          <div class="main-screen__text">Сведения обновлены: 15.07.2026</div>
        </body></html>
      `;
      const result = parseRgsuHtml(html, 'competition');
      expect(result.updatedAt).toBe('15.07.2026');
    });

    it('returns null updatedAt when not found', () => {
      const html = `<html><body><div class="main-screen__text">Нет данных</div></body></html>`;
      const result = parseRgsuHtml(html, 'competition');
      expect(result.updatedAt).toBeNull();
    });
  });

  describe('input validation', () => {
    it('isValidId accepts safe ids', () => {
      expect(isValidId('abc123')).toBe(true);
      expect(isValidId('abc-123_xyz')).toBe(true);
      expect(isValidId('a')).toBe(true);
      expect(isValidId('A'.repeat(256))).toBe(true);
    });

    it('isValidId rejects dangerous inputs', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('../admin')).toBe(false);
      expect(isValidId('a/b')).toBe(false);
      expect(isValidId('a%2Fb')).toBe(false);
      expect(isValidId('a b')).toBe(false);
      expect(isValidId('a@b')).toBe(false);
      expect(isValidId('a?b=1')).toBe(false);
      expect(isValidId('a#x')).toBe(false);
      expect(isValidId('A'.repeat(257))).toBe(false);
      expect(isValidId('..')).toBe(false);
      expect(isValidId('foo.json')).toBe(false);
    });

    it('isValidId allows /enrolled suffix (budget enrolled pages)', () => {
      expect(isValidId('3ebfdc93-f07b-11f0-b35d-f4034344acdb/enrolled')).toBe(true);
      expect(isValidId('abc/enrolled')).toBe(true);
      // Но не другой путь
      expect(isValidId('abc/foo')).toBe(false);
      expect(isValidId('abc/../admin')).toBe(false);
      expect(isValidId('abc/enrolled/foo')).toBe(false);
    });

    it('isValidType accepts only competition or contest', () => {
      expect(isValidType('competition')).toBe(true);
      expect(isValidType('contest')).toBe(true);
      expect(isValidType('admin')).toBe(false);
      expect(isValidType('')).toBe(false);
      expect(isValidType('COMPETITION')).toBe(false);
    });

    it('buildSafeRgsuUrl returns URL for valid input', () => {
      const url = buildSafeRgsuUrl('competition', 'abc-123');
      expect(url).not.toBeNull();
      expect(url!.hostname).toBe('pk.rgsu.net');
      expect(url!.pathname).toBe('/competition/abc-123');
    });

    it('buildSafeRgsuUrl rejects invalid input', () => {
      expect(buildSafeRgsuUrl('competition', '../etc/passwd')).toBeNull();
      expect(buildSafeRgsuUrl('admin', 'abc')).toBeNull();
      expect(buildSafeRgsuUrl('competition', '')).toBeNull();
    });
  });
});

