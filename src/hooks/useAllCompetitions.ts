import React, { useState, useEffect, useRef } from 'react';
import { competitions, Student } from '../data';
import { fetchAllCompetitions } from '../lib/api';

type UseAllCompetitionsResult = {
  allCompStudents: Record<string, Student[]>;
  loadingAllDirs: boolean;
};

export function useAllCompetitions(
  needAllCompData: boolean,
  setSeatsByComp: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  setUpdatedAt: React.Dispatch<React.SetStateAction<string | null>>
): UseAllCompetitionsResult {
  const [allCompStudents, setAllCompStudents] = useState<Record<string, Student[]>>({});
  const [loadingAllDirs, setLoadingAllDirs] = useState(false);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!needAllCompData) return;

    const pending = competitions.filter(c => !fetchedIdsRef.current.has(c.id));
    if (pending.length === 0) return;

    const controller = new AbortController();
    setLoadingAllDirs(true);

    fetchAllCompetitions(pending, {
      concurrency: 2,
      delayMs: 350,
      signal: controller.signal,
    }).then((map) => {
      const studentsMap: Record<string, Student[]> = {};
      const seatsMap: Record<string, number> = {};
      const updates: string[] = [];
      Object.entries(map).forEach(([compId, data]) => {
        studentsMap[compId] = data.students;
        fetchedIdsRef.current.add(compId);
        if (data.updatedAt) updates.push(data.updatedAt);
        if (data.seats > 0) seatsMap[compId] = data.seats;
      });
      setAllCompStudents((prev) => ({ ...prev, ...studentsMap }));
      setSeatsByComp((prev) => ({ ...prev, ...seatsMap }));
      const latest = updates.sort().pop();
      if (latest) setUpdatedAt(latest);
      setLoadingAllDirs(false);
    }).catch(() => {
      setLoadingAllDirs(false);
    });

    return () => { controller.abort(); };
  }, [needAllCompData, setSeatsByComp, setUpdatedAt]);

  return { allCompStudents, loadingAllDirs };
}
