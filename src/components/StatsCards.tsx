import React from 'react';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { BasisType, Competition } from '../types';
import { AccentTheme } from '../constants/theme';
import { Target01Icon, SparklesIcon, UserCheck01Icon, BarChartIcon } from 'hugeicons-react';

interface StatsCardsProps {
  stats: {
    avgScore?: string | number;
    predictedPassing: string | number | null;
    originalsCount: number;
    competitionRatio: string | number;
  };
  selectedComp: Competition;
  activeBasis: BasisType;
  accent: AccentTheme;
}

export function StatsCards({ stats, selectedComp, activeBasis }: StatsCardsProps) {
  const isBudget = activeBasis === 'Бюджет';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Average Score Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            isBudget ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <SparklesIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Средний балл
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
            Средний среди зачисленных
          </p>
        </div>
        <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
          {stats.avgScore || '-'}
        </div>
      </div>

      {/* 2. Predicted Passing Score - FLAT HIGHLIGHT CARD */}
      <div className={`text-white rounded-2xl p-5 border flex flex-col justify-between relative overflow-hidden transition-all ${
        isBudget
          ? 'bg-teal-700 dark:bg-teal-800 border-teal-600/80'
          : 'bg-amber-600 dark:bg-amber-700 border-amber-500/80'
      }`}>
        {/* Soft background circle effect */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mb-3">
            <Target01Icon className="w-5 h-5" />
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${
            isBudget ? 'text-teal-100' : 'text-amber-100'
          }`}>
            Прогноз проходного
          </span>
          <p className={`text-xs font-medium mb-3 ${
            isBudget ? 'text-teal-200' : 'text-amber-200'
          }`}>
            Прогнозируемый порог
          </p>
        </div>
        <div className="text-3xl font-semibold text-white tabular-nums relative z-10">
          {stats.predictedPassing ?? '-'}
        </div>
      </div>

      {/* 3. Consents / Contracts Submitted Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            isBudget ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <UserCheck01Icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            {isBudget ? 'Согласий подано' : 'Договоров'}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
            {isBudget ? 'Оригиналы с согласием' : 'Заключенные договоры'}
          </p>
        </div>
        <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums flex items-baseline gap-1.5">
          <span>{stats.originalsCount}</span>
          <span className="text-slate-400 text-sm font-semibold">/ {selectedComp.seats} мест</span>
        </div>
      </div>

      {/* 4. Competition Ratio Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            isBudget ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <BarChartIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Конкурс
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
            человек на 1 место
          </p>
        </div>
        <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
          {stats.competitionRatio || '-'}
        </div>
      </div>
    </div>
  );
}
