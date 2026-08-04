import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route for fetching competition data
  app.get("/api/competition/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      if (type !== 'competition' && type !== 'contest') {
        res.status(400).json({ success: false, error: 'Invalid competition type' });
        return;
      }
      const url = `https://pk.rgsu.net/${type}/${id}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        // We set a reasonable timeout to fail fast if blocked
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from RGSU: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const students: any[] = [];
      
      // Extract "Сведения обновлены: <date>" from the page header
      const updMatch = $('.main-screen__text').text().trim().match(/Сведения\s+обновлены:\s*(.+)/i);
      const updatedAt = updMatch ? updMatch[1].trim() : null;
      
      // Finding the main table in the page
      // Assuming it's the largest table or the one with specific headers
      const table = $('table').first();
      
      if (table.length) {
        const rows = table.find('tbody tr');
        rows.each((i, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 10) {
            // Mapping cells based on standard column layout in the screenshot
            // (Note: This is a best-effort mapping based on typical RGSU table structures)
            
            const parseNum = (text: string) => parseInt(text.trim(), 10) || 0;
            const parseStr = (text: string) => text.trim();
            
            const uniqueCode = parseStr($(cells[1]).text());
            
            if (uniqueCode && uniqueCode !== '-') {
              if (type === 'contest') {
                // Contest (paid/contract) tables have two extra columns:
                // "Наличие заключенного договора" and "Оплата по договору" instead of "Согласие".
                students.push({
                  id: `student-${i}`,
                  uniqueCode,
                  totalPoints: parseNum($(cells[2]).text()),
                  examPoints: parseNum($(cells[3]).text()),
                  subjects: [
                    parseNum($(cells[4]).text()),
                    parseNum($(cells[5]).text()),
                    parseNum($(cells[6]).text())
                  ],
                  achievementPoints: parseNum($(cells[7]).text()),
                  hasOriginal: parseStr($(cells[8]).text()).toLowerCase() === 'да',
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
                    parseNum($(cells[6]).text())
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

      res.json({ success: true, data: students, updatedAt });
    } catch (error: any) {
      console.error('Error fetching competition data:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        isTimeout: error.name === 'TimeoutError'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
