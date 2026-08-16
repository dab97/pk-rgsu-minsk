import React, { useState, useMemo } from 'react';
import {
  Search01Icon,
  ArrowUpDownIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Clock01Icon,
  Alert01Icon,
  GraduationScrollIcon,
  FilterHorizontalIcon,
  LayoutThreeColumnIcon,
} from 'hugeicons-react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Student, Competition, BasisType, SortConfig } from '../types';
import { AccentTheme } from '../constants/theme';

interface CompetitionTableProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  consentOnly: boolean;
  setConsentOnly: (consent: boolean) => void;
  activeBasis: BasisType;
  setActiveBasis: (basis: BasisType) => void;
  selectedComp: Competition;
  filteredAndSortedStudents: Student[];
  /** Официальный номер в рейтинге (id → №), без влияния фильтров/поиска */
  rankById: Map<string, number>;
  /** Эффективное место (id → №) с пропуском выбывших и зачисленных на бюджет */
  passingRankById: Map<string, number>;
  /** Скрыть зачисленных на бюджет (только платная основа) */
  hideBudgetEnrolled: boolean;
  setHideBudgetEnrolled: (hide: boolean) => void;
  sortConfig: SortConfig;
  handleSort: (key: keyof Student) => void;
  meRowHighlight?: string | null;
  fetchError: string | null;
  accent: AccentTheme;
}

function SortableTableHead({
  label,
  sortKey,
  sortConfig,
  onSort,
  accent,
  className,
}: {
  label: string;
  sortKey: keyof Student;
  sortConfig: SortConfig;
  onSort: (key: keyof Student) => void;
  accent: AccentTheme;
  className?: string;
}) {
  const isActive = sortConfig.key === sortKey;
  return (
    <TableHead
      className={cn("leading-tight", className)}
      aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title="Сортировать"
        className="flex flex-wrap items-center justify-center gap-x-1 w-full cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
      >
        <span>{label}</span>
        {isActive && (
          <ArrowUpDownIcon className={cn("w-3 h-3", sortConfig.direction === 'desc' ? accent.sortIcon : cn(accent.sortIcon, "rotate-180"))} />
        )}
      </button>
    </TableHead>
  );
}

