import React, { useState, useMemo } from 'react';
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
} from 'hugeicons-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Competition, Student } from '../types';
import { AccentTheme } from '../constants/theme';
import { competitions } from '../data';
import { computePaidEnrollmentAllocation } from '../lib/paidEnrollment';

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
}: PaidListsViewProps) {
  const paidCompetitions = useMemo(() => {
    return competitions.filter((c) => c.basis === 'Платное').map((c) => ({
      ...c,
      seats: seatsByComp[c.id] ?? c.seats,
    }));
  }, [seatsByComp]);

  const [selectedCompId, setSelectedCompId] = useState<string>(
    paidCompetitions[0]?.id || 'psychology-fulltime-contract'
  );
  const [passingOnly, setPassingOnly] = useState<boolean>(false);
  const [hasPaymentOnly, setHasPaymentOnly] = useState<boolean>(false);
  const [hasOriginalOnly, setHasOriginalOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate allocation across all 6 paid directions taking into account priorities
  const allocationResults = useMemo(() => {
    return computePaidEnrollmentAllocation(paidCompetitions, allCompStudents, {
      paidOnly: hasPaymentOnly,
      originalOnly: hasOriginalOnly,
    });
  }, [paidCompetitions, allCompStudents, hasPaymentOnly, hasOriginalOnly]);

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

  const filteredItems = useMemo(() => {
    if (!selectedResult) return [];
    let items = selectedResult.items;

    if (passingOnly) {
      items = items.filter((item) => item.allocationStatus === 'passing');
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
  }, [selectedResult, passingOnly, searchQuery]);

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

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <PrinterIcon className="w-4 h-4 text-slate-500" />
              Распечатать / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Direction Selector Tabs Bar (Clean flat horizontal row) ── */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mb-6 pb-1">
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
                "px-4.5 py-3 rounded-2xl transition-all text-left shrink-0 flex flex-col justify-center gap-1 border cursor-pointer min-w-44",
                isSelected
                  ? "bg-amber-600 border-amber-600 text-white font-semibold"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
              )}
            >
              <div className="text-sm font-semibold leading-snug flex items-center justify-between gap-2">
                <span className="truncate">{shortTitle}</span>
              </div>
              <div
                className={cn(
                  "text-xs font-normal flex items-center gap-1.5 leading-none mt-0.5",
                  isSelected ? "text-amber-100 font-medium" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <span>{comp.studyForm}</span>
                <span className="opacity-40">•</span>
                <span className="tabular-nums font-semibold">{passingCount}/{comp.seats} мест</span>
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

      {/* Dedicated Direction Table Card */}
      <Card id="paid-lists-print-area" className="flex flex-col flex-1 shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 print:pb-3 print:border-none print:p-0">
          {/* Official Document Print Header (Only visible in Print/PDF) */}
          <div className="hidden print:block mb-3 text-slate-900">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Филиал РГСУ в г. Минске</span>
              <span>Приёмная комиссия — 2026</span>
            </div>
            <h1 className="text-base font-bold uppercase tracking-tight text-slate-900">
              Ранжированный конкурсный список (Платное обучение)
            </h1>
            <div className="text-xs font-medium text-slate-800 mt-1 flex items-center justify-between">
              <span>Направление: <strong>{selectedResult ? selectedResult.comp.title : ''} ({selectedResult?.comp.studyForm})</strong></span>
              <span>Количество мест: <strong>{selectedResult?.seats}</strong></span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <span>{selectedResult ? selectedResult.comp.title : 'Конкурсный список'}</span>
                {selectedResult && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {selectedResult.comp.studyForm} • {selectedResult.seats} мест
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Официальный ранжированный список по 5 критериям с распределением по высшим приоритетам
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Поиск по СНИЛС / коду..."
                  aria-label="Поиск по условному коду"
                  className="pl-9 h-10 text-xs sm:text-sm w-full rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:ring-offset-0 focus-visible:border-amber-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Passing only checkbox */}
              <div
                className={cn(
                  "flex items-center space-x-2 px-3 h-10 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer",
                  passingOnly
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <Checkbox
                  id="paid-passing-only"
                  checked={passingOnly}
                  onCheckedChange={(checked) => setPassingOnly(!!checked)}
                  className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <Label htmlFor="paid-passing-only" className="cursor-pointer text-xs sm:text-sm font-medium whitespace-nowrap">
                  Только проходящие
                </Label>
              </div>

              {/* Has payment checkbox */}
              <div
                className={cn(
                  "flex items-center space-x-2 px-3 h-10 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer",
                  hasPaymentOnly
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <Checkbox
                  id="paid-payment-only"
                  checked={hasPaymentOnly}
                  onCheckedChange={(checked) => setHasPaymentOnly(!!checked)}
                  className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <Label htmlFor="paid-payment-only" className="cursor-pointer text-xs sm:text-sm font-medium whitespace-nowrap">
                  Только с оплатой
                </Label>
              </div>

              {/* Has original checkbox */}
              <div
                className={cn(
                  "flex items-center space-x-2 px-3 h-10 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer",
                  hasOriginalOnly
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <Checkbox
                  id="paid-original-only"
                  checked={hasOriginalOnly}
                  onCheckedChange={(checked) => setHasOriginalOnly(!!checked)}
                  className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <Label htmlFor="paid-original-only" className="cursor-pointer text-xs sm:text-sm font-medium whitespace-nowrap">
                  Оригинал
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
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
                    <TableHead className="w-14 text-center py-2.5 px-1.5 text-[11px] leading-tight font-bold">Эфф. №</TableHead>
                    <TableHead className="py-2.5 px-2 text-[11px] leading-tight min-w-24 print:min-w-0">Уникальный код</TableHead>
                    <TableHead className="w-14 text-center py-2.5 px-1.5 text-[11px] leading-tight">Приоритет</TableHead>
                    <TableHead className="text-center font-bold text-amber-700 dark:text-amber-400 py-2.5 px-2 text-[11px] leading-tight">
                      Сумма баллов
                    </TableHead>
                    <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Баллы ВИ</TableHead>
                    <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 1</TableHead>
                    <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 2</TableHead>
                    <TableHead className="text-center text-slate-500 py-2.5 px-1 text-[11px] leading-tight">Предмет 3</TableHead>
                    <TableHead className="text-center py-2.5 px-1 text-[11px] leading-tight">ИД</TableHead>
                    <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Оригинал</TableHead>
                    <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Договор</TableHead>
                    <TableHead className="text-center py-2.5 px-1.5 text-[11px] leading-tight">Оплата</TableHead>
                    <TableHead className="text-left py-2.5 px-2 text-[11px] leading-tight min-w-44 print:min-w-0">Статус зачисления</TableHead>
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
                      const hasContract = item.student.hasContract ?? (hasPayment || false);

                      return (
                        <TableRow
                          key={`${item.student.id}-${idx}`}
                          className={cn(
                            isPassing ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "",
                            isWithdrawn ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : "",
                            isLastSeat ? "border-b-2 border-emerald-500 dark:border-emerald-600" : ""
                          )}
                        >
                          <TableCell className="text-center text-slate-500 tabular-nums font-mono py-2 px-1.5">
                            {item.rawRank}
                          </TableCell>
                          <TableCell className="text-center font-bold tabular-nums py-2 px-1.5">
                            {item.effectiveRank !== null ? (
                              <span className={cn(isPassing ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400")}>
                                {item.effectiveRank}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-slate-900 dark:text-slate-100 py-2 px-2">
                            {item.student.uniqueCode}
                          </TableCell>
                          <TableCell className="text-center py-2 px-1.5">
                            <div className="flex justify-center">
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-lg inline-flex items-center justify-center text-xs font-bold tabular-nums transition-all",
                                  isPriority1
                                    ? "bg-amber-500 text-white dark:bg-amber-600 shadow-xs"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {item.student.priority}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center tabular-nums font-bold text-amber-700 dark:text-amber-300 text-sm py-2 px-2">
                            {item.student.totalPoints}
                          </TableCell>
                          <TableCell className="text-center tabular-nums font-medium text-slate-700 dark:text-slate-300 py-2 px-1.5">
                            {item.student.examPoints}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">
                            {item.student.subjects[0] ?? '-'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">
                            {item.student.subjects[1] ?? '-'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">
                            {item.student.subjects[2] ?? '-'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-600 dark:text-slate-400 py-2 px-1">
                            {item.student.achievementPoints}
                          </TableCell>
                          <TableCell className="text-center py-2 px-1.5">
                            {item.student.hasOriginal ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                Оригинал
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Копия</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2 px-1.5">
                            {hasContract ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-medium">
                                Заключен
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Нет</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2 px-1.5">
                            {hasPayment ? (
                              <Badge variant="outline" className="bg-emerald-600 text-white border-0 text-[10px] px-2 py-0.5 font-medium">
                                {item.student.semesterPayment}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Не оплачено</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left py-2 px-2">
                            {isPassing ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 w-fit">
                                <CheckmarkCircle01Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Зачислен</span>
                              </div>
                            ) : isWithdrawn ? (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80 w-fit cursor-pointer hover:bg-amber-100/70 transition-colors">
                                      <span>Выбыл (Зачислен на Пр. {item.passedPriority})</span>
                                      {item.passedCompTitle && (
                                        <ArrowRight01Icon className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                      )}
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
                                            {/* Col 1: Priority */}
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

                                            {/* Col 2: Title & Form */}
                                            <span className="truncate text-[11px] font-medium leading-none flex items-baseline gap-1">
                                              <span>{app.compTitle}</span>
                                              <span className="opacity-50 font-normal text-[10px]">({app.studyForm})</span>
                                            </span>

                                            {/* Col 3: Points */}
                                            <span className="text-right text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200 leading-none">
                                              {app.totalPoints}
                                            </span>

                                            {/* Col 4: Status Icon */}
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
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-normal text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 w-fit">
                                <Clock01Icon className="w-3.5 h-3.5" />
                                <span>В конкурсе</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13}>
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
        </CardContent>
      </Card>
    </div>
  );
}
