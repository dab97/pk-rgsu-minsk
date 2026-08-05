import React, { useState, useEffect } from 'react';
import { competitions, Competition } from '../data';
import { getCompetitionPath, fetchCompetitionDataWithRetry } from '../lib/api';
import { Student } from '../data';

type UseCompetitionDataResult = {
  students: Student[];
  updatedAt: string | null;
  setUpdatedAt: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  fetchError: string | null;
  seatsByComp: Record<string, number>;
  setSeatsByComp: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

export function useCompetitionData(
  selectedCompId: string,
  activeBasis: string
): UseCompetitionDataResult {
  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [seatsByComp, setSeatsByComp] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('rgsu_seats_by_comp');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (Object.keys(seatsByComp).length > 0) {
      try {
        localStorage.setItem('rgsu_seats_by_comp', JSON.stringify(seatsByComp));
      } catch (err) {
        console.warn('Failed to save seats to localStorage:', err);
      }
    }
  }, [seatsByComp]);

  useEffect(() => {
    async function loadData() {
      const comp = competitions.find(c => c.id === selectedCompId) || competitions[0];
      if (!comp || comp.basis !== activeBasis) {
        setFetchError(null);
        return;
      }
      setIsLoading(true);
      setFetchError(null);
      try {
        const { type: compType, id: compUrlId } = getCompetitionPath(comp.url);
        if (compUrlId) {
          const data = await fetchCompetitionDataWithRetry(compType, compUrlId);
          if (data.students.length > 0) {
            setFetchedStudents(data.students);
            setUpdatedAt(data.updatedAt ?? null);
            if (data.seats > 0) {
              setSeatsByComp((prev) => (prev[comp.id] === data.seats ? prev : { ...prev, [comp.id]: data.seats }));
            }
          } else {
            throw new Error('Данные не найдены');
          }
        }
      } catch (err: any) {
        console.warn('Не удалось загрузить данные. Ошибка:', err.message);
        setFetchError('Сервер РГСУ не ответил или заблокировал запрос. Попробуйте обновить страницу позже.');
        setFetchedStudents([]);
        setUpdatedAt(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedCompId, activeBasis]);

  return { students: fetchedStudents, updatedAt, setUpdatedAt, isLoading, fetchError, seatsByComp, setSeatsByComp };
}
