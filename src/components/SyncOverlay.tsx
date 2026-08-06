import React from 'react';
import { motion } from 'motion/react';
import { CheckmarkCircle01Icon, RefreshIcon } from 'hugeicons-react';
import { cn } from '../lib/utils';

interface SyncOverlayProps {
  isPaidLists?: boolean;
}

export function SyncOverlay({ isPaidLists = false }: SyncOverlayProps) {
  const [step, setStep] = React.useState<number>(1);

  React.useEffect(() => {
    if (!isPaidLists) return;
    setStep(1);
    const timer1 = setTimeout(() => setStep(2), 400);
    const timer2 = setTimeout(() => setStep(3), 850);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isPaidLists]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.02, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-sm px-4 text-center"
      >
        <div className="relative flex items-center justify-center w-20 h-20 mb-3">
          <span
            className="absolute inset-0 rounded-full border-2 border-teal-500/40"
            style={{ animation: 'sync-ring 1.6s ease-out infinite' }}
          />
          <span
            className="absolute inset-0 rounded-full border-2 border-amber-400/40"
            style={{ animation: 'sync-ring 1.6s ease-out infinite 0.5s' }}
          />
          <span
            className="absolute inset-0 rounded-full border border-teal-600/10"
          />
          <div className="flex items-end gap-1.5 h-9">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "w-2 rounded-full origin-bottom",
                  isPaidLists ? "bg-amber-500 dark:bg-amber-400" : "bg-teal-500 dark:bg-teal-400"
                )}
                style={{
                  height: ['55%', '100%', '70%'][i],
                  animation: `sync-bar 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
          {isPaidLists ? 'Каскадное распределение платного приёма' : 'Синхронизация данных с сервером РГСУ…'}
        </p>

        {isPaidLists ? (
          <div className="mt-3.5 flex flex-col gap-2 text-left w-full bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs min-w-65">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex items-center gap-2 text-[11px] font-medium transition-colors",
                step >= 1 ? "text-slate-700 dark:text-slate-300" : "text-slate-400 opacity-50"
              )}
            >
              {step > 1 ? (
                <CheckmarkCircle01Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              )}
              <span>Сбор заявок по 6 направлениям</span>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className={cn(
                "flex items-center gap-2 text-[11px] font-medium transition-colors",
                step >= 2 ? "text-slate-700 dark:text-slate-300" : "text-slate-400/60"
              )}
            >
              {step > 2 ? (
                <CheckmarkCircle01Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : step === 2 ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
              )}
              <span>Ранжирование по 5-уровневой шкале</span>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.3 }}
              className={cn(
                "flex items-center gap-2 text-[11px] font-medium transition-colors",
                step >= 3 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-400/60"
              )}
            >
              {step === 3 ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
              )}
              <span>Расчёт зачисления по приоритетам</span>
            </motion.div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Загружаем конкурсные списки
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
