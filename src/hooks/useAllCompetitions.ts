import React, { useState, useEffect, useRef, useCallback } from 'react';
import { competitions, Student } from '../data';
import { fetchAllCompetitions } from '../lib/api';

// Данные направлений протухают так же, как серверный кэш (3 минуты):
// без TTL длинная сессия никогда бы не обновила списки
const REFETCH_TTL_MS = 3 * 60 * 1000;

// "dd.mm.yyyy HH:MM" -> timestamp; строки без распознанной даты считаются старее всех
function parseUpdatedAt(s: string): number {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
}

function latestUpdate(a: string, b: string): string {
  return parseUpdatedAt(b) > parseUpdatedAt(a) ? b : a;
}

type UseAllCompetitionsResult = {
  allCompStudents: Record<string, Student[]>;
  loadingAllDirs: boolean;
  allUpdatedAt: string | null;
  /** id направлений, данные которых не загрузились */
  failedDirs: string[];
  /** Повторить загрузку упавших направлений */
  retryFailed: () => void;
};

export function useAllCompetitions(
  needAllCompData: boolean,
  setSeatsByComp: React.Dispatch<React.SetStateAction<Record<string, number>>>
): UseAllCompetitionsResult {
  const [allCompStudents, setAllCompStudents] = useState<Record<string, Student[]>>({});
  const [loadingAllDirs, setLoadingAllDirs] = useState(false);
  const [allUpdatedAt, setAllUpdatedAt] = useState<string | null>(null);
  const [failedDirs, setFailedDirs] = useState<string[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const fetchedAtRef = useRef<Map<string, number>>(new Map());

  // Упавшие направления не попадают в fetchedAtRef, поэтому повторный запуск
  // эффекта сам подхватит их; retryToken форсирует этот запуск вручную
  const retryFailed = useCallback(() => setRetryToken(t => t + 1), []);

  useEffect(() => {
    if (!needAllCompData) return;

    const now = Date.now();
    const pending = competitions.filter(c => {
      const at = fetchedAtRef.current.get(c.id);
      return !at || now - at > REFETCH_TTL_MS;
    });
    if (pending.length === 0) return;

    const controller = new AbortController();
    setLoadingAllDirs(true);
    setFailedDirs([]);

    fetchAllCompetitions(pending, {
      concurrency: 2,
      delayMs: 350,
      signal: controller.signal,
    }).then(({ map, failed }) => {
      // Эффект уже перезапустился (abort) — старый результат не должен
      // перетирать состояние новой загрузки (например, гасить её loading)
      if (controller.signal.aborted) return;
      const studentsMap: Record<string, Student[]> = {};
      const seatsMap: Record<string, number> = {};
      const updates: string[] = [];
      Object.entries(map).forEach(([compId, data]) => {
        studentsMap[compId] = data.students;
        if (data.students && data.students.length > 0) {
          fetchedAtRef.current.set(compId, Date.now());
        }
        if (data.updatedAt) updates.push(data.updatedAt);
        if (data.seats > 0) seatsMap[compId] = data.seats;
      });
      setAllCompStudents((prev) => ({ ...prev, ...studentsMap }));
      setSeatsByComp((prev) => ({ ...prev, ...seatsMap }));
      if (updates.length > 0) {
        const latest = updates.reduce(latestUpdate);
        setAllUpdatedAt(prev => (prev && parseUpdatedAt(prev) > parseUpdatedAt(latest) ? prev : latest));
      }
      setFailedDirs(failed);
      setLoadingAllDirs(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setFailedDirs(pending.map(c => c.id));
      setLoadingAllDirs(false);
    });

    return () => { controller.abort(); };
  }, [needAllCompData, setSeatsByComp, retryToken]);

  return { allCompStudents, loadingAllDirs, allUpdatedAt, failedDirs, retryFailed };
}
