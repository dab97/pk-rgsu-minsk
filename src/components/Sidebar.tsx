import React from 'react';
import { GraduationScrollIcon, CancelCircleIcon, BarChartIcon, UserIcon } from 'hugeicons-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Competition, BasisType, ViewType } from '../types';
import { AccentTheme } from '../constants/theme';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeBasis: BasisType;
  setActiveBasis: (basis: BasisType) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  setSearchQuery: (query: string) => void;
  filteredCompetitions: Competition[];
  selectedCompId: string;
  setSelectedCompId: (id: string) => void;
  accent: AccentTheme;
  setDistributionBasis: (basis: BasisType) => void;
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeBasis,
  setActiveBasis,
  activeView,
  setActiveView,
  setSearchQuery,
  filteredCompetitions,
  selectedCompId,
  setSelectedCompId,
  accent,
  setDistributionBasis,
}: SidebarProps) {

  const directionsList = (
    <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
      <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Направления</h2>
      {filteredCompetitions.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          Пока нет направлений по основе «{activeBasis}». Добавьте их в <code className="text-[10px]">src/data.ts</code>.
        </p>
      ) : (
        filteredCompetitions.map((comp) => (
          <button
            key={comp.id}
            onClick={() => {
              setSelectedCompId(comp.id);
              setSearchQuery('');
              setActiveView('competitions');
              setSidebarOpen(false);
            }}
            className={cn(
              "w-full text-left p-2.5 rounded-lg text-xs transition-all border",
              activeView === 'competitions' && selectedCompId === comp.id
                ? accent.sidebarActive
                : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
          >
            <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{comp.title}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{comp.subtitle}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-700 font-normal">{comp.studyForm}</Badge>
              <Badge variant="outline" className={cn(accent.badge, "text-[10px] px-1.5 py-0 font-medium")}>{comp.seats} мест</Badge>
            </div>
          </button>
        ))
      )}
    </div>
  );

  const basisTabs = (
    <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800">
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => { setActiveBasis('Бюджет'); setActiveView('competitions'); setSearchQuery(''); }}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
            activeBasis === 'Бюджет' && activeView === 'competitions'
              ? "bg-white text-teal-700 dark:bg-slate-900 dark:text-teal-300 shadow-xs font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          Бюджет
        </button>
        <button
          onClick={() => { setActiveBasis('Платное'); setActiveView('competitions'); setSearchQuery(''); }}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
            activeBasis === 'Платное' && activeView === 'competitions'
              ? "bg-white text-amber-700 dark:bg-slate-900 dark:text-amber-300 shadow-xs font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          Платное
        </button>
      </div>
    </div>
  );

  const mobileNavItems = (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-1.5 bg-slate-50/40 dark:bg-slate-900/40 shrink-0">
      <button
        onClick={() => { setActiveView('my-position'); setSidebarOpen(false); }}
        className={cn(
          "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer",
          activeView === 'my-position'
            ? "bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-800/60 shadow-xs"
            : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
          activeView === 'my-position'
            ? "bg-teal-600 text-white shadow-xs"
            : "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40"
        )}>
          <UserIcon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">Моя позиция</span>
      </button>

      <button
        onClick={() => { setActiveView('distribution'); setDistributionBasis(activeBasis); setSidebarOpen(false); }}
        className={cn(
          "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer",
          activeView === 'distribution'
            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/60 shadow-xs"
            : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
          activeView === 'distribution'
            ? "bg-amber-500 text-white shadow-xs"
            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
        )}>
          <BarChartIcon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">Распределение</span>
      </button>

      <button
        onClick={() => { setActiveView('paid-lists'); setSidebarOpen(false); }}
        className={cn(
          "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer",
          activeView === 'paid-lists'
            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/60 shadow-xs"
            : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
          activeView === 'paid-lists'
            ? "bg-amber-600 text-white shadow-xs"
            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
        )}>
          <GraduationScrollIcon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">Списки платного</span>
      </button>
    </div>
  );

  const navItems = (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/40 dark:bg-slate-900/40">
      <button
        onClick={() => { setActiveView('my-position'); setSidebarOpen(false); }}
        className={cn(
          "w-full flex items-center justify-start gap-3 p-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border text-left cursor-pointer",
          activeView === 'my-position'
            ? "bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-800/60 shadow-xs text-slate-900 dark:text-slate-100"
            : "bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          activeView === 'my-position'
            ? "bg-teal-600 text-white shadow-xs"
            : "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40"
        )}>
          <UserIcon className="w-4 h-4" />
        </div>
        <span className="truncate">Моя позиция в конкурсе</span>
      </button>

      <button
        onClick={() => { setActiveView('distribution'); setDistributionBasis(activeBasis); setSidebarOpen(false); }}
        className={cn(
          "w-full flex items-center justify-start gap-3 p-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border text-left cursor-pointer",
          activeView === 'distribution'
            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/60 shadow-xs text-slate-900 dark:text-slate-100"
            : "bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          activeView === 'distribution'
            ? "bg-amber-500 text-white shadow-xs"
            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
        )}>
          <BarChartIcon className="w-4 h-4" />
        </div>
        <span className="truncate">Распределение баллов</span>
      </button>

      <button
        onClick={() => { setActiveView('paid-lists'); setSidebarOpen(false); }}
        className={cn(
          "w-full flex items-center justify-start gap-3 p-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border text-left cursor-pointer",
          activeView === 'paid-lists'
            ? "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/60 shadow-xs text-slate-900 dark:text-slate-100"
            : "bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          activeView === 'paid-lists'
            ? "bg-amber-600 text-white shadow-xs"
            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
        )}>
          <GraduationScrollIcon className="w-4 h-4" />
        </div>
        <span className="truncate">Списки по платному</span>
      </button>
    </div>
  );

  return (
    <>
      {/* ── MOBILE: Bottom Sheet ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 md:hidden flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out",
          "max-h-[85dvh]",
          sidebarOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        {/* Sheet header */}
        <div className="py-2 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 font-semibold text-base">
            <GraduationScrollIcon className="w-5 h-5 text-teal-600" />
            <span>Приемная комиссия</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <CancelCircleIcon className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
        {basisTabs}
        <div className="flex-1 overflow-y-auto min-h-0">
          {directionsList}
        </div>
        {mobileNavItems}
        {/* Safe area bottom padding */}
        <div className="h-[env(safe-area-inset-bottom)] shrink-0" />
      </div>

      {/* ── DESKTOP: Side Drawer ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shrink-0 flex-col w-80 md:relative">
        <div className="py-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center space-x-2 font-semibold text-base">
            <GraduationScrollIcon className="w-5 h-5 text-teal-600" />
            <span>Приемная комиссия</span>
          </div>
        </div>
        {basisTabs}
        {directionsList}
        {navItems}
      </aside>
    </>
  );
}
