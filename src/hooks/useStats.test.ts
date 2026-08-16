import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStats } from './useStats';
import { Student, Competition } from '../data';

const mockComp: Competition = {
  id: 'test-comp',
  title: 'Тестовое направление',
  subtitle: 'Тест',
  branch: 'Минск',
  studyForm: 'Очная',
  studyDuration: '4 года',
  educationLevel: 'Бакалавриат',
  basis: 'Бюджет',
  seats: 3,
  url: 'https://example.com',
};

const mockStudents: Student[] = [
  {
    id: '1', uniqueCode: 'A', totalPoints: 290, examPoints: 100,
    subjects: [95, 95, 100], achievementPoints: 0, hasOriginal: true,
    priority: 1, mainHigherPriority: '-', higherPassingPriority: '1',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
  {
    id: '2', uniqueCode: 'B', totalPoints: 280, examPoints: 90,
    subjects: [90, 95, 95], achievementPoints: 0, hasOriginal: true,
    priority: 2, mainHigherPriority: '-', higherPassingPriority: '2',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
  {
    id: '3', uniqueCode: 'C', totalPoints: 270, examPoints: 80,
    subjects: [90, 90, 90], achievementPoints: 0, hasOriginal: false,
    priority: 3, mainHigherPriority: '-', higherPassingPriority: '-',
    preemptiveRight1: 'Нет', preemptiveRight2: 'Нет', idAtEquality: 'Нет',
    withoutExams: 'Нет', basisBVI: '-', status: 'в конкурсе',
  },
];

describe('useStats', () => {
  it('calculates totalApps correctly', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Бюджет')
    );

    expect(result.current.stats.totalApps).toBe(3);
  });

  it('calculates originalsCount correctly', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Бюджет')
    );

    expect(result.current.stats.originalsCount).toBe(2);
  });

  it('calculates competitionRatio correctly', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Бюджет')
    );

    expect(result.current.stats.competitionRatio).toBe('1.0');
  });

  it('calculates predictedPassing for budget based on higherPassingPriority', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Бюджет')
    );

    // 3 seats, 2 students with higherPassingPriority != '-'
    // Should use admitted students, then fallback to ranked
    expect(result.current.stats.predictedPassing).toBe(270);
  });

  it('calculates predictedPassing for paid based on hasOriginal', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Платное')
    );

    // 3 seats, 2 students with hasOriginal (290, 280)
    // admitted.length (2) < seats (3), fallback to rankedStudents[2] = 270
    expect(result.current.stats.predictedPassing).toBe(270);
  });

  it('calculates avgScore correctly', () => {
    const ranked = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    const { result } = renderHook(() =>
      useStats(mockStudents, mockComp, ranked, 'Бюджет')
    );

    // Top 3: (290 + 280 + 270) / 3 = 280.0
    expect(result.current.stats.avgScore).toBe('280.0');
  });

  it('returns - for avgScore when no students', () => {
    const { result } = renderHook(() =>
      useStats([], mockComp, [], 'Бюджет')
    );

    expect(result.current.stats.avgScore).toBe('-');
  });

  it('returns null for predictedPassing when no students', () => {
    const { result } = renderHook(() =>
      useStats([], mockComp, [], 'Бюджет')
    );

    expect(result.current.stats.predictedPassing).toBeNull();
  });
});
