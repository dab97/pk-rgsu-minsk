import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Search01Icon,
  RefreshIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  PrinterIcon,
  GraduationScrollIcon,
  Alert01Icon,
  ArrowRight01Icon,
  Layers01Icon,
  UserCheck01Icon,
  SparklesIcon,
  Target01Icon,
  BarChartIcon,
  CancelCircleIcon,
  FilterHorizontalIcon,
  LayoutThreeColumnIcon,
  PhoneOff01Icon,
  Upload01Icon,
  Delete02Icon,
} from 'hugeicons-react';
import { Input } from './ui/input';
import { getStatusBadge } from './CompetitionTable';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Competition, Student } from '../types';
import { AccentTheme } from '../constants/theme';
import { competitions, CAMPAIGN_YEAR } from '../data';
import { computePaidEnrollmentAllocation, collectBudgetEnrolled } from '../lib/paidEnrollment';

const TOGGLEABLE_COLS = [
  { key: 'effectiveRank', label: 'Эфф. №' },
  { key: 'examPoints',    label: 'Баллы ВИ' },
  { key: 'subject1',      label: 'Предмет 1' },
  { key: 'subject2',      label: 'Предмет 2' },
  { key: 'subject3',      label: 'Предмет 3' },
  { key: 'achievementPoints', label: 'ИД' },
  { key: 'hasContract',   label: 'Договор' },
  { key: 'semesterPayment', label: 'Оплата' },
  { key: 'applicationStatus', label: 'Статус заявления' },
] as const;
type ColKey = typeof TOGGLEABLE_COLS[number]['key'];
type ColVisibility = Record<ColKey, boolean>;
const DEFAULT_COL_VISIBILITY: ColVisibility = {
  effectiveRank: true, examPoints: true, subject1: true, subject2: true,
  subject3: true, achievementPoints: true, hasContract: true, semesterPayment: true,
  applicationStatus: true,
};

interface PaidListsViewProps {
  allCompStudents: Record<string, Student[]>;
  loading: boolean;
  seatsByComp: Record<string, number>;
  updatedAt?: string | null;
  accent: AccentTheme;
}

