import { competitions } from '../src/competitions';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 50_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type ParseResult = {
  students: unknown[];
  updatedAt: string | null;
  seats: number;
  warnings: string[];
};

// Импортируем парсер динамически, чтобы скрипт работал через tsx
async function loadParser() {
  const mod = await import('../shared/parser');
  return mod;
}

function parsePath(url: string): { type: string; id: string } {
  const idx = url.indexOf('pk.rgsu.net/');
  const tail = idx >= 0 ? url.slice(idx + 'pk.rgsu.net/'.length) : url;
  const parts = tail.split('/').filter(Boolean);
  const type = parts[0] || 'contest';
  const id = parts.slice(1).join('/') || '';
  return { type, id };
}

async function readBounded(response: Response): Promise<string> {
  const cl = Number(response.headers.get('content-length') || 0);
  if (cl > MAX_BYTES) throw new Error(`Response too large: ${cl}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body');
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`Exceeded ${MAX_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

async function fetchOne(type: string, id: string) {
  const url = `https://pk.rgsu.net/${type}/${id}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: 'https://pk.rgsu.net/',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`RGSU ${response.status} ${response.statusText}`);
  }
  return readBounded(response);
}

async function main() {
  const outDir = path.resolve(process.cwd(), 'public/orders');
  await fs.mkdir(outDir, { recursive: true });

  const { parseRgsuHtml } = await loadParser();

  const summary: Array<{
    id: string;
    file: string;
    students: number;
    seats: number;
    updatedAt: string | null;
    ok: boolean;
    error?: string;
  }> = [];

  // Берём только бюджетные направления с /enrolled (приказы о зачислении)
  const targets = competitions.filter((c) => c.basis === 'Бюджет');

  for (const c of targets) {
    const { type, id } = parsePath(c.url);
    const filename = `${c.id}.json`;
    const filePath = path.join(outDir, filename);
    try {
      console.log(`[fetch] ${c.id} → ${type}/${id}`);
      const html = await fetchOne(type, id);
      const result: ParseResult = parseRgsuHtml(html, type);
      const payload = {
        source: 'pk.rgsu.net',
        competitionId: c.id,
        type,
        id,
        archivedAt: new Date().toISOString(),
        data: result,
      };
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
      summary.push({
        id: c.id,
        file: `public/orders/${filename}`,
        students: result.students.length,
        seats: result.seats,
        updatedAt: result.updatedAt,
        ok: true,
      });
      console.log(`  ✓ ${result.students.length} students, seats=${result.seats}, updatedAt=${result.updatedAt}`);
    } catch (e: any) {
      summary.push({
        id: c.id,
        file: `public/orders/${filename}`,
        students: 0,
        seats: 0,
        updatedAt: null,
        ok: false,
        error: e?.message || String(e),
      });
      console.error(`  ✗ ${e?.message || e}`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    description: 'Архив приказов о зачислении на бюджет (Бюджет / enrolled) с pk.rgsu.net',
    entries: summary,
  };
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n[done] manifest: public/orders/manifest.json`);
  const ok = summary.filter((s) => s.ok).length;
  const fail = summary.length - ok;
  console.log(`[summary] ok=${ok} failed=${fail} / total=${summary.length}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
