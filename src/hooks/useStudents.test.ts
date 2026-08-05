import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudents } from './useStudents';
import { Student } from '../data';

const mockStudents: Student[] = [
  {
    id: '1', uniqueCode: 'ABC123', totalPoints: 285, examPoints: 100,
    subjects: [95, 90, 100], achievementPoints: 0, hasOriginal: true,
    priority: 1, mainHigherPriority: '-', higherPassingPriority: '1',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
  {
    id: '2', uniqueCode: 'DEF456', totalPoints: 270, examPoints: 90,
    subjects: [90, 90, 90], achievementPoints: 0, hasOriginal: false,
    priority: 2, mainHigherPriority: '-', higherPassingPriority: '-',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
  {
    id: '3', uniqueCode: 'XYZ789', totalPoints: 290, examPoints: 100,
    subjects: [95, 95, 100], achievementPoints: 0, hasOriginal: true,
    priority: 1, mainHigherPriority: '-', higherPassingPriority: '1',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
];

describe('useStudents', () => {
  describe('sorting', () => {
    it('does not sort by default (no sort key)', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', false, 'Бюджет')
      );

      // Without sort, order is preserved from input
      const sorted = result.current.filteredAndSortedStudents;
      expect(sorted[0].uniqueCode).toBe('ABC123');
      expect(sorted[1].uniqueCode).toBe('DEF456');
      expect(sorted[2].uniqueCode).toBe('XYZ789');
    });

    it('sorts by totalPoints descending after handleSort', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', false, 'Бюджет')
      );

      act(() => {
        result.current.handleSort('totalPoints');
      });

      const sorted = result.current.filteredAndSortedStudents;
      expect(sorted[0].uniqueCode).toBe('XYZ789');
      expect(sorted[1].uniqueCode).toBe('ABC123');
      expect(sorted[2].uniqueCode).toBe('DEF456');
    });

    it('sorts by totalPoints ascending after second handleSort', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', false, 'Бюджет')
      );

      act(() => {
        result.current.handleSort('totalPoints');
        result.current.handleSort('totalPoints');
      });

      const sorted = result.current.filteredAndSortedStudents;
      expect(sorted[0].uniqueCode).toBe('DEF456');
      expect(sorted[2].uniqueCode).toBe('XYZ789');
    });

    it('sorts by examPoints with tie-breaking by subjects', () => {
      const studentsWithTie: Student[] = [
        { ...mockStudents[0], totalPoints: 280, examPoints: 100, subjects: [95, 90, 100] },
        { ...mockStudents[1], totalPoints: 280, examPoints: 100, subjects: [90, 90, 90] },
      ];

      const { result } = renderHook(() =>
        useStudents(studentsWithTie, '', false, 'Бюджет')
      );

      act(() => {
        result.current.handleSort('examPoints');
      });

      const sorted = result.current.filteredAndSortedStudents;
      // ABC123 has higher first subject (95 > 90), should come first in desc
      expect(sorted[0].uniqueCode).toBe('ABC123');
    });
  });

  describe('filtering', () => {
    it('filters by search query (uniqueCode)', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, 'ABC', false, 'Бюджет')
      );

      expect(result.current.filteredAndSortedStudents).toHaveLength(1);
      expect(result.current.filteredAndSortedStudents[0].uniqueCode).toBe('ABC123');
    });

    it('filters by consentOnly for budget (higherPassingPriority)', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', true, 'Бюджет')
      );

      // Only students with higherPassingPriority != '-' and != 'Нет'
      expect(result.current.filteredAndSortedStudents).toHaveLength(2);
      expect(result.current.filteredAndSortedStudents.every(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')).toBe(true);
    });

    it('filters by consentOnly for paid (hasOriginal)', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', true, 'Платное')
      );

      // Only students with hasOriginal = true
      expect(result.current.filteredAndSortedStudents).toHaveLength(2);
      expect(result.current.filteredAndSortedStudents.every(s => s.hasOriginal)).toBe(true);
    });
  });

  describe('rankedStudents', () => {
    it('returns students sorted by totalPoints descending', () => {
      const { result } = renderHook(() =>
        useStudents(mockStudents, '', false, 'Бюджет')
      );

      const ranked = result.current.rankedStudents;
      expect(ranked[0].uniqueCode).toBe('XYZ789');
      expect(ranked[1].uniqueCode).toBe('ABC123');
      expect(ranked[2].uniqueCode).toBe('DEF456');
    });
  });
});
