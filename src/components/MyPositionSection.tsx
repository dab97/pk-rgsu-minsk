import React, { useState } from 'react';
import { UserIcon, Search01Icon, RefreshIcon, CheckmarkCircle01Icon, Copy01Icon } from 'hugeicons-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { DirectionRow, Student } from '../types';
import { AccentTheme, accentThemes } from '../constants/theme';

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
      <Card>
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

            const topByBasis = (['Бюджет', 'Платное'] as const)
              .map(basis => {
                const rows = foundRows
                  .filter(r => r.comp.basis === basis)
                  .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
                return rows.length > 0 ? { basis, row: rows[0] } : null;
              })
              .filter((x): x is { basis: 'Бюджет' | 'Платное'; row: DirectionRow } => x !== null);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {/* Column 1: per-basis top-priority stat cards */}
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-1">
                    Ваш код:
                    <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{searchQuery.trim()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(searchQuery.trim());
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      title={codeCopied ? 'Скопировано' : 'Скопировать код'}
                      aria-label={codeCopied ? 'Код скопирован' : 'Скопировать код'}
                      className={cn('ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors dark:text-slate-500 focus:outline-none focus-visible:ring-2', accent.copyHover)}
                    >
                      {codeCopied ? (
                        <CheckmarkCircle01Icon className="h-3.5 w-3.5 scale-in text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy01Icon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {topByBasis.map(({ basis, row }) => {
                    const isBudget = basis === 'Бюджет';
                    const statAccent = accentThemes[basis];
                    const shortTitle = row.comp.title.split(' — ')[1] || row.comp.title.split(' — ')[0];
                    const diff = (row.points !== undefined && row.passingScore != null)
                      ? (row.points - row.passingScore) : null;
                    return (
                      <div key={basis} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: meta */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isBudget ? 'bg-teal-500' : 'bg-amber-500')} />
                              <span className={cn('text-[11px] font-semibold uppercase tracking-wider', statAccent.text)}>
                                {basis}
                              </span>
                              {row.priority != null && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  · Приоритет №{row.priority}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
                              {shortTitle}
                              <span className="ml-1 text-slate-400 dark:text-slate-500">{row.comp.studyForm}</span>
                            </div>
                            {diff !== null && (
                              <div className="text-xs">
                                {diff >= 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    +{diff} к проходному
                                    {row.passingScore != null && (
                                      <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">({row.passingScore})</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    {diff} до проходного
                                    {row.passingScore != null && (
                                      <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">({row.passingScore})</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Right: stacked numbers */}
                          <div className="text-right shrink-0 flex flex-col gap-1">
                            <div className="flex items-baseline justify-end gap-1 flex-wrap">
                              <span className={cn('text-3xl font-semibold tabular-nums leading-none', statAccent.text)}>{row.rank}</span>
                              <span className="text-sm text-slate-400 dark:text-slate-500 tabular-nums">из {row.total}</span>
                              {row.comp.seats > 0 && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">· {row.comp.seats} мест</span>
                              )}
                            </div>
                            {row.points !== undefined && (
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-3xl font-semibold tabular-nums leading-none text-slate-700 dark:text-slate-200">{row.points}</span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">балл</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Column 2 & 3: Budget and Paid Tables */}
                {(['Бюджет', 'Платное'] as const).map(basis => {
                  const rows = foundRows
                    .filter(r => r.comp.basis === basis)
                    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
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
                              <th className="px-2.5 py-1.5 text-center font-medium">Приоритет</th>
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
                                <td className="px-2.5 py-1.5 tabular-nums text-center text-slate-500 dark:text-slate-400">
                                  {row.priority ?? '—'}
                                </td>
                                <td className="px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                                  {row.comp.title.split(' — ')[1] || row.comp.title.split(' — ')[0]}
                                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">{row.comp.studyForm}</span>
                                </td>
                                <td className="px-2.5 py-1.5 text-right tabular-nums">{row.rank} / {row.total}</td>
                                <td className="px-2.5 py-1.5 text-right font-medium tabular-nums">{row.points}</td>
                                <td className="px-2.5 py-1.5 text-center">
                                  {(isBudget ? row.hasOriginal : row.hasContract)
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
