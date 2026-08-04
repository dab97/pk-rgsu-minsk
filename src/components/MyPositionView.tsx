import React from 'react';
import { RefreshIcon, Target01Icon, BarChartIcon, SparklesIcon } from 'hugeicons-react';
import { MyPositionSection } from './MyPositionSection';
import { PinCodeInput } from './PinCodeInput';
import { Student, DirectionRow } from '../types';
import { AccentTheme } from '../constants/theme';
import { Card, CardContent } from './ui/card';

interface MyPositionViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchIsCode: boolean;
  meStudent: Student | null;
  meAcrossDirections: DirectionRow[] | null;
  predictedPassing: number | null;
  accent: AccentTheme;
  loadingAllDirs: boolean;
}

export function MyPositionView({
  searchQuery,
  setSearchQuery,
  searchIsCode,
  meStudent,
  meAcrossDirections,
  predictedPassing,
  accent,
  loadingAllDirs,
}: MyPositionViewProps) {
  const isFound = searchIsCode && (
    meStudent !== null ||
    (meAcrossDirections && meAcrossDirections.some(r => r.state === 'found'))
  );

  const handleScrollToResults = () => {
    const el = document.getElementById('position-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Vibrant Hero Gradient Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-teal-700 via-teal-600 to-cyan-600 dark:from-teal-900 dark:via-teal-800 dark:to-cyan-900 text-white p-6 sm:p-10 lg:p-12 text-center shadow-xl border border-teal-500/20">
        {/* Subtle decorative background shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-semibold text-white mb-2 sm:mb-3 tracking-tight drop-shadow-xs">
            Портал ранжирования абитуриентов РГСУ
          </h2>
          <p className="text-xs sm:text-base text-teal-100/90 max-w-xl mx-auto mb-6 sm:mb-8 font-normal leading-relaxed">
            Введите ваш 7-значный уникальный код для сквозной проверки статуса и оценки шансов на зачисление по всем направлениям.
          </p>

          {/* Clean Flat PIN-Code Input (No nested glass card border) */}
          <div className="w-full max-w-lg">
            <PinCodeInput
              value={searchQuery}
              onChange={setSearchQuery}
              onComplete={handleScrollToResults}
              isFound={isFound}
              length={7}
            />
          </div>
        </div>
      </div>

      {loadingAllDirs && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 px-1">
          <RefreshIcon className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
          Загружаем данные по всем направлениям…
        </div>
      )}

      {/* Main Content Area */}
      <div id="position-results">
        {searchIsCode ? (
          <MyPositionSection
            meStudent={meStudent}
            meAcrossDirections={meAcrossDirections}
            searchQuery={searchQuery}
            predictedPassing={predictedPassing}
            accent={accent}
          />
        ) : (
        /* Feature Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-200/80 dark:border-slate-800/80 hover:border-teal-200 dark:hover:border-teal-900 transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                  <Target01Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1">
                  Оценка вероятности
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Автоматическое сопоставление вашей суммы баллов с прогнозируемым проходным баллом текущего года.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800/80 hover:border-teal-200 dark:hover:border-teal-900 transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <BarChartIcon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1">
                  Бюджет и Договор
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Раздельный расчет позиций по бюджетной и платной основам для объективного выбора.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800/80 hover:border-teal-200 dark:hover:border-teal-900 transition-all">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1">
                  Все направления
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Поиск проверяет статус вашего заявления одновременно по всем доступным конкурсным группам РГСУ.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
