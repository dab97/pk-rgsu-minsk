import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { UserIcon, BarChartIcon, GraduationScrollIcon } from 'hugeicons-react';

import { competitions } from './data';
import { BasisType, ViewType, Student, Competition } from './types';
import { getAccentTheme } from './constants/theme';

import { useCompetitionData } from './hooks/useCompetitionData';
import { useAllCompetitions } from './hooks/useAllCompetitions';
import { useStudents } from './hooks/useStudents';
import { useStats } from './hooks/useStats';
import { useMyPosition } from './hooks/useMyPosition';

import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CompetitionHeroBanner } from './components/CompetitionHeroBanner';
import { StatsCards } from './components/StatsCards';
import { CompetitionTable } from './components/CompetitionTable';
import { DistributionView } from './components/DistributionView';
import { MyPositionView } from './components/MyPositionView';
import { PaidListsView } from './components/PaidListsView';
import { MyPositionModal } from './components/MyPositionModal';
import { SyncOverlay } from './components/SyncOverlay';

import { cn } from './lib/utils';

function AppContent() {
  const [activeBasis, setActiveBasis] = useState<BasisType>('Бюджет');
  const [activeView, setActiveView] = useState<ViewType>('competitions');
  const [selectedCompId, setSelectedCompId] = useState<string>(
    competitions.find(c => c.basis === 'Бюджет')?.id || competitions[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [consentOnly, setConsentOnly] = useState(false);
  const [isMyPositionOpen, setIsMyPositionOpen] = useState(false);

  const [distributionBasis, setDistributionBasis] = useState<BasisType>('Бюджет');
  const [distributionConsentOnly, setDistributionConsentOnly] = useState(false);
  const [distributionExcludeBudget, setDistributionExcludeBudget] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const myPositionModalRef = useRef<HTMLInputElement | null>(null);

  const {
    students: fetchedStudents,
    updatedAt,
    setUpdatedAt,
    isLoading,
    fetchError,
    seatsByComp,
    setSeatsByComp,
  } = useCompetitionData(selectedCompId, activeBasis);

  const seatsOf = useCallback(
    (comp: Competition) => seatsByComp[comp.id] ?? comp.seats,
    [seatsByComp]
  );

  const selectedComp = useMemo(() => {
    const base = competitions.find(c => c.id === selectedCompId) || competitions[0];
    return base ? { ...base, seats: seatsOf(base) } : base;
  }, [selectedCompId, seatsOf]);

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

  const searchIsCode = /^\d{6,8}$/.test(searchQuery.trim());
  const needAllCompData = searchIsCode || activeView === 'distribution' || activeView === 'my-position' || activeView === 'paid-lists';

  const { allCompStudents, loadingAllDirs } = useAllCompetitions(
    needAllCompData,
    setSeatsByComp,
    setUpdatedAt
  );

  const budgetEnrolledCodes = useMemo(() => {
    const codes = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.basis === 'Бюджет') {
        const bStudents = allCompStudents[comp.id] || [];
        bStudents.forEach((s) => {
          const code = s.uniqueCode || s.id;
          if (code && code !== '-') {
            codes.add(code);
            const norm = code.replace(/\D/g, '') || code.trim();
            if (norm) codes.add(norm);
          }
        });
      }
    });
    return codes;
  }, [allCompStudents]);

  const budgetEnrolledCount = useMemo(() => {
    const normCodes = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.basis === 'Бюджет') {
        const bStudents = allCompStudents[comp.id] || [];
        bStudents.forEach((s) => {
          const code = s.uniqueCode || s.id;
          if (code && code !== '-') {
            const norm = code.replace(/\D/g, '') || code.trim();
            normCodes.add(norm);
          }
        });
      }
    });
    return normCodes.size;
  }, [allCompStudents]);

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
    if (activeView === 'distribution') {
      document.title = 'Мониторинг конкурсных списков РГСУ — Распределение конкурсных баллов';
    } else if (activeView === 'my-position') {
      document.title = 'Мониторинг конкурсных списков РГСУ — Моя позиция в конкурсе';
    } else if (activeView === 'paid-lists') {
      document.title = 'Мониторинг конкурсных списков РГСУ — Списки по платному';
    } else {
      document.title = `Мониторинг конкурсных списков РГСУ — ${selectedComp.title.replace(' — ', ' ')}`;
    }
  }, [activeView, selectedComp]);

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

  const {
    filteredAndSortedStudents,
    rankedStudents,
    sortConfig,
    handleSort,
    handleSortKeyDown,
  } = useStudents(fetchedStudents, searchQuery, consentOnly, activeBasis);

  const { stats } = useStats(fetchedStudents, selectedComp, rankedStudents, activeBasis);

  const { meStudent, meAcrossDirections } = useMyPosition(
    searchIsCode,
    searchQuery,
    selectedComp,
    fetchedStudents,
    allCompStudents,
    seatsByComp
  );

  const meRowHighlight = meStudent ? meStudent.id : null;

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

      let baseList = list;
      if (distributionBasis === 'Платное' && distributionExcludeBudget && budgetEnrolledCodes.size > 0) {
        baseList = baseList.filter((s) => {
          const code = s.uniqueCode || s.id;
          if (!code) return true;
          const norm = code.replace(/\D/g, '') || code.trim();
          return !budgetEnrolledCodes.has(code) && !budgetEnrolledCodes.has(norm);
        });
      }

      const filtered = distributionConsentOnly
        ? distributionBasis === 'Бюджет'
          ? baseList.filter(s => s.higherPassingPriority !== '-' && s.higherPassingPriority !== 'Нет')
          : baseList.filter(s => s.hasOriginal || s.hasContract)
        : baseList;
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
  }, [distributionBasis, distributionConsentOnly, distributionExcludeBudget, budgetEnrolledCodes, selectedComp, fetchedStudents, allCompStudents, buckets, seatsOf]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      <AnimatePresence>
        {syncVisible && <SyncOverlay isPaidLists={activeView === 'paid-lists'} />}
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
                excludeBudget={distributionExcludeBudget}
                onExcludeBudgetChange={setDistributionExcludeBudget}
                budgetEnrolledCount={budgetEnrolledCount}
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
            ) : activeView === 'paid-lists' ? (
              <PaidListsView
                allCompStudents={allCompStudents}
                loading={loadingAllDirs}
                seatsByComp={seatsByComp}
                updatedAt={updatedAt}
                accent={accent}
              />
            ) : (
              <>
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
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] sm:text-[11px] font-medium transition-colors",
              activeView === 'distribution'
                ? "text-teal-600 dark:text-teal-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <BarChartIcon className={cn("w-5 h-5 mb-0.5", activeView === 'distribution' ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400")} />
            Распределение
          </button>
          <button
            onClick={() => { setActiveView('paid-lists'); }}
            aria-current={activeView === 'paid-lists' ? 'page' : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] sm:text-[11px] font-medium transition-colors",
              activeView === 'paid-lists'
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <GraduationScrollIcon className={cn("w-5 h-5 mb-0.5", activeView === 'paid-lists' ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400")} />
            Списки платного
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
