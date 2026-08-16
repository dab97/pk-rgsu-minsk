import { Student, Competition } from '../data';

export type DataSource = 'live' | 'archive';

export type CompetitionFetchResult = {
  students: Student[];
  updatedAt: string | null;
  seats: number;
  source: DataSource;
  archivedAt?: string;
};

export type CompetitionDataMap = Record<string, CompetitionFetchResult>;

export type FetchAllCompetitionsResult = {
  map: CompetitionDataMap;
  /** id направлений, загрузка которых не удалась */
  failed: string[];
};

export function getCompetitionPath(url: string) {
  const marker = 'pk.rgsu.net/';
  const idx = url.indexOf(marker);
  if (idx === -1) {
    // при смене домена парсинг не должен молча отдавать неверный type/id
    console.warn(`[api] URL вне pk.rgsu.net: ${url}`);
    return { type: 'competition', id: '' };
  }
  const parts = url.slice(idx + marker.length).split('/');
  const type = parts[0] || 'competition';
  const id = parts.slice(1).join('/') || '';
  return { type, id };
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

async function fetchCompetitionData(type: string, id: string, signal?: AbortSignal): Promise<CompetitionFetchResult> {
  const url = API_BASE
    ? `${API_BASE}?type=${type}&id=${id}`
    : `/api/competition/${type}/${id}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(result.error || 'Bad data');
  }
  return {
    students: result.data as Student[],
    updatedAt: result.updatedAt ?? null,
    seats: typeof result.seats === 'number' ? result.seats : 0,
    source: (result.source === 'archive' ? 'archive' : 'live') as DataSource,
    archivedAt: typeof result.archivedAt === 'string' ? result.archivedAt : undefined,
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Upstream-таймаут сервера — 10 с, плюс запас на cold start serverless:
// без таймаута зависший запрос вешал бы кнопку/SyncOverlay до браузерного лимита (~300 с)
const FETCH_TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 800;
const RETRY_ATTEMPTS = 2;

async function fetchWithTimeout(type: string, id: string, outerSignal?: AbortSignal): Promise<CompetitionFetchResult> {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort(new Error('Request aborted'));
  outerSignal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), FETCH_TIMEOUT_MS);
  try {
    return await fetchCompetitionData(type, id, controller.signal);
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onOuterAbort);
  }
}

export async function fetchCompetitionDataWithRetry(type: string, id: string, signal?: AbortSignal): Promise<CompetitionFetchResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchWithTimeout(type, id, signal);
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

export async function fetchAllCompetitions(
  comps: Competition[],
  opts: { concurrency?: number; delayMs?: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {}
): Promise<FetchAllCompetitionsResult> {
  const { concurrency = 2, delayMs = 350, onProgress, signal } = opts;
  const results: CompetitionDataMap = {};
  const failed: string[] = [];

  const queue = [...comps];
  let running = 0;
  let done = 0;

  return new Promise<FetchAllCompetitionsResult>((resolve) => {
    async function worker() {
      while (queue.length > 0) {
        if (signal?.aborted) break;
        const comp = queue.shift()!;
        const { type, id } = getCompetitionPath(comp.url);
        try {
          const data = await fetchCompetitionDataWithRetry(type, id, signal);
          results[comp.id] = data;
        } catch (err) {
          failed.push(comp.id);
          console.warn(`[fetchAll] ${comp.id} failed:`, (err as Error).message);
        }
        done += 1;
        onProgress?.(done, comps.length);
        if (delayMs > 0 && !signal?.aborted) await sleep(delayMs);
      }
      running -= 1;
      if (running === 0) resolve({ map: results, failed });
    }

    const start = Math.min(concurrency, comps.length || 1);
    for (let i = 0; i < start; i++) {
      running += 1;
      worker();
    }
  });
}
