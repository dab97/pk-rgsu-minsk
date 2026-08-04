import React, { useState } from 'react';
import { UserIcon, Search01Icon, RefreshIcon, CheckmarkCircle01Icon, Copy01Icon } from 'hugeicons-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { DirectionRow, Student } from '../types';
import { AccentTheme } from '../constants/theme';

interface MyPositionSectionProps {
  meStudent: Student | null;
  meAcrossDirections: DirectionRow[] | null;
  searchQuery: string;
  predictedPassing: number | null;
  accent: AccentTheme;
}

export function MyPositionSection({
  meStudent,
  meAcrossDirections,
  searchQuery,
  predictedPassing,
  accent,
}: MyPositionSectionProps) {
  const [codeCopied, setCodeCopied] = useState(false);

  return (
    <div className="mb-6">
      <Card className={cn(meStudent ? accent.meBorder : "")}>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserIcon className={cn("w-5 h-5", accent.text)} />
              Моя позиция в конкурсе
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {(() => {
            if (!meAcrossDirections) {
              return (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl shrink-0", accent.pillBg)}>
                      <Search01Icon className={cn("w-5 h-5", accent.text)} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Поиск вашей позиции по всем направлениям
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Введите ваш уникальный код (6–8 цифр) в поле поиска ниже, чтобы увидеть вашу позицию во всех конкурсных списках.
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const loading = meAcrossDirections.some(r => r.state === 'loading');
            if (loading) {
              return (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
                  <RefreshIcon className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
                  <span>Загружаем позиции по всем направлениям…</span>
                </div>
              );
            }

            const foundRows = meAcrossDirections.filter(r => r.state === 'found');
            if (foundRows.length === 0) {
              return (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-500 text-center">
                  Абитуриент с кодом <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{searchQuery.trim()}</span> не найден ни в одном направлении.
                </div>
              );
            }

            const bestRow = foundRows.reduce((a, b) => ((a.rank ?? 99999) <= (b.rank ?? 99999) ? a : b));
            const summary = {
              rank: bestRow.rank ?? 0,
              total: bestRow.total ?? 0,
              diff: (bestRow.points !== undefined && typeof predictedPassing === 'number')
                ? (bestRow.points - predictedPassing)
                : null,
              title: bestRow.comp.title,
              label: bestRow.isCurrent ? 'Текущее направление' : 'Другое направление',
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {/* Column 1: My Status */}
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Мой статус
                    </span>
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{summary.title}</div>
                          <div className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{summary.label}</div>
                        </div>
                        <UserIcon className={cn("w-5 h-5 shrink-0", accent.text)} />
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className={cn("text-3xl font-semibold tabular-nums", accent.text)}>{summary.rank}</span>
                        <span className="text-sm text-slate-500">место из {summary.total}</span>
                      </div>
                      {summary.diff !== null && (
                        <div className="mt-1.5 text-sm">
                          {summary.diff >= 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Вы выше проходного балла на {summary.diff} балл(ов)</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">До проходного балла не хватает {Math.abs(summary.diff)} балл(ов)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                      Ваш код:
                      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{searchQuery.trim()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(searchQuery.trim());
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                        title={codeCopied ? "Скопировано" : "Скопировать код"}
                        aria-label={codeCopied ? "Код скопирован" : "Скопировать код"}
                        className={cn("ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors dark:text-slate-500 focus:outline-none focus-visible:ring-2", accent.copyHover)}
                      >
                        {codeCopied ? (
                          <CheckmarkCircle01Icon className="h-3.5 w-3.5 scale-in text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Copy01Icon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2 & 3: Budget and Paid Tables */}
                {(['Бюджет', 'Платное'] as const).map(basis => {
                  const rows = foundRows.filter(r => r.comp.basis === basis);
                  const isBudget = basis === 'Бюджет';
                  if (rows.length === 0) {
                    return (
                      <div key={basis} className="flex flex-col h-full">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", isBudget ? "bg-teal-500" : "bg-amber-500")} />
                          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isBudget ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400")}>{basis}</span>
                        </div>
                        <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 text-xs text-slate-400 flex items-center justify-center">
                          Нет заявлений на {basis.toLowerCase()} основе
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={basis} className="flex flex-col h-full">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", isBudget ? "bg-teal-500" : "bg-amber-500")} />
                        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isBudget ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400")}>{basis}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">({rows.length})</span>
                      </div>
                      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-xs">
                          <thead className={cn("text-slate-500 dark:text-slate-400", isBudget ? "bg-teal-50/60 dark:bg-teal-900/20" : "bg-amber-50/60 dark:bg-amber-900/20")}>
                            <tr>
                              <th className="px-2.5 py-1.5 text-left font-medium">Направление</th>
                              <th className="px-2.5 py-1.5 text-right font-medium">Место</th>
                              <th className="px-2.5 py-1.5 text-right font-medium">Баллы</th>
                              <th className="px-2.5 py-1.5 text-center font-medium">
                                {isBudget ? 'Согласие' : 'Договор'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(row => (
                              <tr
                                key={row.comp.id}
                                className={cn("border-t border-slate-100 dark:border-slate-800", row.isCurrent && accent.sidebarActive)}
                              >
                                <td className="px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                                  {row.comp.title.split(' — ')[1] || row.comp.title.split(' — ')[0]}
                                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">{row.comp.studyForm}</span>
                                </td>
                                <td className="px-2.5 py-1.5 text-right tabular-nums">{row.rank} / {row.total}</td>
                                <td className="px-2.5 py-1.5 text-right font-medium tabular-nums">{row.points}</td>
                                <td className="px-2.5 py-1.5 text-center">
                                  {row.hasOriginal
                                    ? <CheckmarkCircle01Icon className="h-3.5 w-3.5 inline text-emerald-500" />
                                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
