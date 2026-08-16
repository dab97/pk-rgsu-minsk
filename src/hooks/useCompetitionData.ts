import React, { useState, useEffect } from 'react';
import { competitions } from '../data';
import { getCompetitionPath, fetchCompetitionDataWithRetry } from '../lib/api';
import { Student } from '../data';

// Пустой список студентов — легитимное состояние «списки не сформированы»,
// поэтому ошибкой считаем только неудачный запрос; текст различает причину
function describeFetchError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/^HTTP 404/.test(message)) {
    return 'Конкурсный список не найден на сервере РГСУ (404). Возможно, ссылка направления устарела — проверьте url в src/competitions.ts.';
  }
  if (/^HTTP 429/.test(message)) {
    return 'Слишком много запросов к серверу РГСУ (429). Подождите около минуты и обновите страницу.';
  }
  if (/^HTTP 4\d\d/.test(message)) {
    return `Сервер РГСУ отклонил запрос (${message.replace('HTTP ', '')}).`;
  }
  if (/^HTTP 5\d\d/.test(message)) {
    return `Сервер РГСУ отвечает с ошибкой (${message.replace('HTTP ', '')}). Попробуйте обновить страницу позже.`;
  }
  if (/timeout/i.test(message)) {
    return 'Превышено время ожидания ответа сервера (таймаут). Попробуйте обновить страницу позже.';
  }
  if (/too large/i.test(message)) {
    return 'Ответ сервера РГСУ неожиданно велик и был отклонён.';
  }
  if (/failed to fetch|network|upstream fetch failed/i.test(message)) {
    return 'Нет связи с сервером РГСУ. Проверьте подключение к сети и попробуйте обновить страницу.';
  }
  return 'Не удалось загрузить конкурсный список. Попробуйте обновить страницу позже.';
}

type UseCompetitionDataResult = {
  students: Student[];
  updatedAt: string | null;
  isLoading: boolean;
  fetchError: string | null;
  dataSource: 'live' | 'archive' | null;
  archivedAt: string | null;
};

export function useCompetitionData(
  selectedCompId: string,
  activeBasis: string,
  setSeatsByComp: React.Dispatch<React.SetStateAction<Record<string, number>>>
): UseCompetitionDataResult {
  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'archive' | null>(null);
  const [archivedAt, setArchivedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const comp = competitions.find(c => c.id === selectedCompId) || competitions[0];
      if (!comp || comp.basis !== activeBasis) {
        // Переходный кадр при смене основы: под шапкой нового направления
        // не должен мигать список предыдущего конкурса
        setFetchError(null);
        setFetchedStudents([]);
        setUpdatedAt(null);
        setDataSource(null);
        setArchivedAt(null);
        return;
      }
      setIsLoading(true);
      setFetchError(null);
      try {
        const { type: compType, id: compUrlId } = getCompetitionPath(comp.url);
        if (compUrlId) {
          const data = await fetchCompetitionDataWithRetry(compType, compUrlId);
          if (cancelled) return;
          // Пустой список — не ошибка: таблица покажет «Списки пока не сформированы»
          setFetchedStudents(data.students);
          setUpdatedAt(data.updatedAt ?? null);
          setDataSource(data.source);
          setArchivedAt(data.archivedAt ?? null);
          if (data.seats > 0) {
            setSeatsByComp((prev) => (prev[comp.id] === data.seats ? prev : { ...prev, [comp.id]: data.seats }));
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Не удалось загрузить данные. Ошибка:', err);
        setFetchError(describeFetchError(err));
        setFetchedStudents([]);
        setUpdatedAt(null);
        setDataSource(null);
        setArchivedAt(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadData();

    return () => { cancelled = true; };
  }, [selectedCompId, activeBasis, setSeatsByComp]);

  return { students: fetchedStudents, updatedAt, isLoading, fetchError, dataSource, archivedAt };
}
