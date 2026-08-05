import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { matchSorter } from 'match-sorter';
import { AnimatePresence } from 'motion/react';
import { UserIcon, BarChartIcon, GraduationScrollIcon } from 'hugeicons-react';

import { competitions } from './data';
import { getCompetitionPath, fetchCompetitionDataWithRetry, fetchAllCompetitions } from './lib/api';
import { BasisType, ViewType, SortConfig, Student, Competition, DirectionRow } from './types';
import { getAccentTheme } from './constants/theme';

import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CompetitionHeroBanner } from './components/CompetitionHeroBanner';
import { StatsCards } from './components/StatsCards';
import { CompetitionTable } from './components/CompetitionTable';
import { DistributionView } from './components/DistributionView';
import { MyPositionView } from './components/MyPositionView';
import { MyPositionModal } from './components/MyPositionModal';
import { SyncOverlay } from './components/SyncOverlay';

import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';

function AppContent() {
  const [activeBasis, setActiveBasis] = useState<BasisType>('Бюджет');
  const [activeView, setActiveView] = useState<ViewType>('competitions');
  const [selectedCompId, setSelectedCompId] = useState<string>(
    competitions.find(c => c.basis === 'Бюджет')?.id || competitions[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [consentOnly, setConsentOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });
  const [isMyPositionOpen, setIsMyPositionOpen] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const [distributionBasis, setDistributionBasis] = useState<BasisType>('Бюджет');
  const [distributionConsentOnly, setDistributionConsentOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [allCompStudents, setAllCompStudents] = useState<Record<string, Student[]>>({});
  const [seatsByComp, setSeatsByComp] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('rgsu_seats_by_comp');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [loadingAllDirs, setLoadingAllDirs] = useState(false);

  useEffect(() => {
    if (Object.keys(seatsByComp).length > 0) {
      try {
        localStorage.setItem('rgsu_seats_by_comp', JSON.stringify(seatsByComp));
      } catch (err) {
        console.warn('Failed to save seats to localStorage:', err);
      }
    }
  }, [seatsByComp]);

  const myPositionModalRef = useRef<HTMLInputElement | null>(null);

  const seatsOf = useCallback(
    (comp: Competition) => seatsByComp[comp.id] ?? comp.seats,
    [seatsByComp]
  );

  const selectedComp = useMemo(() => {
    const base = competitions.find(c => c.id === selectedCompId) || competitions[0];
    return base ? { ...base, seats: seatsOf(base) } : base;
  }, [selectedCompId, seatsOf]);

  useEffect(() => {
    if (activeView === 'distribution') {
      document.title = 'Мониторинг конкурсных списков РГСУ — Распределение конкурсных баллов';
    } else if (activeView === 'my-position') {
      document.title = 'Мониторинг конкурсных списков РГСУ — Моя позиция в конкурсе';
    } else {
      document.title = `Мониторинг конкурсных списков РГСУ — ${selectedComp.title.replace(' — ', ' ')}`;
    }
  }, [activeView, selectedComp]);

  const filteredCompetitions = useMemo(
    () => competitions.filter(c => c.basis === activeBasis).map(c => ({ ...c, seats: seatsOf(c) })),
    [activeBasis, seatsOf]
  );

  const accent = getAccentTheme(activeBasis);

  useEffect(() => {
    if (!filteredCompetitions.some(c => c.id === selectedCompId)) {
      const next = filteredCompetitions[0];
      if (next) setSelectedCompId(next.id);
    }
  }, [filteredCompetitions, selectedCompId]);

  const syncActive = isLoading || loadingAllDirs;
  const [syncVisible, setSyncVisible] = useState(false);
  const syncStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (syncActive) {
      syncStartRef.current = Date.now();
      setSyncVisible(true);
      return;
    }
    if (syncStartRef.current !== null) {
      const remaining = Math.max(0, 800 - (Date.now() - syncStartRef.current));
      const t = setTimeout(() => setSyncVisible(false), remaining);
      return () => clearTimeout(t);
    }
  }, [syncActive]);

  useEffect(() => {
    async function loadData() {
      const comp = competitions.find(c => c.id === selectedCompId) || competitions[0];
      if (!comp || comp.basis !== activeBasis) {
        setFetchError(null);
        return;
      }
      setIsLoading(true);
      setFetchError(null);
      try {
        const { type: compType, id: compUrlId } = getCompetitionPath(comp.url);
        if (compUrlId) {
          const data = await fetchCompetitionDataWithRetry(compType, compUrlId);
          if (data.students.length > 0) {
            setFetchedStudents(data.students);
            setUpdatedAt(data.updatedAt ?? null);
            if (data.seats > 0) {
              setSeatsByComp((prev) => (prev[comp.id] === data.seats ? prev : { ...prev, [comp.id]: data.seats }));
            }
          } else {
            throw new Error('Данные не найдены');
          }
        }
      } catch (err: any) {
        console.warn('Не удалось загрузить данные. Ошибка:', err.message);
        setFetchError('Сервер РГСУ не ответил или заблокировал запрос. Попробуйте обновить страницу позже.');
        setFetchedStudents([]);
        setUpdatedAt(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedCompId, activeBasis]);

  useEffect(() => {
    if (!isMyPositionOpen) return;
    const id = requestAnimationFrame(() => myPositionModalRef.current?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMyPositionOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMyPositionOpen]);

  const students = fetchedStudents;
  const searchIsCode = /^\d{6,8}$/.test(searchQuery.trim());
  const needAllCompData = searchIsCode || activeView === 'distribution' || activeView === 'my-position';

  useEffect(() => {
    const pending = competitions.filter(c => !allCompStudents[c.id]);
    if (pending.length === 0) return;
    let cancelled = false;
    if (needAllCompData) {
      setLoadingAllDirs(true);
    }
    fetchAllCompetitions(pending, {
      concurrency: 2,
      delayMs: 350,
    }).then((map) => {
      if (cancelled) return;
      const studentsMap: Record<string, Student[]> = {};
      const seatsMap: Record<string, number> = {};
      const updates: string[] = [];
      Object.entries(map).forEach(([compId, data]) => {
        studentsMap[compId] = data.students;
        if (data.updatedAt) updates.push(data.updatedAt);
        if (data.seats > 0) seatsMap[compId] = data.seats;
      });
      setAllCompStudents((prev) => ({ ...prev, ...studentsMap }));
      setSeatsByComp((prev) => ({ ...prev, ...seatsMap }));
      const latest = updates.sort().pop();
      if (latest) setUpdatedAt(latest);
      setLoadingAllDirs(false);
    });
    return () => { cancelled = true; };
  }, [needAllCompData, allCompStudents]);

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleSortKeyDown = (key: keyof Student) => (e: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(key);
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    if (consentOnly) {
      result = activeBasis === 'Бюджет'
        ? result.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
        : result.filter(s => s.hasOriginal);
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
  }, [students, searchQuery, consentOnly, sortConfig]);

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

  const stats = useMemo(() => {
    const totalApps = students.length;
    const originalsCount = students.filter(s => s.hasOriginal).length;
    const seats = selectedComp.seats;
    const competitionRatio = seats > 0 ? (totalApps / seats).toFixed(1) : '0';

    let predictedPassing: number | null = null;

    // Для бюджета используем ВПП (Высший проходной приоритет), для платного — согласие/договор
    const admitted = activeBasis === 'Бюджет'
      ? rankedStudents.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
      : rankedStudents.filter(s => s.hasOriginal);

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
      originalCount: originalsCount,
      originalsCount,
      competitionRatio,
      predictedPassing,
      avgScore,
    };
  }, [students, selectedComp, rankedStudents]);

  const meStudent = useMemo(() => {
    if (!searchIsCode) return null;
    const code = searchQuery.trim();
    return students.find(s => s.uniqueCode === code || s.id === code) || null;
  }, [students, searchQuery, searchIsCode]);

  const meRowHighlight = meStudent ? meStudent.id : null;

  const meAcrossDirections = useMemo<DirectionRow[] | null>(() => {
    if (!searchIsCode) return null;
    const code = searchQuery.trim();

    return competitions.map((comp) => {
      const compList = comp.id === selectedComp.id ? fetchedStudents : allCompStudents[comp.id];

      if (!compList) {
        return { comp, state: 'loading' };
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
        return { comp, state: 'absent' };
      }

      const seats = seatsByComp[comp.id] ?? comp.seats;
      // Для бюджета: ВПП, для платного: согласие
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
        state: 'found',
        rank: idx + 1,
        total: sorted.length,
        points: st.totalPoints,
        hasOriginal: st.hasOriginal,
        isCurrent: comp.id === selectedComp.id,
        priority: st.priority,
        passingScore,
      };
    });
  }, [searchIsCode, searchQuery, competitions, selectedComp, fetchedStudents, allCompStudents]);

  const buckets = useMemo(() => [
    { label: '300–291', low: 291, high: 300 },
    { label: '290–281', low: 281, high: 290 },
    { label: '280–271', low: 271, high: 280 },
    { label: '270–261', low: 261, high: 270 },
    { label: '260–251', low: 251, high: 260 },
    { label: '250–241', low: 241, high: 250 },
    { label: '240–231', low: 231, high: 240 },
    { label: '230–221', low: 221, high: 230 },
    { label: '220–211', low: 211, high: 220 },
    { label: '210–201', low: 201, high: 210 },
    { label: '200–191', low: 191, high: 200 },
    { label: '190–181', low: 181, high: 190 },
    { label: '180–171', low: 171, high: 180 },
    { label: '170–161', low: 161, high: 170 },
    { label: '160–151', low: 151, high: 160 },
    { label: '150–141', low: 141, high: 150 },
    { label: '<140', low: 0, high: 140 },
  ], []);

  const distributionData = useMemo(() => {
    const basisComps = competitions.filter(c => c.basis === distributionBasis).map(c => ({ ...c, seats: seatsOf(c) }));
    return basisComps.map((comp) => {
      const list = comp.id === selectedComp.id ? fetchedStudents : allCompStudents[comp.id];

      if (!list) {
        return {
          comp,
          loaded: false,
          cells: buckets.map(() => 0),
          total: 0,
          passingIdx: -1,
          passingScore: null,
        };
      }

      const filtered = distributionConsentOnly
        ? distributionBasis === 'Бюджет'
          ? list.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
          : list.filter(s => s.hasOriginal)
        : list;
      const sorted = [...filtered].sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
        if (a.examPoints !== b.examPoints) return b.examPoints - a.examPoints;
        for (let j = 0; j < Math.max(a.subjects.length, b.subjects.length); j++) {
          const aSub = a.subjects[j] || 0;
          const bSub = b.subjects[j] || 0;
          if (aSub !== bSub) return bSub - aSub;
        }
        return 0;
      });

      const passingScore = comp.seats > 0 && sorted.length >= comp.seats
        ? sorted[comp.seats - 1].totalPoints
        : sorted.length > 0 ? sorted[sorted.length - 1].totalPoints : null;

      const cells = buckets.map(b => sorted.filter(s => s.totalPoints >= b.low && s.totalPoints <= b.high).length);

      let passingIdx = -1;
      if (passingScore !== null) {
        passingIdx = buckets.findIndex(b => passingScore >= b.low && passingScore <= b.high);
      }

      return {
        comp,
        loaded: true,
        cells,
        total: sorted.length,
        passingIdx,
        passingScore,
      };
    });
  }, [distributionBasis, distributionConsentOnly, competitions, selectedComp, fetchedStudents, allCompStudents, buckets, seatsOf]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      <AnimatePresence>
        {syncVisible && <SyncOverlay />}
      </AnimatePresence>

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeBasis={activeBasis}
        setActiveBasis={setActiveBasis}
        activeView={activeView}
        setActiveView={setActiveView}
        setSearchQuery={setSearchQuery}
        filteredCompetitions={filteredCompetitions}
        selectedCompId={selectedCompId}
        setSelectedCompId={setSelectedCompId}
        accent={accent}
        setDistributionBasis={setDistributionBasis}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeView={activeView}
          filteredCompetitions={filteredCompetitions}
          selectedComp={selectedComp}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1920px] p-3 sm:p-6 lg:p-8 pb-24 sm:pb-6 lg:pb-8">
            {activeView === 'distribution' ? (
              <DistributionView
                rows={distributionData}
                buckets={buckets}
                loading={loadingAllDirs}
                basis={distributionBasis}
                onBasisChange={setDistributionBasis}
                consentOnly={distributionConsentOnly}
                onConsentChange={setDistributionConsentOnly}
                updatedAt={updatedAt}
              />
            ) : activeView === 'my-position' ? (
              <MyPositionView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchIsCode={searchIsCode}
                meStudent={meStudent}
                meAcrossDirections={meAcrossDirections}
                predictedPassing={stats.predictedPassing}
                accent={accent}
                loadingAllDirs={loadingAllDirs}
              />
            ) : (
              <>
                {/* Information Hero Banner (Option 1: Command Center) */}
                <CompetitionHeroBanner
                  selectedComp={selectedComp}
                  activeBasis={activeBasis}
                  accent={accent}
                  updatedAt={updatedAt}
                />

                <StatsCards
                  stats={stats}
                  selectedComp={selectedComp}
                  activeBasis={activeBasis}
                  accent={accent}
                />

                <CompetitionTable
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  consentOnly={consentOnly}
                  setConsentOnly={setConsentOnly}
                  activeBasis={activeBasis}
                  setActiveBasis={setActiveBasis}
                  selectedComp={selectedComp}
                  filteredAndSortedStudents={filteredAndSortedStudents}
                  sortConfig={sortConfig}
                  handleSort={handleSort}
                  handleSortKeyDown={handleSortKeyDown}
                  meRowHighlight={meRowHighlight}
                  fetchError={fetchError}
                  accent={accent}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <MyPositionModal
        isOpen={isMyPositionOpen}
        onClose={() => setIsMyPositionOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchIsCode={searchIsCode}
        meAcrossDirections={meAcrossDirections}
        accent={accent}
        modalInputRef={myPositionModalRef}
      />

      {/* Mobile Bottom Nav */}
      <nav aria-label="Основная навигация" className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          <button
            onClick={() => {
              setActiveView('my-position');
            }}
            aria-current={activeView === 'my-position' ? 'page' : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              activeView === 'my-position'
                ? "text-teal-600 dark:text-teal-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <UserIcon className={cn("w-5 h-5 mb-0.5", activeView === 'my-position' ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400")} />
            Моя позиция
          </button>
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Выбрать направление"
              className="flex flex-col items-center justify-end gap-0.5 pb-2.5 text-[11px] font-medium text-teal-600 dark:text-teal-400"
            >
              <span className="w-12 h-12 rounded-full bg-teal-600 dark:bg-teal-500 text-white shadow-lg shadow-teal-600/40 flex items-center justify-center -translate-y-6 transition-transform active:scale-95">
                <GraduationScrollIcon className="w-6 h-6" />
              </span>
              Направление
            </button>
          </div>
          <button
            onClick={() => { setActiveView('distribution'); setDistributionBasis(activeBasis); }}
            aria-current={activeView === 'distribution' ? 'page' : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              activeView === 'distribution'
                ? "text-teal-600 dark:text-teal-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <BarChartIcon className={cn("w-5 h-5 mb-0.5", activeView === 'distribution' ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400")} />
            Распределение
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rgsu-theme">
      <AppContent />
    </ThemeProvider>
  );
}
