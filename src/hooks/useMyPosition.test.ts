import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMyPosition } from './useMyPosition';
import { Student, Competition } from '../data';
import { competitions } from '../competitions';

const firstComp = competitions[0]; // psychology-fulltime
const secondComp = competitions[1]; // psychology-parttime

const mockStudents: Student[] = [
  {
    id: '1', uniqueCode: 'ABC123', totalPoints: 290, examPoints: 100,
    subjects: [95, 95, 100], achievementPoints: 0, hasOriginal: true,
    priority: 1, mainHigherPriority: '-', higherPassingPriority: '1',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
  {
    id: '2', uniqueCode: 'DEF456', totalPoints: 280, examPoints: 90,
    subjects: [90, 95, 95], achievementPoints: 0, hasOriginal: true,
    priority: 2, mainHigherPriority: '-', higherPassingPriority: '2',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
];

describe('useMyPosition', () => {
  describe('meStudent', () => {
    it('returns null when searchIsCode is false', () => {
      const { result } = renderHook(() =>
        useMyPosition(false, 'ABC', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meStudent).toBeNull();
    });

    it('finds student by uniqueCode', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meStudent).not.toBeNull();
      expect(result.current.meStudent?.uniqueCode).toBe('ABC123');
    });

    it('finds student by id', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, '1', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meStudent).not.toBeNull();
      expect(result.current.meStudent?.id).toBe('1');
    });

    it('returns null for non-existent code', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, '999999', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meStudent).toBeNull();
    });
  });

  describe('meAcrossDirections', () => {
    it('returns null when searchIsCode is false', () => {
      const { result } = renderHook(() =>
        useMyPosition(false, 'ABC123', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meAcrossDirections).toBeNull();
    });

    it('returns found state when student exists in current comp', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meAcrossDirections).not.toBeNull();
      const currentDir = result.current.meAcrossDirections?.find(d => d.comp.id === firstComp.id);
      expect(currentDir?.state).toBe('found');
      expect(currentDir?.rank).toBe(1);
    });

    it('returns loading state when comp data not loaded', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, {}, {})
      );

      expect(result.current.meAcrossDirections).not.toBeNull();
      const otherDir = result.current.meAcrossDirections?.find(d => d.comp.id === secondComp.id);
      expect(otherDir?.state).toBe('loading');
    });

    it('calculates passingScore correctly for budget', () => {
      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, {}, {})
      );

      const currentDir = result.current.meAcrossDirections?.find(d => d.comp.id === firstComp.id);
      // firstComp has 8 seats, 2 students with higherPassingPriority != '-'
      // admitted.length (2) < seats (8), so fallback to rankedStudents[seats-1]
      // But we only have 2 students, so rankedStudents[7] is undefined
      // Falls back to rankedStudents[rankedStudents.length - 1] = 280
      expect(currentDir?.passingScore).toBe(280);
    });

    it('finds student in loaded comp data', () => {
      const otherStudents: Student[] = [
        { ...mockStudents[0], id: '10', uniqueCode: 'ABC123', totalPoints: 285 },
        { ...mockStudents[1], id: '11', uniqueCode: 'XYZ999', totalPoints: 275 },
      ];

      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, { [secondComp.id]: otherStudents }, {})
      );

      const otherDir = result.current.meAcrossDirections?.find(d => d.comp.id === secondComp.id);
      expect(otherDir?.state).toBe('found');
      expect(otherDir?.rank).toBe(1);
      expect(otherDir?.points).toBe(285);
    });

    it('returns absent state when student not in other comp', () => {
      const otherStudents: Student[] = [
        { ...mockStudents[1], id: '11', uniqueCode: 'XYZ999', totalPoints: 275 },
      ];

      const { result } = renderHook(() =>
        useMyPosition(true, 'ABC123', firstComp, mockStudents, { [secondComp.id]: otherStudents }, {})
      );

      const otherDir = result.current.meAcrossDirections?.find(d => d.comp.id === secondComp.id);
      expect(otherDir?.state).toBe('absent');
    });
  });
});
