import { useMemo } from 'react';
import { competitions, Competition, Student } from '../data';
import { DirectionRow } from '../types';

type UseMyPositionResult = {
  meStudent: Student | null;
  meAcrossDirections: DirectionRow[] | null;
};

export function useMyPosition(
  searchIsCode: boolean,
  searchQuery: string,
  selectedComp: Competition,
  fetchedStudents: Student[],
  allCompStudents: Record<string, Student[]>,
  seatsByComp: Record<string, number>
): UseMyPositionResult {
  const meStudent = useMemo(() => {
    if (!searchIsCode) return null;
    const code = searchQuery.trim();
    return fetchedStudents.find(s => s.uniqueCode === code || s.id === code) || null;
  }, [fetchedStudents, searchQuery, searchIsCode]);

  const meAcrossDirections = useMemo<DirectionRow[] | null>(() => {
    if (!searchIsCode) return null;
    const code = searchQuery.trim();

    return competitions.map((comp) => {
      const compList = comp.id === selectedComp.id ? fetchedStudents : allCompStudents[comp.id];

      if (!compList) {
        return { comp, state: 'loading' as const };
      }

      const sorted = [...compList].sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
        if (a.examPoints !== b.examPoints) return b.examPoints - a.examPoints;
        for (let j = 0; j < Math.max(a.subjects.length, b.subjects.length); j++) {
          const aSub = a.subjects[j] || 0;
          const bSub = b.subjects[j] || 0;
          if (aSub !== bSub) return bSub - aSub;
        }
        return 0;
      });

      const idx = sorted.findIndex(s => s.uniqueCode === code || s.id === code);
      if (idx === -1) {
        return { comp, state: 'absent' as const };
      }

      const seats = seatsByComp[comp.id] ?? comp.seats;
      const admitted = comp.basis === 'Бюджет'
        ? sorted.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
        : sorted.filter(s => s.hasOriginal);
      let passingScore: number | null = null;
      if (admitted.length >= seats && seats > 0) {
        passingScore = admitted[seats - 1].totalPoints;
      } else if (sorted.length >= seats && seats > 0) {
        passingScore = sorted[seats - 1].totalPoints;
      } else if (sorted.length > 0) {
        passingScore = sorted[sorted.length - 1].totalPoints;
      }

      const st = sorted[idx];
      return {
        comp,
        state: 'found' as const,
        rank: idx + 1,
        total: sorted.length,
        points: st.totalPoints,
        hasOriginal: st.hasOriginal,
        isCurrent: comp.id === selectedComp.id,
        priority: st.priority,
        passingScore,
      };
    });
  }, [searchIsCode, searchQuery, selectedComp, fetchedStudents, allCompStudents, seatsByComp]);

  return { meStudent, meAcrossDirections };
}
