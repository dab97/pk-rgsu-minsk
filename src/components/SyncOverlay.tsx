import React from 'react';
import { motion } from 'motion/react';

export function SyncOverlay() {
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
        className="flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center w-24 h-24">
          <span
            className="absolute inset-0 rounded-full border-2 border-teal-500/40"
            style={{ animation: 'sync-ring 1.6s ease-out infinite' }}
          />
          <span
            className="absolute inset-0 rounded-full border-2 border-amber-400/30"
            style={{ animation: 'sync-ring 1.6s ease-out infinite 0.5s' }}
          />
          <span
            className="absolute inset-0 rounded-full border border-teal-600/10"
          />
          <div className="flex items-end gap-1.5 h-10">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2.5 rounded-full origin-bottom bg-teal-500 dark:bg-teal-400"
                style={{
                  height: ['55%', '100%', '70%'][i],
                  animation: `sync-bar 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-200">
          Синхронизация данных с сервером РГСУ…
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Загружаем конкурсные списки
        </p>
      </motion.div>
    </motion.div>
  );
}
