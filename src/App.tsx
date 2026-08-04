import React, { useState, useMemo, useEffect, useRef } from 'react';
import { matchSorter } from 'match-sorter';
import { AnimatePresence } from 'motion/react';
import { UserIcon, BarChartIcon, GraduationScrollIcon } from 'hugeicons-react';

import { competitions } from './data';
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

function getCompetitionPath(url: string) {
  const [, path] = url.split('pk.rgsu.net/');
  const [type, id] = (path || 'competition/').split('/');
  return { type: type || 'competition', id: id || '' };
}

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
  const [loadingAllDirs, setLoadingAllDirs] = useState(false);

  const myPositionModalRef = useRef<HTMLInputElement | null>(null);

  const selectedComp = useMemo(
    () => competitions.find(c => c.id === selectedCompId) || competitions[0],
    [selectedCompId]
  );

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
    () => competitions.filter(c => c.basis === activeBasis),
    [activeBasis]
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
      if (selectedComp.basis !== activeBasis) {
        setFetchError(null);
        return;
      }
      setIsLoading(true);
      setFetchError(null);
      try {
        const { type: compType, id: compUrlId } = getCompetitionPath(selectedComp.url);
        if (compUrlId) {
          const res = await fetch(`/api/competition/${compType}/${compUrlId}`);
          if (!res.ok) throw new Error('Не удалось загрузить данные');
          const result = await res.json();
          if (result.success && result.data && result.data.length > 0) {
            setFetchedStudents(result.data);
            setUpdatedAt(result.updatedAt ?? null);
          } else if (result.success && result.data.length === 0) {
            throw new Error('Данные не найдены');
          } else {
            throw new Error(result.error || 'Ошибка загрузки');
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
  }, [selectedComp, activeBasis]);

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
    if (!needAllCompData) return;
    const pending = competitions.filter(c => !allCompStudents[c.id]);
    if (pending.length === 0) return;
    let cancelled = false;
    setLoadingAllDirs(true);
    Promise.allSettled(
      pending.map(async (comp) => {
        const { type: compType, id: compUrlId } = getCompetitionPath(comp.url);
        const res = await fetch(`/api/competition/${compType}/${compUrlId}`);
        if (!res.ok) throw new Error('Failed to load');
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data)) throw new Error('Bad data');
        return { compId: comp.id, students: result.data as Student[] };
      })
    ).then((results) => {
      if (cancelled) return;
      setAllCompStudents((prev) => {
        const map = { ...prev };
        results.forEach((r) => { if (r.status === 'fulfilled') map[r.value.compId] = r.value.students; });
        return map;
      });
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
      result = result.filter(s => s.hasOriginal);
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

    const admittedWithOriginals = rankedStudents.filter(s => s.hasOriginal);
    if (admittedWithOriginals.length >= seats && seats > 0) {
      predictedPassing = admittedWithOriginals[seats - 1].totalPoints;
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

      const st = sorted[idx];
      return {
        comp,
        state: 'found',
        rank: idx + 1,
        total: sorted.length,
        points: st.totalPoints,
        hasOriginal: st.hasOriginal,
        isCurrent: comp.id === selectedComp.id,
      };
    });
  }, [searchIsCode, searchQuery, competitions, selectedComp, fetchedStudents, allCompStudents]);

  const buckets = useMemo(() => [
    { label: '300–280', low: 280, high: 300 },
    { label: '279–260', low: 260, high: 279 },
    { label: '259–240', low: 240, high: 259 },
    { label: '239–220', low: 220, high: 239 },
    { label: '219–200', low: 200, high: 219 },
    { label: '199–180', low: 180, high: 199 },
    { label: '179–160', low: 160, high: 179 },
    { label: '159–140', low: 140, high: 159 },
    { label: '<140', low: 0, high: 139 },
  ], []);

  const distributionData = useMemo(() => {
    const basisComps = competitions.filter(c => c.basis === distributionBasis);
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

      const filtered = distributionConsentOnly ? list.filter(s => s.hasOriginal) : list;
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
  }, [distributionBasis, distributionConsentOnly, competitions, selectedComp, fetchedStudents, allCompStudents, buckets]);

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
