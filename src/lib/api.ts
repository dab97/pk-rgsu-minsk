import { Student, Competition } from '../data';

export type CompetitionFetchResult = {
  students: Student[];
  updatedAt: string | null;
  seats: number;
};

export type CompetitionDataMap = Record<string, CompetitionFetchResult>;

export function getCompetitionPath(url: string) {
  const [, path] = url.split('pk.rgsu.net/');
  const [type, id] = (path || 'competition/').split('/');
  return { type: type || 'competition', id: id || '' };
}

async function fetchCompetitionData(type: string, id: string): Promise<CompetitionFetchResult> {
  const res = await fetch(`/api/competition/${type}/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(result.error || 'Bad data');
  }
  return {
    students: result.data as Student[],
    updatedAt: result.updatedAt ?? null,
    seats: typeof result.seats === 'number' ? result.seats : 0,
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const FETCH_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 800;
const RETRY_ATTEMPTS = 2;

async function fetchWithTimeout(type: string, id: string): Promise<CompetitionFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchCompetitionData(type, id);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCompetitionDataWithRetry(type: string, id: string): Promise<CompetitionFetchResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchWithTimeout(type, id);
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

export async function fetchAllCompetitions(
  comps: Competition[],
  opts: { concurrency?: number; delayMs?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<CompetitionDataMap> {
  const { concurrency = 2, delayMs = 350, onProgress } = opts;
  const results: CompetitionDataMap = {};

  const queue = [...comps];
  let running = 0;
  let done = 0;

  return new Promise<CompetitionDataMap>((resolve) => {
    async function worker() {
      while (queue.length > 0) {
        const comp = queue.shift()!;
        const { type, id } = getCompetitionPath(comp.url);
        try {
          const data = await fetchCompetitionDataWithRetry(type, id);
          results[comp.id] = data;
        } catch (err) {
          console.warn(`[fetchAll] ${comp.id} failed:`, (err as Error).message);
        }
        done += 1;
        onProgress?.(done, comps.length);
        if (delayMs > 0) await sleep(delayMs);
      }
      running -= 1;
      if (running === 0) resolve(results);
    }

    const start = Math.min(concurrency, comps.length || 1);
    for (let i = 0; i < start; i++) {
      running += 1;
      worker();
    }
  });
}
