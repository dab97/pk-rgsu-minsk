import React from 'react';
import { Competition, BasisType } from '../types';
import { AccentTheme } from '../constants/theme';
import { Location01Icon, BookOpen01Icon, GraduationScrollIcon, UserCheck01Icon, Layers01Icon, Tag01Icon, Clock01Icon, DatabaseIcon, ShieldKeyIcon } from 'hugeicons-react';

interface CompetitionHeroBannerProps {
  selectedComp: Competition;
  activeBasis: BasisType;
  accent: AccentTheme;
  updatedAt?: string | null;
  dataSource?: 'live' | 'archive' | null;
  archivedAt?: string | null;
}

function formatArchiveDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CompetitionHeroBanner({ selectedComp, activeBasis, updatedAt, dataSource, archivedAt }: CompetitionHeroBannerProps) {
  const compCode = selectedComp.title.split(' — ')[0] || '';
  const compTitleOnly = selectedComp.title.split(' — ')[1] || selectedComp.title;
  const isBudget = activeBasis === 'Бюджет';
  const isArchive = dataSource === 'archive';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden mb-6">
      {/* Decorative vertical edge accent line on left */}
      <div className={`absolute left-0 top-4 bottom-4 sm:top-6 sm:bottom-6 w-1 rounded-r-full ${
        isBudget ? 'bg-teal-600' : 'bg-amber-500'
      }`} />

      {/* Soft background ambient gradient glow on right */}
      <div className={`absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
        isBudget ? 'bg-teal-500/5 dark:bg-teal-500/10' : 'bg-amber-500/5 dark:bg-amber-500/10'
      }`} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pl-1 sm:pl-4">
        {/* Left Primary Information Block */}
        <div className="flex-1 min-w-0">
          {/* Category Tag & Program Code */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[11px] font-medium tracking-wider uppercase ${
              isBudget ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              Программа подготовки
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              <Tag01Icon className="w-3 h-3 text-slate-400" />
              Код: {compCode}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            {compTitleOnly}
          </h1>

          {/* Subtitle / Department */}
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal leading-relaxed max-w-3xl">
            {selectedComp.subtitle}
          </p>

          {updatedAt ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-3">
              <Clock01Icon className="w-3.5 h-3.5 text-slate-400" />
              <span>Сведения обновлены: {updatedAt}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              {isArchive ? (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <ShieldKeyIcon className="w-3.5 h-3.5" />
                  данные из архива{archivedAt ? ` (${formatArchiveDate(archivedAt)})` : ''}
                </span>
              ) : dataSource === 'live' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <DatabaseIcon className="w-3.5 h-3.5" />
                  актуальные данные с pk.rgsu.net
                </span>
              ) : null}
            </p>
          ) : null}

          {/* Single Unified Minimalist Metadata Attributes Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-4 pt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border ${
              isBudget
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
            }`}>
              <Location01Icon className="w-3.5 h-3.5" />
              Филиал: {selectedComp.branch}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <BookOpen01Icon className="w-3.5 h-3.5 text-slate-400" />
              {selectedComp.educationLevel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <GraduationScrollIcon className="w-3.5 h-3.5 text-slate-400" />
              {selectedComp.studyForm} ({selectedComp.studyDuration})
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal ${
              isBudget ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
            }`}>
              <Layers01Icon className="w-3.5 h-3.5 text-slate-400" />
              Основа: {selectedComp.basis}
            </span>
          </div>
        </div>

        {/* Right Seats Counter Hero Metric */}
        <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-8">
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider lg:mb-1">
              {isBudget ? 'бюджетных мест' : 'платных мест'}
            </span>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                isBudget ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}>
                <UserCheck01Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                {selectedComp.seats}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
