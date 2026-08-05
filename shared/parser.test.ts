import { describe, it, expect } from 'vitest';
import { parseRgsuHtml } from './parser';

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
        <td><div class="table__text"> Да </div></td>
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
      expect(result.students[0].semesterPayment).toBe('Да');
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
});
