import React from 'react';
import {
  Search01Icon,
  ArrowUpDownIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Clock01Icon,
  Alert01Icon,
  GraduationScrollIcon,
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
  sortConfig: SortConfig;
  handleSort: (key: keyof Student) => void;
  handleSortKeyDown: (key: keyof Student) => (e: React.KeyboardEvent<HTMLTableCellElement>) => void;
  meRowHighlight?: string | null;
  fetchError: string | null;
  accent: AccentTheme;
}

export function getStatusBadge(status: Student['status'], accent: AccentTheme) {
  if (!status) return null;
  switch (status) {
    case 'зачислен':
      return (
        <Badge variant="success" className={accent.successBadge}>
          <CheckmarkCircle01Icon className="w-3 h-3 mr-1" />
          Зачислен
        </Badge>
      );
    case 'отказ':
      return (
        <Badge variant="destructive">
          <CancelCircleIcon className="w-3 h-3 mr-1" />
          Отказ
        </Badge>
      );
    case 'в конкурсе':
      return (
        <Badge variant="secondary">
          <Clock01Icon className="w-3 h-3 mr-1" />В конкурсе
        </Badge>
      );
    default:
      return null;
  }
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
  sortConfig,
  handleSort,
  handleSortKeyDown,
  meRowHighlight,
  fetchError,
  accent,
}: CompetitionTableProps) {
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
                <TableHead className="whitespace-nowrap">Уникальный код</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 leading-tight"
                  onClick={() => handleSort('totalPoints')}
                  tabIndex={0}
                  onKeyDown={handleSortKeyDown('totalPoints')}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-1">
                    <span>Сумма конкурсных баллов</span>
                    {sortConfig.key === 'totalPoints' && (
                      <ArrowUpDownIcon className={cn("w-3 h-3", sortConfig.direction === 'desc' ? accent.sortIcon : cn(accent.sortIcon, "rotate-180"))} />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 leading-tight"
                  onClick={() => handleSort('examPoints')}
                  tabIndex={0}
                  onKeyDown={handleSortKeyDown('examPoints')}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-1">
                    <span>Сумма баллов за вступительные испытания</span>
                    {sortConfig.key === 'examPoints' && (
                      <ArrowUpDownIcon className={cn("w-3 h-3", sortConfig.direction === 'desc' ? accent.sortIcon : cn(accent.sortIcon, "rotate-180"))} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Баллы за предмет 1</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Баллы за предмет 2</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Баллы за предмет 3</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 leading-tight"
                  onClick={() => handleSort('achievementPoints')}
                  tabIndex={0}
                  onKeyDown={handleSortKeyDown('achievementPoints')}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-1">
                    <span>Количество баллов за индивидуальные достижения</span>
                    {sortConfig.key === 'achievementPoints' && (
                      <ArrowUpDownIcon className={cn("w-3 h-3", sortConfig.direction === 'desc' ? accent.sortIcon : cn(accent.sortIcon, "rotate-180"))} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center leading-tight">
                  {activeBasis === 'Бюджет' ? 'Согласие на зачисление' : 'Наличие заключенного договора'}
                </TableHead>
                {activeBasis === 'Платное' && (
                  <TableHead className="text-center leading-tight text-slate-500">
                    Оплата за семестр
                  </TableHead>
                )}
                <TableHead
                  className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 leading-tight"
                  onClick={() => handleSort('priority')}
                  tabIndex={0}
                  onKeyDown={handleSortKeyDown('priority')}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-1">
                    <span>Приоритет</span>
                    {sortConfig.key === 'priority' && (
                      <ArrowUpDownIcon className={cn("w-3 h-3", sortConfig.direction === 'desc' ? accent.sortIcon : cn(accent.sortIcon, "rotate-180"))} />
                    )}
                  </div>
                </TableHead>
                {activeBasis === 'Бюджет' && (
                  <>
                    <TableHead className="text-center leading-tight text-slate-500">Основной высший приоритет</TableHead>
                    <TableHead className="text-center leading-tight text-slate-500">Высший проходной приоритет</TableHead>
                  </>
                )}
                <TableHead className="text-center leading-tight text-slate-500">Преимущественное право 1</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Преимущественное право 2</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">ИД при равенстве по иным критериям</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Без вступительных испытаний</TableHead>
                <TableHead className="text-center leading-tight text-slate-500">Основание приема БВИ</TableHead>
                <TableHead className="whitespace-nowrap">Статус заявления</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedStudents.length > 0 ? (
                filteredAndSortedStudents.map((student, index) => {
                  const isLastBudgetSeat = index === selectedComp.seats - 1;
                  return (
                    <TableRow
                      key={student.id}
                      className={cn(
                        index < selectedComp.seats ? accent.rowBg : "",
                        isLastBudgetSeat ? cn("border-b-2", accent.rowBorder) : "",
                        student.id === meRowHighlight ? "bg-teal-100/70 dark:bg-teal-900/30" : ""
                      )}
                    >
                      <TableCell className="text-center text-slate-500 whitespace-nowrap tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-left">
                        {student.uniqueCode}
                      </TableCell>
                      <TableCell className={cn("whitespace-nowrap tabular-nums text-center", accent.text)}>
                        {student.totalPoints}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-center">
                        {student.examPoints}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-center">
                        {student.subjects[0] || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-center">
                        {student.subjects[1] || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-center">
                        {student.subjects[2] || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-center">
                        {student.achievementPoints}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        {student.hasOriginal ? 'Да' : 'Нет'}
                      </TableCell>
                      {activeBasis === 'Платное' && (
                        <TableCell className="whitespace-nowrap text-center">
                          {student.semesterPayment || 'Нет'}
                        </TableCell>
                      )}
                      <TableCell className={cn("whitespace-nowrap tabular-nums text-center", accent.text)}>
                        {student.priority}
                      </TableCell>
                      {activeBasis === 'Бюджет' && (
                        <>
                          <TableCell className="whitespace-nowrap text-left">{student.mainHigherPriority}</TableCell>
                          <TableCell className="whitespace-nowrap text-left">{student.higherPassingPriority}</TableCell>
                        </>
                      )}
                      <TableCell className="whitespace-nowrap text-left">{student.preemptiveRight1}</TableCell>
                      <TableCell className="whitespace-nowrap text-left">{student.preemptiveRight2}</TableCell>
                      <TableCell className="whitespace-nowrap text-left">{student.idAtEquality}</TableCell>
                      <TableCell className="whitespace-nowrap text-left">{student.withoutExams}</TableCell>
                      <TableCell className="whitespace-nowrap text-left">{student.basisBVI}</TableCell>
                      <TableCell className="whitespace-nowrap text-left">
                        {student.status && getStatusBadge(student.status, accent)}
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
                            : 'Списки пока не сформированы'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        {fetchError
                          ? fetchError
                          : searchQuery
                            ? `По запросу «${searchQuery}» совпадений не найдено. Проверьте правильность условного кода.`
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