export function getStatusBadge(status: string, accent: AccentTheme) {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  if (s.startsWith('зачислен на бюджет')) {
    return (
      <Badge variant="success" className="bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/80">
        <CheckmarkCircle01Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  if (s === 'зачислен' || s.startsWith('зачислен')) {
    return (
      <Badge variant="success" className={accent.successBadge}>
        <CheckmarkCircle01Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  if (s.includes('отказ') || s.includes('отклонен') || s.includes('отозван') || s.includes('забрал')) {
    return (
      <Badge variant="destructive">
        <CancelCircleIcon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  if (s.includes('в конкурсе') || s.includes('конкурс')) {
    return (
      <Badge variant="secondary">
        <Clock01Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  // Прочие статусы — нейтральный badge
  return (
    <Badge variant="secondary">
      {status}
    </Badge>
  );
}

export function CompetitionTable({
  searchQuery,
  setSearchQuery,
  consentOnly,
  setConsentOnly,
  activeBasis,
  setActiveBasis,
  selectedComp,
  filteredAndSortedStudents,
  rankById,
  passingRankById,
  hideBudgetEnrolled,
  setHideBudgetEnrolled,
  sortConfig,
  handleSort,
  meRowHighlight,
  fetchError,
  accent,
}: CompetitionTableProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const toggleStatus = (s: string) => setStatusFilter(prev => {
    const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next;
  });
  const toggleCol = (k: string) => setHiddenCols(prev => {
    const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k); return next;
  });
  const show = (k: string) => !hiddenCols.has(k);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    filteredAndSortedStudents.forEach(s => { if (s.status) set.add(s.status); });
    return Array.from(set).sort();
  }, [filteredAndSortedStudents]);

  const visibleStudents = useMemo(() =>
    statusFilter.size > 0
      ? filteredAndSortedStudents.filter(s => statusFilter.has(s.status))
      : filteredAndSortedStudents,
  [filteredAndSortedStudents, statusFilter]);

  const COLS = [
    { key: 'examPoints', label: 'Баллы ВИ' },
    { key: 'subjects', label: 'Предметы 1–3' },
    { key: 'achievementPoints', label: 'ИД' },
    { key: 'consentContract', label: 'Согласие/Договор' },
    { key: 'semesterPayment', label: 'Оплата' },
    { key: 'priority', label: 'Приоритет' },
    { key: 'higherPriority', label: 'Высшие приоритеты (бюджет)' },
    { key: 'preemptive', label: 'Преим. права' },
    { key: 'idEquality', label: 'ИД при равенстве' },
    { key: 'withoutExams', label: 'Без вступ. испытаний' },
    { key: 'basisBVI', label: 'Основание БВИ' },
  ] as const;

  const activeFilters = statusFilter.size;
  const hiddenCount = hiddenCols.size;

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Flat Header Toolbar (matching DistributionView pattern) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Конкурсный список
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder="Поиск по уникальному коду..."
              aria-label="Поиск по уникальному коду"
              className="pl-9 w-full bg-white dark:bg-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div
            className={cn(
              "flex items-center space-x-2 px-3 h-10 rounded-xl border w-full sm:w-auto transition-colors",
              consentOnly
                ? cn(accent.cardBorder, accent.pillBg)
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}
          >
            <Checkbox
              id="consent-only"
              checked={consentOnly}
              onCheckedChange={(checked) => setConsentOnly(!!checked)}
              className={accent.checkbox}
            />
            <Label htmlFor="consent-only" className={cn("cursor-pointer text-sm font-medium", accent.text)}>
              {activeBasis === 'Бюджет' ? 'Высший проходной приоритет' : 'С договором'}
            </Label>
          </div>

          {activeBasis === 'Платное' && (
            <div
              className={cn(
                "flex items-center space-x-2 px-3 h-10 rounded-xl border w-full sm:w-auto transition-colors",
                hideBudgetEnrolled
                  ? cn(accent.cardBorder, accent.pillBg)
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}
            >
              <Checkbox
                id="hide-budget-enrolled"
                checked={hideBudgetEnrolled}
                onCheckedChange={(checked) => setHideBudgetEnrolled(!!checked)}
                className={accent.checkbox}
              />
              <Label htmlFor="hide-budget-enrolled" className={cn("cursor-pointer text-sm font-medium", accent.text)}>
                Скрыть зачисленных на бюджет
              </Label>
            </div>
          )}

          {/* Status Filter */}
          {availableStatuses.length > 0 && (
            <div className="relative shrink-0">
              <button type="button" onClick={() => { setIsFilterOpen(!isFilterOpen); setIsColMenuOpen(false); }}
                className={cn("inline-flex items-center gap-2 px-3.5 h-10 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-xs select-none",
                  activeFilters > 0 ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                <FilterHorizontalIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Статус</span>
                {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center ml-0.5">{activeFilters}</span>}
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 z-50 flex flex-col gap-1">
                    <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-slate-100 dark:border-slate-800 px-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Статус заявления</span>
                      {activeFilters > 0 && <button type="button" onClick={() => setStatusFilter(new Set())} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Сбросить</button>}
                    </div>
                    {availableStatuses.map(s => (
                      <label key={s} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all select-none",
                        statusFilter.has(s) ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200" : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200")}>
                        <Checkbox checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)}
                          className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0" />
                        <span className="text-sm font-medium truncate">{s}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Column Visibility */}
          <div className="relative shrink-0">
            <button type="button" onClick={() => { setIsColMenuOpen(!isColMenuOpen); setIsFilterOpen(false); }}
              className={cn("inline-flex items-center gap-2 px-3.5 h-10 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-xs select-none",
                hiddenCount > 0 ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800")}>
              <LayoutThreeColumnIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Колонки</span>
              {hiddenCount > 0 && <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center ml-0.5">{hiddenCount}</span>}
            </button>
            {isColMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsColMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 z-50 flex flex-col gap-1">
                  <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-slate-100 dark:border-slate-800 px-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Показать колонки</span>
                    {hiddenCount > 0 && <button type="button" onClick={() => setHiddenCols(new Set())} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Все</button>}
                  </div>
                  {COLS.map(({ key, label }) => (
                    <label key={key} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all select-none",
                      show(key) ? "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                        : "bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500")}>
                      <Checkbox checked={show(key)} onCheckedChange={() => toggleCol(key)}
                        className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="md:hidden flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 h-10 w-full sm:w-auto">
            <button
              onClick={() => { setActiveBasis('Бюджет'); setSearchQuery(''); }}
              className={cn(
                "flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors",
                activeBasis === 'Бюджет'
                  ? "bg-white text-teal-700 dark:bg-slate-900 dark:text-teal-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              Бюджет
            </button>
            <button
              onClick={() => { setActiveBasis('Платное'); setSearchQuery(''); }}
              className={cn(
                "flex-1 flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors",
                activeBasis === 'Платное'
                  ? "bg-white text-amber-700 dark:bg-slate-900 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              Платное
            </button>
          </div>
        </div>
      </div>

      {/* Clean Table Card Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <Table className="min-w-162.5 sm:min-w-full text-xs">
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="w-16 text-center whitespace-nowrap">№</TableHead>
                <TableHead className="text-center">Уникальный<br className="hidden print:inline" /> код</TableHead>
                <SortableTableHead
                  label="Сумма конкурсных баллов"
                  sortKey="totalPoints"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  accent={accent}
                  className="hover:text-slate-900 dark:hover:text-slate-100"
                />
                {show('examPoints') && <SortableTableHead label="Баллы ВИ" sortKey="examPoints" sortConfig={sortConfig} onSort={handleSort} accent={accent} className="hover:text-slate-900 dark:hover:text-slate-100" />}
                {show('subjects') && <TableHead className="text-center leading-tight text-slate-500">Предмет 1</TableHead>}
                {show('subjects') && <TableHead className="text-center leading-tight text-slate-500">Предмет 2</TableHead>}
                {show('subjects') && <TableHead className="text-center leading-tight text-slate-500">Предмет 3</TableHead>}
                {show('achievementPoints') && <SortableTableHead label="ИД" sortKey="achievementPoints" sortConfig={sortConfig} onSort={handleSort} accent={accent} className="hover:text-slate-900 dark:hover:text-slate-100" />}
                {show('consentContract') && <TableHead className="text-center leading-tight">{activeBasis === 'Бюджет' ? 'Согласие на зачисление' : 'Наличие договора'}</TableHead>}
                {show('semesterPayment') && activeBasis === 'Платное' && <TableHead className="text-center leading-tight text-slate-500">Оплата за семестр</TableHead>}
                {show('priority') && <SortableTableHead label="Приоритет" sortKey="priority" sortConfig={sortConfig} onSort={handleSort} accent={accent} className="hover:text-slate-900 dark:hover:text-slate-100" />}
                {show('higherPriority') && activeBasis === 'Бюджет' && <><TableHead className="text-center leading-tight text-slate-500">Осн. высший приоритет</TableHead><TableHead className="text-center leading-tight text-slate-500">Высший проходный</TableHead></>}
                {show('preemptive') && <><TableHead className="text-center leading-tight text-slate-500">Преим. право 1</TableHead><TableHead className="text-center leading-tight text-slate-500">Преим. право 2</TableHead></>}
                {show('idEquality') && <TableHead className="text-center leading-tight text-slate-500">ИД при равенстве</TableHead>}
                {show('withoutExams') && <TableHead className="text-center leading-tight text-slate-500">Без вступ. исп.</TableHead>}
                {show('basisBVI') && <TableHead className="text-center leading-tight text-slate-500">Основание БВИ</TableHead>}
                <TableHead className="whitespace-nowrap">Статус заявления</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.length > 0 ? (
                visibleStudents.map((student, index) => {
                  // Номер — официальный рейтинг; зона — по эффективному месту,
                  // чтобы фильтр/поиск/выбывшие не искажали картину конкурса
                  const rank = rankById.get(student.id) ?? index + 1;
                  const passingRank = passingRankById.get(student.id);
                  const inPassingZone = passingRank != null && passingRank <= selectedComp.seats;
                  const isLastPassingSeat = passingRank != null && passingRank === selectedComp.seats;
                  return (
                    <TableRow key={student.id} className={cn(
                      inPassingZone ? accent.rowBg : "",
                      isLastPassingSeat ? cn("border-b-2", accent.rowBorder) : "",
                      student.id === meRowHighlight ? "bg-teal-100/70 dark:bg-teal-900/30" : ""
                    )}>
                      <TableCell className="text-center text-slate-500 whitespace-nowrap tabular-nums">{rank}</TableCell>
                      <TableCell className="whitespace-nowrap text-left unique-code-cell">{student.uniqueCode}</TableCell>
                      <TableCell className={cn("whitespace-nowrap tabular-nums text-center", accent.text)}>{student.totalPoints}</TableCell>
                      {show('examPoints') && <TableCell className="whitespace-nowrap tabular-nums text-center">{student.examPoints}</TableCell>}
                      {show('subjects') && <TableCell className="whitespace-nowrap tabular-nums text-center">{student.subjects[0] || '-'}</TableCell>}
                      {show('subjects') && <TableCell className="whitespace-nowrap tabular-nums text-center">{student.subjects[1] || '-'}</TableCell>}
                      {show('subjects') && <TableCell className="whitespace-nowrap tabular-nums text-center">{student.subjects[2] || '-'}</TableCell>}
                      {show('achievementPoints') && <TableCell className="whitespace-nowrap tabular-nums text-center">{student.achievementPoints}</TableCell>}
                      {show('consentContract') && <TableCell className="whitespace-nowrap text-center">{activeBasis === 'Бюджет' ? (student.hasOriginal ? 'Да' : 'Нет') : (student.hasContract ? 'Да' : 'Нет')}</TableCell>}
                      {show('semesterPayment') && activeBasis === 'Платное' && <TableCell className="whitespace-nowrap text-center">{student.semesterPayment || 'Нет'}</TableCell>}
                      {show('priority') && <TableCell className={cn("whitespace-nowrap tabular-nums text-center", accent.text)}>{student.priority}</TableCell>}
                      {show('higherPriority') && activeBasis === 'Бюджет' && <><TableCell className="whitespace-nowrap text-left">{student.mainHigherPriority}</TableCell><TableCell className="whitespace-nowrap text-left">{student.higherPassingPriority}</TableCell></>}
                      {show('preemptive') && <><TableCell className="whitespace-nowrap text-left">{student.preemptiveRight1}</TableCell><TableCell className="whitespace-nowrap text-left">{student.preemptiveRight2}</TableCell></>}
                      {show('idEquality') && <TableCell className="whitespace-nowrap text-left">{student.idAtEquality}</TableCell>}
                      {show('withoutExams') && <TableCell className="whitespace-nowrap text-left">{student.withoutExams}</TableCell>}
                      {show('basisBVI') && <TableCell className="whitespace-nowrap text-left">{student.basisBVI}</TableCell>}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex justify-center">
                          {student.status ? getStatusBadge(student.status, accent) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={18}>
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                        fetchError
                          ? "bg-rose-50 dark:bg-rose-950/30"
                          : "bg-slate-100 dark:bg-slate-800/60"
                      )}>
                        {searchQuery ? (
                          <Search01Icon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                        ) : fetchError ? (
                          <Alert01Icon className="w-6 h-6 text-rose-400" />
                        ) : (
                          <GraduationScrollIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        {fetchError
                          ? 'Не удалось загрузить конкурсные списки'
                          : searchQuery
                            ? 'Ничего не найдено'
                            : hideBudgetEnrolled || consentOnly
                              ? 'Под фильтры ничего не попало'
                              : 'Списки пока не сформированы'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        {fetchError
                          ? fetchError
                          : searchQuery
                            ? `По запросу «${searchQuery}» совпадений не найдено. Проверьте правильность условного кода.`
                            : hideBudgetEnrolled || consentOnly
                              ? 'Все строки скрыты активными фильтрами — отключите фильтры выше, чтобы увидеть полный список.'
                              : 'На данный момент конкурсные списки по выбранному направлению отсутствуют или проходят обработку.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
