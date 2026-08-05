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
      <tr>
        <td>1</td><td>ABC123</td><td>285</td><td>100</td><td>95</td><td>90</td><td>100</td><td>0</td><td>да</td><td>1</td><td>-</td><td>-</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Нет</td><td>-</td><td>в конкурсе</td>
      </tr>
      <tr>
        <td>2</td><td>DEF456</td><td>270</td><td>90</td><td>90</td><td>90</td><td>100</td><td>0</td><td>нет</td><td>2</td><td>-</td><td>-</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Нет</td><td>-</td><td>в конкурсе</td>
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
      <tr>
        <td>1</td><td>XYZ789</td><td>250</td><td>80</td><td>85</td><td>85</td><td>100</td><td>0</td><td>да</td><td>Да</td><td>1</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Нет</td><td>-</td><td>в конкурсе</td>
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
    it('parses students correctly', async () => {
      const result = await parseRgsuHtml(competitionHtml, 'competition');

      expect(result.students).toHaveLength(2);
      expect(result.students[0].uniqueCode).toBe('ABC123');
      expect(result.students[0].totalPoints).toBe(285);
      expect(result.students[0].examPoints).toBe(100);
      expect(result.students[0].subjects).toEqual([95, 90, 100]);
      expect(result.students[0].hasOriginal).toBe(true);
      expect(result.students[0].priority).toBe(1);
    });

    it('parses seats correctly', async () => {
      const result = await parseRgsuHtml(competitionHtml, 'competition');
      expect(result.seats).toBe(16);
    });

    it('parses updatedAt correctly', async () => {
      const result = await parseRgsuHtml(competitionHtml, 'competition');
      expect(result.updatedAt).toBe('01.08.2026 12:00');
    });

    it('parses higherPassingPriority for competition type', async () => {
      const result = await parseRgsuHtml(competitionHtml, 'competition');
      expect(result.students[0].mainHigherPriority).toBeDefined();
      expect(result.students[0].higherPassingPriority).toBeDefined();
    });
  });

  describe('contest type', () => {
    it('parses students correctly', async () => {
      const result = await parseRgsuHtml(contestHtml, 'contest');

      expect(result.students).toHaveLength(1);
      expect(result.students[0].uniqueCode).toBe('XYZ789');
      expect(result.students[0].totalPoints).toBe(250);
      expect(result.students[0].semesterPayment).toBe('Да');
    });

    it('parses seats correctly', async () => {
      const result = await parseRgsuHtml(contestHtml, 'contest');
      expect(result.seats).toBe(45);
    });

    it('sets mainHigherPriority and higherPassingPriority to - for contest', async () => {
      const result = await parseRgsuHtml(contestHtml, 'contest');
      expect(result.students[0].mainHigherPriority).toBe('-');
      expect(result.students[0].higherPassingPriority).toBe('-');
    });
  });

  describe('edge cases', () => {
    it('returns empty students for HTML without table', async () => {
      const result = await parseRgsuHtml(emptyHtml, 'competition');
      expect(result.students).toHaveLength(0);
      expect(result.seats).toBe(8);
      expect(result.warnings).toContain('Таблица с данными не найдена на странице.');
    });

    it('returns warnings for completely broken HTML', async () => {
      const result = await parseRgsuHtml(brokenHtml, 'competition');
      expect(result.students).toHaveLength(0);
      expect(result.seats).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('skips rows with insufficient cells', async () => {
      const html = `
        <html><body>
          <table><tbody>
            <tr><td>1</td><td>ABC</td></tr>
            <tr>
              <td>1</td><td>XYZ123</td><td>200</td><td>70</td><td>70</td><td>60</td><td>70</td><td>0</td><td>нет</td><td>1</td><td>-</td><td>-</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Нет</td><td>-</td><td>в конкурсе</td>
            </tr>
          </tbody></table>
        </body></html>
      `;
      const result = await parseRgsuHtml(html, 'competition');
      expect(result.students).toHaveLength(1);
      expect(result.students[0].uniqueCode).toBe('XYZ123');
    });

    it('skips rows with dash as uniqueCode', async () => {
      const html = `
        <html><body>
          <table><tbody>
            <tr>
              <td>1</td><td>-</td><td>200</td><td>70</td><td>70</td><td>60</td><td>70</td><td>0</td><td>нет</td><td>1</td><td>-</td><td>-</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Нет</td><td>-</td><td>в конкурсе</td>
            </tr>
          </tbody></table>
        </body></html>
      `;
      const result = await parseRgsuHtml(html, 'competition');
      expect(result.students).toHaveLength(0);
    });

    it('parses updatedAt with different formats', async () => {
      const html = `
        <html><body>
          <div class="main-screen__text">Сведения обновлены: 15.07.2026</div>
        </body></html>
      `;
      const result = await parseRgsuHtml(html, 'competition');
      expect(result.updatedAt).toBe('15.07.2026');
    });

    it('returns null updatedAt when not found', async () => {
      const html = `<html><body><div class="main-screen__text">Нет данных</div></body></html>`;
      const result = await parseRgsuHtml(html, 'competition');
      expect(result.updatedAt).toBeNull();
    });
  });
});
