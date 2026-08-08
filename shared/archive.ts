import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ArchivedOrder = {
  source: string;
  competitionId: string;
  type: string;
  id: string;
  archivedAt: string;
  data: {
    students: unknown[];
    updatedAt: string | null;
    seats: number;
    warnings: string[];
  };
};

const ARCHIVE_DIR = path.resolve(process.cwd(), 'public/orders');

export function getArchivePath(competitionId: string): string {
  return path.join(ARCHIVE_DIR, `${competitionId}.json`);
}

export async function loadArchivedOrder(competitionId: string): Promise<ArchivedOrder | null> {
  try {
    const raw = await fs.readFile(getArchivePath(competitionId), 'utf8');
    return JSON.parse(raw) as ArchivedOrder;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return null;
    return null;
  }
}

export async function listArchivedOrders(): Promise<string[]> {
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    return files.filter((f) => f.endsWith('.json') && f !== 'manifest.json').map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

// Fallback через fetch (для serverless окружений вроде Vercel, где FS read не всегда доступен
// или работает только во время сборки). Использует публичный URL самого приложения.
export async function loadArchivedOrderViaFetch(
  competitionId: string,
  baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
): Promise<ArchivedOrder | null> {
  if (!baseUrl) return null;
  try {
    const url = `${baseUrl}/orders/${competitionId}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    return (await res.json()) as ArchivedOrder;
  } catch {
    return null;
  }
}
