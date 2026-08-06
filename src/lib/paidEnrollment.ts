import { Competition, Student } from '../types';

export type EnrollmentItem = {
  student: Student;
  comp: Competition;
  rawRank: number;
  effectiveRank: number | null;
  allocationStatus: 'passing' | 'withdrawn' | 'in_competition';
  passedCompId?: string;
  passedCompTitle?: string;
  passedPriority?: number;
};

export type CompetitionEnrollmentResult = {
  comp: Competition;
  items: EnrollmentItem[];
  seats: number;
  totalApps: number;
  passingCount: number;
  withdrawnCount: number;
  passingScore: number | null;
};

/**
 * Multi-tier 5-stage comparison for applicants
 */
export function compareApplicants(a: Student, b: Student): number {
  if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
  if (a.examPoints !== b.examPoints) return b.examPoints - a.examPoints;

  const aSub1 = a.subjects[0] || 0;
  const bSub1 = b.subjects[0] || 0;
  if (aSub1 !== bSub1) return bSub1 - aSub1;

  const aSub2 = a.subjects[1] || 0;
  const bSub2 = b.subjects[1] || 0;
  if (aSub2 !== bSub2) return bSub2 - aSub2;

  const aSub3 = a.subjects[2] || 0;
  const bSub3 = b.subjects[2] || 0;
  if (aSub3 !== bSub3) return bSub3 - aSub3;

  return 0;
}

/**
 * Calculates enrollment allocation across the 6 paid directions.
 * Logic:
 * - Each direction has a sorted list of applicants (by 5-tier points criteria).
 * - A student can apply to multiple directions with priorities (1, 2, 3...).
 * - If a student passes (fits within seats) in a higher-priority direction P,
 *   they are provisionally allocated to P and WITHDRAW from all lower priority directions (P+1, P+2...).
 * - When a student withdraws from a lower priority direction, they free up a seat in that direction,
 *   allowing candidates lower down in that direction to advance into the passing zone.
 * - Loop continues until allocations stabilize.
 */
export function computePaidEnrollmentAllocation(
  paidCompetitions: Competition[],
  allCompStudents: Record<string, Student[]>,
  options?: {
    paidOnly?: boolean;
    originalOnly?: boolean;
  }
): Record<string, CompetitionEnrollmentResult> {
  const { paidOnly = false, originalOnly = false } = options || {};

  // Step 1: Prepare sorted lists for each competition
  const initialLists: Record<string, Array<{ student: Student; comp: Competition; rawRank: number }>> = {};

  paidCompetitions.forEach((comp) => {
    let rawList = allCompStudents[comp.id] ? [...allCompStudents[comp.id]] : [];

    if (paidOnly) {
      rawList = rawList.filter((s) => s.semesterPayment && s.semesterPayment !== 'Нет');
    }
    if (originalOnly) {
      rawList = rawList.filter((s) => s.hasOriginal);
    }

    rawList.sort(compareApplicants);

    initialLists[comp.id] = rawList.map((student, idx) => ({
      student,
      comp,
      rawRank: idx + 1,
    }));
  });

  // Step 2: Track active applications per student
  // Map student unique code -> list of applications sorted by priority
  type StudentApp = {
    compId: string;
    priority: number;
    comp: Competition;
  };
  const studentAppsMap = new Map<string, StudentApp[]>();

  paidCompetitions.forEach((comp) => {
    (initialLists[comp.id] || []).forEach(({ student }) => {
      const code = student.uniqueCode || student.id;
      if (!studentAppsMap.has(code)) {
        studentAppsMap.set(code, []);
      }
      const existing = studentAppsMap.get(code)!;
      if (!existing.some((app) => app.compId === comp.id)) {
        existing.push({
          compId: comp.id,
          priority: student.priority || 99,
          comp,
        });
      }
    });
  });

  // Sort student applications by priority ascending (1 = highest priority)
  studentAppsMap.forEach((apps) => {
    apps.sort((a, b) => a.priority - b.priority);
  });

  // Set of withdrawn (code + compId)
  const withdrawnSet = new Set<string>();
  // Map of allocated (code -> { compId, priority, compTitle })
  const currentAllocated = new Map<string, { compId: string; priority: number; compTitle: string }>();

  // Round-based allocation simulation
  let maxRounds = 50;
  let changed = true;

  while (changed && maxRounds > 0) {
    maxRounds--;
    changed = false;

    // Reset current allocations for this round evaluation
    currentAllocated.clear();

    // For each competition, determine top active candidates within capacity
    paidCompetitions.forEach((comp) => {
      const seats = comp.seats;
      const list = initialLists[comp.id] || [];

      let activeCount = 0;
      for (const item of list) {
        const code = item.student.uniqueCode || item.student.id;
        const key = `${code}:${comp.id}`;

        if (!withdrawnSet.has(key)) {
          activeCount++;
          if (activeCount <= seats) {
            // Provisionally allocated to this competition
            const studentApps = studentAppsMap.get(code) || [];
            const app = studentApps.find((a) => a.compId === comp.id);
            const prio = app ? app.priority : item.student.priority || 99;

            // Check if this student already had a better (higher) priority allocation
            const prevAlloc = currentAllocated.get(code);
            if (!prevAlloc || prio < prevAlloc.priority) {
              currentAllocated.set(code, {
                compId: comp.id,
                priority: prio,
                compTitle: comp.title,
              });
            }
          }
        }
      }
    });

    // Check for lower priority withdrawals
    // If student is allocated to priority P, they withdraw from all priorities P_other > P
    studentAppsMap.forEach((apps, code) => {
      const alloc = currentAllocated.get(code);
      if (alloc) {
        apps.forEach((app) => {
          if (app.priority > alloc.priority) {
            const key = `${code}:${app.compId}`;
            if (!withdrawnSet.has(key)) {
              withdrawnSet.add(key);
              changed = true;
            }
          }
        });
      }
    });
  }

  // Step 3: Build final output for each competition
  const results: Record<string, CompetitionEnrollmentResult> = {};

  paidCompetitions.forEach((comp) => {
    const list = initialLists[comp.id] || [];
    const seats = comp.seats;

    let activeRank = 0;
    let passingScore: number | null = null;
    let passingCount = 0;
    let withdrawnCount = 0;

    const items: EnrollmentItem[] = list.map((item) => {
      const code = item.student.uniqueCode || item.student.id;
      const key = `${code}:${comp.id}`;

      const isWithdrawn = withdrawnSet.has(key);
      const alloc = currentAllocated.get(code);

      if (isWithdrawn) {
        withdrawnCount++;
        return {
          student: item.student,
          comp,
          rawRank: item.rawRank,
          effectiveRank: null,
          allocationStatus: 'withdrawn',
          passedCompId: alloc?.compId,
          passedCompTitle: alloc?.compTitle,
          passedPriority: alloc?.priority,
        };
      }

      activeRank++;
      const isPassing = activeRank <= seats;

      if (isPassing) {
        passingCount++;
        passingScore = item.student.totalPoints;
        return {
          student: item.student,
          comp,
          rawRank: item.rawRank,
          effectiveRank: activeRank,
          allocationStatus: 'passing',
          passedCompId: comp.id,
          passedCompTitle: comp.title,
          passedPriority: item.student.priority,
        };
      } else {
        return {
          student: item.student,
          comp,
          rawRank: item.rawRank,
          effectiveRank: activeRank,
          allocationStatus: 'in_competition',
        };
      }
    });

    results[comp.id] = {
      comp,
      items,
      seats,
      totalApps: list.length,
      passingCount,
      withdrawnCount,
      passingScore,
    };
  });

  return results;
}