export function PaidListsView({
  allCompStudents,
  loading,
  seatsByComp,
  updatedAt,
  accent,
}: PaidListsViewProps) {
  const paidCompetitions = useMemo(() => {
    return competitions.filter((c) => c.basis === 'Платное').map((c) => ({
      ...c,
      seats: seatsByComp[c.id] ?? c.seats,
    }));
  }, [seatsByComp]);

  const [selectedCompId, setSelectedCompId] = useState<string>(
    paidCompetitions[0]?.id || ''
  );
  const [passingOnly, setPassingOnly] = useState<boolean>(false);
  const [hasContractOnly, setHasContractOnly] = useState<boolean>(false);
  const [hasPaymentOnly, setHasPaymentOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<ColVisibility>(DEFAULT_COL_VISIBILITY);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  // ── Phone Refusals (Файл отказов) ──
  const [refusalCodes, setRefusalCodes] = useState<Set<string>>(new Set());
  const [refusalCount, setRefusalCount] = useState<number>(0);
  const [refusalFileName, setRefusalFileName] = useState<string | null>(null);
  const [refusalError, setRefusalError] = useState<string | null>(null);
  const refusalInputRef = useRef<HTMLInputElement>(null);

  const parseRefusalCsv = useCallback((text: string): { codes: Set<string>; count: number } => {
    const codes = new Set<string>();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/[;,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      // Always take column index 1 (ИД)
      const id = parts[1];
      if (!id || !/^\d+$/.test(id)) continue; // skip header or empty
      codes.add(id);
    }
    return { codes, count: codes.size };
  }, []);

  const handleRefusalFile = useCallback((file: File) => {
    setRefusalError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { codes, count } = parseRefusalCsv(text);
        if (count === 0) {
          setRefusalError('Не найдено ни одного кода в файле. Проверьте формат CSV.');
          return;
        }
        setRefusalCodes(codes);
        setRefusalCount(count);
        setRefusalFileName(file.name);
      } catch {
        setRefusalError('Ошибка чтения файла.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [parseRefusalCsv]);

  const clearRefusals = useCallback(() => {
    setRefusalCodes(new Set());
    setRefusalCount(0);
    setRefusalFileName(null);
    setRefusalError(null);
    if (refusalInputRef.current) refusalInputRef.current.value = '';
  }, []);

  const toggleStatus = (s: string) => setStatusFilter(prev => {
    const next = new Set(prev);
    if (next.has(s)) next.delete(s); else next.add(s);
    return next;
  });
  const toggleCol = (key: ColKey) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  const col = (key: ColKey) => visibleCols[key];

  const budgetEnrolledCount = useMemo(() => collectBudgetEnrolled(allCompStudents).count, [allCompStudents]);

  // Calculate allocation across all 6 paid directions taking into account priorities
  const allocationResults = useMemo(() => {
    return computePaidEnrollmentAllocation(paidCompetitions, allCompStudents, {
      paidOnly: hasPaymentOnly,
      contractOnly: hasContractOnly,
      excludeBudgetEnrolled: true,
      refusalCodes: refusalCodes.size > 0 ? refusalCodes : undefined,
    });
  }, [paidCompetitions, allCompStudents, hasPaymentOnly, hasContractOnly, refusalCodes]);

  // Pre-index student applications across paid directions into an O(1) lookup Map
  const studentPaidAppsMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        compId: string;
        compTitle: string;
        studyForm: string;
        priority: number;
        totalPoints: number;
        status: 'passing' | 'withdrawn' | 'in_competition';
        isEnrolledHere: boolean;
      }>
    >();

    paidCompetitions.forEach((c) => {
      const res = allocationResults[c.id];
      if (!res) return;
      const shortName = c.title.split(' — ')[1] || c.title;

      res.items.forEach((item) => {
        const code = item.student.uniqueCode;
        if (!map.has(code)) {
          map.set(code, []);
        }
        map.get(code)!.push({
          compId: c.id,
          compTitle: shortName,
          studyForm: c.studyForm,
          priority: item.student.priority,
          totalPoints: item.student.totalPoints,
          status: item.allocationStatus,
          isEnrolledHere: item.allocationStatus === 'passing',
        });
      });
    });

    map.forEach((apps) => {
      apps.sort((a, b) => a.priority - b.priority);
    });

    return map;
  }, [paidCompetitions, allocationResults]);

  const selectedResult = useMemo(() => {
    return allocationResults[selectedCompId] || null;
  }, [allocationResults, selectedCompId]);

  const availableStatuses = useMemo(() => {
    if (!selectedResult) return [];
    const set = new Set<string>();
    selectedResult.items.forEach(item => { if (item.student.status) set.add(item.student.status); });
    return Array.from(set).sort();
  }, [selectedResult]);

  const filteredItems = useMemo(() => {
    if (!selectedResult) return [];
    let items = selectedResult.items;

    if (passingOnly) {
      items = items.filter((item) => item.allocationStatus === 'passing');
    }
    if (statusFilter.size > 0) {
      items = items.filter((item) => statusFilter.has(item.student.status));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.student.uniqueCode.toLowerCase().includes(q) ||
          item.student.id.toLowerCase().includes(q)
      );
    }

    return items;
  }, [selectedResult, passingOnly, statusFilter, searchQuery]);

  const loadedDirsCount = paidCompetitions.filter((c) => !!allCompStudents[c.id]).length;

  return (
    <div className="flex flex-col">
      {/* ── Unified Hero Banner (matching CompetitionHeroBanner style) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden mb-6">
        <div className="absolute left-0 top-4 bottom-4 sm:top-6 sm:bottom-6 w-1 rounded-r-full bg-amber-500" />
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-amber-500/5 dark:bg-amber-500/10" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pl-1 sm:pl-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-medium tracking-wider uppercase text-amber-600 dark:text-amber-400">
                Каскадный алгоритм зачисления
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                <Layers01Icon className="w-3 h-3 text-slate-400" />
                6 направлений (Платное)
              </span>
              {budgetEnrolledCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/70 px-2.5 py-0.5 rounded-md">
                    <UserCheck01Icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Зачислены на бюджет: {budgetEnrolledCount} (исключены из платного)
                  </span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              Конкурсные списки по высшему приоритету
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal leading-relaxed max-w-3xl">
              Автоматическое выбытие абитуриентов из списков меньших приоритетов при успешном проходе на высший приоритет
            </p>

            {updatedAt ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-3">
                <Clock01Icon className="w-3.5 h-3.5 text-slate-400" />
                Сведения обновлены: {updatedAt}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <PrinterIcon className="w-4 h-4 text-slate-500" />
              Распечатать / PDF
            </button>

            {/* ── Refusal CSV Panel ── */}
            <input
              ref={refusalInputRef}
              id="refusal-csv-input"
              type="file"
              accept=".csv,.txt"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefusalFile(f); }}
            />

            {refusalFileName ? (
              <div className="print:hidden flex items-center gap-2 px-3 h-10 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium shadow-xs max-w-72">
                <PhoneOff01Icon className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="truncate" title={refusalFileName}>{refusalFileName}</span>
                <span className="shrink-0 font-bold tabular-nums text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-md">
                  {refusalCount}
                </span>
                <button
                  type="button"
                  onClick={clearRefusals}
                  title="Убрать файл отказов"
                  className="ml-auto shrink-0 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <Delete02Icon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refusalInputRef.current?.click()}
                className="print:hidden inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
              >
                <Upload01Icon className="w-4 h-4" />
                Файл отказов (.csv)
              </button>
            )}
            {refusalError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{refusalError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Direction Selector Tabs Bar (Equal-width grid columns) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {paidCompetitions.map((comp) => {
          const res = allocationResults[comp.id];
          const passingCount = res?.passingCount || 0;
          const isSelected = selectedCompId === comp.id;
          const shortTitle = comp.title.split(' — ')[1] || comp.title;

          return (
            <button
              key={comp.id}
              onClick={() => setSelectedCompId(comp.id)}
              className={cn(
                "px-3.5 py-3 rounded-2xl transition-all text-left flex flex-col justify-center gap-1 border cursor-pointer min-w-0 w-full",
                isSelected
                  ? "bg-amber-600 border-amber-600 text-white font-semibold shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
              )}
            >
              <div className="text-sm font-semibold leading-snug flex items-center justify-between gap-2">
                <span className="truncate" title={shortTitle}>{shortTitle}</span>
              </div>
              <div
                className={cn(
                  "text-xs font-normal flex items-center gap-1.5 leading-none mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis",
                  isSelected ? "text-amber-100 font-medium" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <span className="truncate">{comp.studyForm}</span>
                <span className="opacity-40 shrink-0">•</span>
                <span className="tabular-nums font-semibold shrink-0">{passingCount}/{comp.seats} мест</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Metric Stats Cards (100% matching StatsCards.tsx style) ── */}
      {selectedResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <BarChartIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Подано заявлений
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                В текущий список
              </p>
            </div>
            <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {selectedResult.totalApps}
            </div>
          </div>

          <div className="bg-amber-600 dark:bg-amber-700 text-white rounded-2xl p-5 border border-amber-500/80 flex flex-col justify-between relative overflow-hidden transition-all shadow-xs">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mb-3">
                <UserCheck01Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider block mb-1 text-amber-100">
                Зачислено / Проходит
              </span>
              <p className="text-xs font-medium mb-3 text-amber-200">
                По высшему приоритету
              </p>
            </div>
            <div className="text-3xl font-semibold text-white tabular-nums relative z-10 flex items-baseline gap-2">
              <span>{selectedResult.passingCount}</span>
              <span className="text-amber-200 text-sm font-normal">из {selectedResult.seats} мест</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Выбыли на высший приор.
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                Освободили места
              </p>
            </div>
            <div className="text-3xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {selectedResult.withdrawnCount}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Target01Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Проходной балл
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                С учетом выбывших
              </p>
            </div>
            <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {selectedResult.passingScore !== null ? selectedResult.passingScore : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Direction Table Section (Flat Header + Single Clean Table Container) */}
      <div id="paid-lists-print-area" className="flex flex-col gap-4">
        {/* Official Document Print Header (Only visible in Print/PDF) */}
        <div className="hidden print:block mb-2 text-slate-900 pb-1.5 border-b border-black">
          <div className="print-doc-sub text-[10px] uppercase tracking-wider font-semibold text-slate-600 mb-1 flex items-center justify-between">
            <span>Филиал РГСУ в г. Минске</span>
            <span>Приёмная комиссия — {CAMPAIGN_YEAR}</span>
          </div>
          <h1 className="print-doc-header text-base font-bold uppercase tracking-tight text-slate-900 mb-1">
            Ранжированный конкурсный список (Платное обучение)
          </h1>
          <div className="print-doc-meta text-sm font-bold text-slate-900 flex items-center justify-between gap-4">
            <span>Направление: <span className="font-bold">{selectedResult ? selectedResult.comp.title : ''} ({selectedResult?.comp.studyForm})</span></span>
            <span className="shrink-0">Количество мест: <span className="font-bold tabular-nums">{selectedResult?.seats}</span></span>
          </div>
        </div>

        {/* Web Header & Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{selectedResult ? selectedResult.comp.title : 'Конкурсный список'}</span>
              {selectedResult && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {selectedResult.comp.studyForm} • {selectedResult.seats} мест
                </Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Официальный ранжированный список по 5 критериям с распределением по высшим приоритетам
            </p>
          </div>

          {/* Controls Toolbar */}
          <div className="flex items-center gap-2.5 print:hidden w-full lg:w-auto">
            {/* Expanded Search Input */}
            <div className="relative flex-1 lg:w-80 lg:flex-initial">
              <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="text"
                placeholder="Поиск по уникальному коду..."
                aria-label="Поиск по уникальному коду"
                className="pl-9 h-10 text-xs sm:text-sm w-full rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:ring-offset-0 focus-visible:border-amber-500 bg-white dark:bg-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown Popover */}
            {(() => {
              const activeFiltersCount = (passingOnly ? 1 : 0) + (hasContractOnly ? 1 : 0) + (hasPaymentOnly ? 1 : 0) + statusFilter.size;
              return (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs select-none",
                      activeFiltersCount > 0
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <FilterHorizontalIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Фильтры</span>
                    {activeFiltersCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums ml-0.5">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-slate-100 dark:border-slate-800 px-2 pt-1">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Фильтры списка</span>
                          {activeFiltersCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPassingOnly(false);
                                setHasContractOnly(false);
                                setHasPaymentOnly(false);
                                setStatusFilter(new Set());
                              }}
                              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Сбросить
                            </button>
                          )}
                        </div>

                        {/* Option 1 */}
                        <label className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none",
                          passingOnly
                            ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/50"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                        )}>
                          <Checkbox
                            id="paid-passing-only"
                            checked={passingOnly}
                            onCheckedChange={(checked) => setPassingOnly(!!checked)}
                            className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0"
                          />
                          <span className="text-sm font-medium leading-snug">Только проходящие</span>
                        </label>

                        {/* Option 2: Contract */}
                        <label className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none",
                          hasContractOnly
                            ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/50"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                        )}>
                          <Checkbox
                            id="paid-contract-only"
                            checked={hasContractOnly}
                            onCheckedChange={(checked) => setHasContractOnly(!!checked)}
                            className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0"
                          />
                          <span className="text-sm font-medium leading-snug">Заключен договор</span>
                        </label>

                        {/* Option 3: Payment */}
                        <label className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none",
                          hasPaymentOnly
                            ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/50"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                        )}>
                          <Checkbox
                            id="paid-payment-only"
                            checked={hasPaymentOnly}
                            onCheckedChange={(checked) => setHasPaymentOnly(!!checked)}
                            className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0"
                          />
                          <span className="text-sm font-medium leading-snug">Только с оплатой</span>
                        </label>
                        {/* Status filter section */}
                        {availableStatuses.length > 0 && (
                          <>
                            <div className="px-2 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 mt-0.5">
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Статус заявления</span>
                            </div>
                            {availableStatuses.map((s) => (
                              <label key={s} className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all select-none",
                                statusFilter.has(s)
                                  ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                                  : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                              )}>
                                <Checkbox
                                  checked={statusFilter.has(s)}
                                  onCheckedChange={() => toggleStatus(s)}
                                  className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0"
                                />
                                <span className="text-sm font-medium leading-snug truncate">{s}</span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Column Visibility Toggle */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs select-none",
                  Object.values(visibleCols).some(v => !v)
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <LayoutThreeColumnIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Колонки</span>
                {Object.values(visibleCols).filter(v => !v).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums ml-0.5">
                    {Object.values(visibleCols).filter(v => !v).length}
                  </span>
                )}
              </button>
              {isColMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsColMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-slate-100 dark:border-slate-800 px-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Показать колонки</span>
                      {Object.values(visibleCols).some(v => !v) && (
                        <button type="button" onClick={() => setVisibleCols(DEFAULT_COL_VISIBILITY)} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Все</button>
                      )}
                    </div>
                    {TOGGLEABLE_COLS.map(({ key, label }) => (
                      <label key={key} className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all select-none",
                        visibleCols[key]
                          ? "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                          : "bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500"
                      )}>
                        <Checkbox
                          checked={visibleCols[key]}
                          onCheckedChange={() => toggleCol(key)}
                          className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0"
                        />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clean Table Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          {loading && loadedDirsCount === 0 ? (
            <div className="flex items-center justify-center p-12 text-sm text-slate-500 gap-2">
              <RefreshIcon className="w-5 h-5 animate-spin text-amber-500" />
              Загрузка конкурсных списков платной формы...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-162.5 sm:min-w-full text-xs">
                <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70">
                  <TableRow>
                    <TableHead className="w-10 text-center py-2.5 px-1.5 text-[11px] leading-tight">№ п/п</TableHead>
                    {col('effectiveRank') && <TableHead className="w-14 text-center py-2.5 px-1.5 text-[11px] leading-tight font-bold">Эфф. №</TableHead>}
                    <TableHead className="py-2.5 px-2 text-[11px] leading-tight min-w-20 print:min-w-0 print:px-1 text-center">Уникальный<br className="hidden print:inline" /> код</TableHead>
                    <TableHead className="w-14 text-center py-2.5 px-1.5 text-[11px] leading-tight">Приоритет</TableHead>
                    <TableHead className="text-center font-bold text-amber-700 dark:text-amber-400 py-2.5 px-2 text-[11px] leading-tight">Сумма баллов</TableHead>
                    {col('examPoints') && <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Баллы ВИ</TableHead>}
                    {col('subject1') && <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 1</TableHead>}
                    {col('subject2') && <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 2</TableHead>}
                    {col('subject3') && <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 3</TableHead>}
                    {col('achievementPoints') && <TableHead className="text-center py-2.5 px-1 text-[11px] leading-tight">ИД</TableHead>}
                    {col('hasContract') && <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Договор</TableHead>}
                    {col('semesterPayment') && <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Оплата</TableHead>}
                    {col('applicationStatus') && <TableHead className="text-center py-2.5 px-2 text-[11px] leading-tight min-w-36 print:min-w-0">Статус заявления</TableHead>}
                    <TableHead className="text-center py-2.5 px-2 text-[11px] leading-tight min-w-44 print:min-w-0">Статус зачисления</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => {
                      const isPassing = item.allocationStatus === 'passing';
                      const isWithdrawn = item.allocationStatus === 'withdrawn';
                      const isLastSeat =
                        selectedResult && item.effectiveRank === selectedResult.seats;

                      const isPriority1 = item.student.priority === 1;
                      const hasPayment =
                        item.student.semesterPayment && item.student.semesterPayment !== 'Нет';
                      const hasContract = item.student.hasContract ?? false;
                      const isPhoneRefusal = refusalCodes.size > 0 && (
                        refusalCodes.has(item.student.uniqueCode) ||
                        refusalCodes.has(item.student.uniqueCode.replace(/\D/g, ''))
                      );

                      return (
                        <TableRow
                          key={`${item.student.id}-${idx}`}
                          className={cn(
                            isPassing && !isPhoneRefusal ? "bg-amber-50/40 dark:bg-amber-950/20" : "",
                            isWithdrawn ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : "",
                            isPhoneRefusal ? "bg-rose-50/50 dark:bg-rose-950/20 opacity-75" : "",
                            isLastSeat ? "border-b-2 border-amber-500 dark:border-amber-600 print:border-b-0" : ""
                          )}
                        >
                          <TableCell className="text-center text-slate-500 tabular-nums font-mono py-2 px-1.5">{item.rawRank}</TableCell>
                          {col('effectiveRank') && (
                            <TableCell className="text-center font-bold tabular-nums py-2 px-1.5">
                              {item.effectiveRank !== null
                                ? <span className={cn(isPassing ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400")}>{item.effectiveRank}</span>
                                : <span className="text-slate-400">—</span>}
                            </TableCell>
                          )}
                          <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100 py-2 px-2 unique-code-cell whitespace-nowrap">{item.student.uniqueCode}</TableCell>
                          <TableCell className="text-center py-2 px-1.5"><span className="text-sm font-bold tabular-nums">{item.student.priority}</span></TableCell>
                          <TableCell className="text-center tabular-nums font-bold text-amber-700 dark:text-amber-300 text-sm py-2 px-2">{item.student.totalPoints}</TableCell>
                          {col('examPoints') && <TableCell className="text-center tabular-nums font-medium text-slate-700 dark:text-slate-300 py-2 px-1.5">{item.student.examPoints}</TableCell>}
                          {col('subject1') && <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">{item.student.subjects[0] ?? '-'}</TableCell>}
                          {col('subject2') && <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">{item.student.subjects[1] ?? '-'}</TableCell>}
                          {col('subject3') && <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">{item.student.subjects[2] ?? '-'}</TableCell>}
                          {col('achievementPoints') && <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">{item.student.achievementPoints}</TableCell>}
                          {col('hasContract') && (
                            <TableCell className="text-center py-2 px-1.5">
                              {hasContract
                                ? <><CheckmarkCircle01Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline print:hidden" /><span className="hidden print:inline text-emerald-700 font-medium">Да</span></>
                                : <><CancelCircleIcon className="w-5 h-5 text-slate-300 dark:text-slate-600 inline print:hidden" /><span className="hidden print:inline text-slate-500">Нет</span></>}
                            </TableCell>
                          )}
                          {col('semesterPayment') && (
                            <TableCell className="text-center py-2 px-1.5">
                              {hasPayment
                                ? <><CheckmarkCircle01Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline print:hidden" /><span className="hidden print:inline text-emerald-700 font-medium">Да</span></>
                                : <><CancelCircleIcon className="w-5 h-5 text-slate-300 dark:text-slate-600 inline print:hidden" /><span className="hidden print:inline text-slate-500">Нет</span></>}
                            </TableCell>
                          )}
                          {col('applicationStatus') && (
                            <TableCell className="py-2 px-2">
                              <div className="flex justify-center">
                                {item.student.status
                                  ? getStatusBadge(item.student.status, accent)
                                  : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-center py-2 px-2">
                            <div className="flex justify-center">
                              {isPhoneRefusal ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80 w-fit">
                                  <PhoneOff01Icon className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                                  <span>Тел. отказ</span>
                                </div>
                              ) : isPassing ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 w-fit">
                                  <CheckmarkCircle01Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Зачислен</span>
                                </div>
                              ) : isWithdrawn ? (
                                item.passedCompTitle ? (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80 w-fit cursor-pointer hover:bg-amber-100/70 transition-colors">
                                          <span>Выбыл (Зачислен на Пр. {item.passedPriority})</span>
                                          <ArrowRight01Icon className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        align="start"
                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-none text-slate-900 dark:text-slate-100 w-72 z-50"
                                      >
                                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                          <span>Приоритеты абитуриента</span>
                                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{item.student.uniqueCode}</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                          {(studentPaidAppsMap.get(item.student.uniqueCode) || []).map((app, appIdx) => (
                                            <div
                                              key={appIdx}
                                              className={cn(
                                                "grid grid-cols-[1.25rem_1fr_2.5rem_1.25rem] items-center gap-2 p-1.5 rounded-xl text-xs border transition-all",
                                                app.isEnrolledHere
                                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-medium"
                                                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                              )}
                                            >
                                              <span
                                                className={cn(
                                                  "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 tabular-nums leading-none",
                                                  app.isEnrolledHere
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                                )}
                                              >
                                                {app.priority}
                                              </span>
                                              <span className="truncate text-[11px] font-medium leading-none flex items-baseline gap-1">
                                                <span>{app.compTitle}</span>
                                                <span className="opacity-50 font-normal text-[10px]">({app.studyForm})</span>
                                              </span>
                                              <span className="text-right text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200 leading-none">
                                                {app.totalPoints}
                                              </span>
                                              <div
                                                className="flex items-center justify-end"
                                                title={
                                                  app.status === 'passing'
                                                    ? 'Зачислен'
                                                    : app.status === 'withdrawn'
                                                      ? 'Выбыл на высший приоритет'
                                                      : 'В конкурсе'
                                                }
                                              >
                                                {app.status === 'passing' ? (
                                                  <CheckmarkCircle01Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                ) : app.status === 'withdrawn' ? (
                                                  <CancelCircleIcon className="w-4 h-4 text-amber-500/80 dark:text-amber-400/80 shrink-0" />
                                                ) : (
                                                  <Clock01Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80 w-fit">
                                    <CancelCircleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span>{item.student.status || 'Не участвует в конкурсе'}</span>
                                  </div>
                                )
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-normal text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 w-fit">
                                  <Clock01Icon className="w-3.5 h-3.5" />
                                  <span>В конкурсе</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5 + Object.values(visibleCols).filter(Boolean).length}>
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                            {searchQuery ? (
                              <Search01Icon className="w-6 h-6" />
                            ) : (
                              <Alert01Icon className="w-6 h-6" />
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                            {searchQuery ? 'Записей не найдено' : 'Нет данных по выбранным фильтрам'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                            Попробуйте сбросить поисковый запрос или ослабить фильтрацию.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
