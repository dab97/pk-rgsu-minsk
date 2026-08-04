import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UserIcon, Search01Icon, CancelCircleIcon, RefreshIcon, CheckmarkCircle01Icon, Copy01Icon } from 'hugeicons-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { DirectionRow } from '../types';
import { AccentTheme } from '../constants/theme';

interface MyPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchIsCode: boolean;
  meAcrossDirections: DirectionRow[] | null;
  accent: AccentTheme;
  modalInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function MyPositionModal({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchIsCode,
  meAcrossDirections,
  accent,
  modalInputRef,
}: MyPositionModalProps) {
  const [codeCopied, setCodeCopied] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 overflow-hidden z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-xl", accent.pillBg)}>
                  <UserIcon className={cn("w-5 h-5", accent.text)} />
                </div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                  Поиск по уникальному коду
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mr-1 -mt-1 text-slate-500" onClick={onClose} aria-label="Закрыть">
                <CancelCircleIcon className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative mb-4">
              <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                ref={modalInputRef as any}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Уникальный код (6–8 цифр)"
                aria-label="Уникальный код"
                className="pl-9 tabular-nums"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {!searchIsCode ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
                Введите код — покажем ваше место в рейтинге по всем направлениям и лучшую позицию.
              </div>
            ) : meAcrossDirections && meAcrossDirections.some(r => r.state === 'loading') ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                <RefreshIcon className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" /> Загружаем все направления…
              </div>
            ) : meAcrossDirections ? (
              <motion.div
                key={searchQuery.trim()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {(() => {
                  const found = meAcrossDirections.filter(r => r.state === 'found');
                  const best = found.length ? found.reduce((a, b) => ((a.rank ?? 99999) <= (b.rank ?? 99999) ? a : b)) : null;
                  return (
                    <>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 mb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Ваш код</span>
                        <span className="flex items-center gap-1.5">
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
                            className={cn("inline-flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors dark:text-slate-500 focus:outline-none focus-visible:ring-2", accent.copyHover)}
                          >
                            {codeCopied ? (
                              <CheckmarkCircle01Icon className="h-3.5 w-3.5 scale-in text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Copy01Icon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </span>
                      </div>

                      {best ? (
                        <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Лучшая позиция</div>
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-4xl font-semibold tabular-nums", accent.text)}>{best.rank}</span>
                            <span className="text-sm text-slate-500">место из {best.total}</span>
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{best.comp.title}</div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-500 dark:text-slate-400">
                          Код не найден ни в одном направлении.
                        </div>
                      )}

                      {found.length > 0 && (
                        <div className="space-y-3">
                          {(['Бюджет', 'Платное'] as const).map(basis => {
                            const groupRows = meAcrossDirections
                              .filter(r => r.state === 'found' && r.comp.basis === basis)
                              .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
                            if (groupRows.length === 0) return null;
                            const isBudget = basis === 'Бюджет';
                            return (
                              <div key={basis}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isBudget ? "bg-teal-500" : "bg-amber-500")} />
                                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isBudget ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400")}>{basis}</span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{groupRows.length}</span>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                                  <div className="max-h-40 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className={cn("text-slate-500 dark:text-slate-400 sticky top-0 z-10", isBudget ? "bg-teal-50/80 dark:bg-teal-900/30" : "bg-amber-50/80 dark:bg-amber-900/30")}>
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium">Направление</th>
                                          <th className="px-3 py-2 text-right font-medium">Место</th>
                                          <th className="px-3 py-2 text-right font-medium">Баллы</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {groupRows.map(row => (
                                          <tr key={row.comp.id} className={cn("border-t border-slate-100 dark:border-slate-800", row.isCurrent && accent.sidebarActive)}>
                                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">
                                              {row.comp.title.split(' — ')[1] || row.comp.title.split(' — ')[0]}
                                              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">{row.comp.studyForm}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.rank} / {row.total}</td>
                                            <td className="px-3 py-2 text-right font-medium tabular-nums">{row.points}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            ) : null}

            <Button
              className="w-full mt-4"
              onClick={onClose}
            >
              Готово
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
