import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rgsu_seats_by_comp';

// Владелец seatsByComp живёт на уровне App: значение пишут и выбранный конкурс
// (useCompetitionData), и загрузка всех направлений (useAllCompetitions)
export function useSeatsByComp() {
  const [seatsByComp, setSeatsByComp] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (Object.keys(seatsByComp).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seatsByComp));
      } catch (err) {
        console.warn('Failed to save seats to localStorage:', err);
      }
    }
  }, [seatsByComp]);

  return [seatsByComp, setSeatsByComp] as const;
}
