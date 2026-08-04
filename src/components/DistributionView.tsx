import React from 'react';
import { RefreshIcon } from 'hugeicons-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '../lib/utils';
import { BasisType, DistributionRow, DistributionBucket } from '../types';

interface DistributionViewProps {
  rows: DistributionRow[];
  buckets: DistributionBucket[];
  loading: boolean;
  basis: BasisType;
  onBasisChange: (basis: BasisType) => void;
  consentOnly: boolean;
  onConsentChange: (checked: boolean) => void;
}

export function DistributionView({
  rows,
  buckets,
  loading,
  basis,
  onBasisChange,
  consentOnly,
  onConsentChange,
}: DistributionViewProps) {
  const loadedCount = rows.filter(r => r.loaded).length;
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Распределение конкурсных баллов</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Сколько абитуриентов в каждом диапазоне баллов по направлениям подготовки</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className={cn(
              "flex items-center space-x-2 px-3 h-10 rounded-xl border transition-colors",
              consentOnly
                ? basis === 'Бюджет'
                  ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-900"
                  : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            )}>
              <Checkbox
                id="distribution-consent-only"
                checked={consentOnly}
                onCheckedChange={(checked) => onConsentChange(!!checked)}
                className={basis === 'Бюджет'
                  ? "border-slate-300 dark:border-slate-600 data-[state=checked]:border-teal-600 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white focus-visible:ring-teal-500/40"
                  : "border-slate-300 dark:border-slate-600 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white focus-visible:ring-amber-500/40"}
              />
              <Label htmlFor="distribution-consent-only" className={cn(
                "cursor-pointer text-sm font-medium whitespace-nowrap",
                basis === 'Бюджет' ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"
              )}>
                С {basis === 'Бюджет' ? 'согласием' : 'договором'}
              </Label>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 h-10 w-fit items-center">
              <button
                onClick={() => onBasisChange('Бюджет')}
                className={cn(
                  "flex items-center justify-center rounded-md px-3 h-full text-xs font-medium transition-colors",
                  basis === 'Бюджет'
                    ? "bg-white text-teal-700 dark:bg-slate-900 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Бюджет
              </button>
              <button
                onClick={() => onBasisChange('Платное')}
                className={cn(
                  "flex items-center justify-center rounded-md px-3 h-full text-xs font-medium transition-colors",
                  basis === 'Платное'
                    ? "bg-white text-amber-700 dark:bg-slate-900 dark:text-amber-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Платное
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Печать PDF
            </button>
          </div>
        </div>
        {loading && loadedCount === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshIcon className={cn("h-4 w-4 animate-spin", basis === 'Бюджет' ? "text-teal-600" : "text-amber-600")} /> Загружаем данные всех направлений…
          </div>
        ) : (
          <>
            <div id="distribution-print-area" className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium sticky left-0 z-10 bg-slate-50 dark:bg-slate-900">Направление</th>
                    {buckets.map((b, i) => (
                      <th key={i} className="px-2 py-2.5 text-center font-medium tabular-nums">{b.label}</th>
                    ))}
                    <th className="px-4 py-2.5 text-center font-medium">Всего</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const shortName = row.comp.title.split(' — ');
                    return (
                      <tr key={row.comp.id} className={cn("border-t border-slate-100 dark:border-slate-800", basis === 'Бюджет' ? "hover:bg-teal-50/40 dark:hover:bg-teal-900/10" : "hover:bg-amber-50/40 dark:hover:bg-amber-900/10")}>
                        <td className="px-4 py-2 sticky left-0 z-10 bg-white dark:bg-slate-950">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{shortName[1] || shortName[0]}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{row.comp.studyForm}</span>
                            <Badge className={cn("text-[10px] px-1.5 py-0 tabular-nums", basis === 'Бюджет' ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-100 dark:border-teal-900" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-900")}>{row.comp.seats} мест</Badge>
                            {row.loaded && row.passingScore != null && (
                              <Badge className={cn("text-[10px] px-1.5 py-0 tabular-nums", basis === 'Бюджет' ? "bg-teal-600 text-white dark:bg-teal-600 dark:text-white" : "bg-amber-500 text-white dark:bg-amber-500 dark:text-white")}>
                                Проходной: {row.passingScore}
                              </Badge>
                            )}
                          </div>
                        </td>
                        {row.loaded ? (
                          <>
                            {row.cells.map((c, i) => (
                              <td
                                key={i}
                                className={cn(
                                  "px-2 py-2 text-center tabular-nums",
                                  i === row.passingIdx && "distribution-passing-cell",
                                  i !== row.passingIdx && "text-slate-600 dark:text-slate-300"
                                )}
                              >
                                {i === row.passingIdx ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        tabIndex={0}
                                        className={cn(
                                          "inline-flex items-center justify-center font-semibold cursor-help",
                                          String(c).length <= 2 ? "w-11 h-11 rounded-full" : "h-11 min-w-11 px-2 rounded-full",
                                          basis === 'Бюджет'
                                            ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                        )}
                                      >
                                        {c}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="center" className="flex flex-col items-center gap-0.5">
                                      <span className="text-[10px] uppercase tracking-wider opacity-70">Проходной балл</span>
                                      <span className="text-lg leading-none font-semibold tabular-nums">
                                        {row.passingScore}
                                      </span>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  c
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-2 text-center font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.total}</td>
                          </>
                        ) : (
                          <td colSpan={buckets.length + 1} className="px-4 py-2 text-center text-slate-400">
                            {loading ? 'Загрузка…' : 'Нет данных'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
