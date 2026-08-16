import { useState, useMemo, useCallback } from 'react';
import { matchSorter } from 'match-sorter';
import { Student } from '../data';
import { SortConfig } from '../types';
import { compareApplicants } from '../lib/paidEnrollment';

type UseStudentsResult = {
  filteredAndSortedStudents: Student[];
  rankedStudents: Student[];
  sortConfig: SortConfig;
  handleSort: (key: keyof Student) => void;
};

export function useStudents(
  students: Student[],
  searchQuery: string,
  consentOnly: boolean,
  activeBasis: string
): UseStudentsResult {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });

  const handleSort = useCallback((key: keyof Student) => {
    setSortConfig(prev => {
      let direction: 'asc' | 'desc' = 'desc';
      if (prev.key === key && prev.direction === 'desc') {
        direction = 'asc';
      }
      return { key, direction };
    });
  }, []);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    if (consentOnly) {
      result = activeBasis === 'Бюджет'
        ? result.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
        : result.filter(s => s.hasContract || s.hasOriginal);
    }

    if (searchQuery.trim()) {
      result = matchSorter(result, searchQuery, { keys: ['uniqueCode', 'id'] });
    }

    if (sortConfig.key) {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (typeof aVal === 'number' && typeof bVal === 'number' && aVal !== bVal) {
          return (aVal - bVal) * dir;
        }
        // при равенстве основного ключа — тай-брейк по 5-уровневому конкурсу
        // (множитель обратный: desc-сортировка — тай-брейк тоже по убыванию)
        return compareApplicants(a, b) * -dir;
      });
    }

    return result;
  }, [students, searchQuery, consentOnly, sortConfig, activeBasis]);

  const rankedStudents = useMemo(() => [...students].sort(compareApplicants), [students]);

  return { filteredAndSortedStudents, rankedStudents, sortConfig, handleSort };
}
