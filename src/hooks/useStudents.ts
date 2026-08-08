import React, { useState, useMemo, useCallback } from 'react';
import { matchSorter } from 'match-sorter';
import { Student } from '../data';
import { SortConfig } from '../types';

type UseStudentsResult = {
  filteredAndSortedStudents: Student[];
  rankedStudents: Student[];
  sortConfig: SortConfig;
  handleSort: (key: keyof Student) => void;
  handleSortKeyDown: (key: keyof Student) => (e: React.KeyboardEvent<HTMLTableCellElement>) => void;
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

  const handleSortKeyDown = useCallback((key: keyof Student) => (e: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(key);
    }
  }, [handleSort]);

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
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (aVal === bVal || aVal === undefined || bVal === undefined) return 0;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const dirMulti = sortConfig.direction === 'asc' ? 1 : -1;
        if (sortConfig.key === 'totalPoints') {
          if (a.examPoints !== b.examPoints) return (a.examPoints - b.examPoints) * dirMulti;
          for (let j = 0; j < Math.max(a.subjects.length, b.subjects.length); j++) {
            const aSub = a.subjects[j] || 0;
            const bSub = b.subjects[j] || 0;
            if (aSub !== bSub) return (aSub - bSub) * dirMulti;
          }
        } else if (sortConfig.key === 'examPoints') {
          for (let j = 0; j < Math.max(a.subjects.length, b.subjects.length); j++) {
            const aSub = a.subjects[j] || 0;
            const bSub = b.subjects[j] || 0;
            if (aSub !== bSub) return (aSub - bSub) * dirMulti;
          }
        }

        return 0;
      });
    }

    return result;
  }, [students, searchQuery, consentOnly, sortConfig, activeBasis]);

  const rankedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.examPoints !== b.examPoints) return b.examPoints - a.examPoints;
      for (let j = 0; j < Math.max(a.subjects.length, b.subjects.length); j++) {
        const aSub = a.subjects[j] || 0;
        const bSub = b.subjects[j] || 0;
        if (aSub !== bSub) return bSub - aSub;
      }
      return 0;
    });
  }, [students]);

  return { filteredAndSortedStudents, rankedStudents, sortConfig, handleSort, handleSortKeyDown };
}
