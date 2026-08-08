import { useMemo } from 'react';
import { Student, Competition } from '../data';

type Stats = {
  totalApps: number;
  originalsCount: number;
  competitionRatio: string;
  predictedPassing: number | null;
  avgScore: string | number;
};

type UseStatsResult = {
  stats: Stats;
};

export function useStats(
  students: Student[],
  selectedComp: Competition,
  rankedStudents: Student[],
  activeBasis: string
): UseStatsResult {
  const stats = useMemo(() => {
    const totalApps = students.length;
    const originalsCount = students.filter(s => s.hasOriginal).length;
    const seats = selectedComp.seats;
    const competitionRatio = seats > 0 ? (totalApps / seats).toFixed(1) : '0';

    let predictedPassing: number | null = null;

    const admitted = activeBasis === 'Бюджет'
      ? rankedStudents.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
      : rankedStudents.filter(s => s.hasContract || s.hasOriginal);

    if (admitted.length >= seats && seats > 0) {
      predictedPassing = admitted[seats - 1].totalPoints;
    } else if (rankedStudents.length >= seats && seats > 0) {
      predictedPassing = rankedStudents[seats - 1].totalPoints;
    } else if (rankedStudents.length > 0) {
      predictedPassing = rankedStudents[rankedStudents.length - 1].totalPoints;
    }

    let avgScore: string | number = '-';
    if (rankedStudents.length > 0) {
      const topN = rankedStudents.slice(0, seats);
      if (topN.length > 0) {
        const sum = topN.reduce((acc, curr) => acc + curr.totalPoints, 0);
        avgScore = (sum / topN.length).toFixed(1);
      }
    }

    return {
      totalApps,
      originalsCount,
      competitionRatio,
      predictedPassing,
      avgScore,
    };
  }, [students, selectedComp, rankedStudents, activeBasis]);

  return { stats };
}
