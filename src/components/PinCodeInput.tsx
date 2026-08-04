import React, { useRef } from 'react';
import { CancelCircleIcon, Search01Icon, CheckmarkCircle02Icon } from 'hugeicons-react';

interface PinCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: () => void;
  isFound?: boolean;
  length?: number;
}

export function PinCodeInput({
  value = '',
  onChange,
  onComplete,
  isFound = false,
  length = 7,
}: PinCodeInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const isComplete = value.length === length;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(rawVal);
    if (rawVal.length === length && onComplete) {
      onComplete();
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Hidden native input for seamless typing & paste */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={length}
        value={value}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Ввод 7-значного уникального кода"
      />

      {/* Shadcn UI Style Input OTP Joined Container - Perfectly Centered */}
      <div 
        onClick={handleContainerClick}
        className="flex items-center justify-center gap-1 sm:gap-2 cursor-pointer max-w-full"
      >
        {/* Group 1: First 3 digits */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
          {digits.slice(0, 3).map((digit, idx) => {
            const actualIndex = idx;
            const isFocused = value.length === actualIndex;
            return (
              <div
                key={actualIndex}
                className={`w-8 h-11 sm:w-11 sm:h-13 flex items-center justify-center text-slate-900 dark:text-white font-mono font-semibold text-base sm:text-lg transition-all relative ${
                  isFocused ? 'bg-teal-50 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10' : ''
                }`}
              >
                {digit || (isFocused ? <span className="animate-pulse text-teal-600 dark:text-teal-400">|</span> : '')}
              </div>
            );
          })}
        </div>

        {/* Separator Dot */}
        <div className="text-white/60 dark:text-slate-500 font-semibold text-sm sm:text-base px-0.5 select-none">
          •
        </div>

        {/* Group 2: Next 4 digits */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
          {digits.slice(3, 7).map((digit, idx) => {
            const actualIndex = idx + 3;
            const isFocused = value.length === actualIndex;
            return (
              <div
                key={actualIndex}
                className={`w-8 h-11 sm:w-11 sm:h-13 flex items-center justify-center text-slate-900 dark:text-white font-mono font-semibold text-base sm:text-lg transition-all relative ${
                  isFocused ? 'bg-teal-50 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10' : ''
                }`}
              >
                {digit || (isFocused ? <span className="animate-pulse text-teal-600 dark:text-teal-400">|</span> : '')}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-State Action Button & Centered Clear Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          className={`h-11 sm:h-12 px-6 sm:px-8 rounded-full text-white font-semibold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isComplete
              ? isFound
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
              : 'bg-teal-600 hover:bg-teal-700 active:scale-95'
          }`}
        >
          {isComplete ? (
            isFound ? (
              <>
                <CheckmarkCircle02Icon className="w-4 h-4 text-emerald-100" />
                <span>Позиция найдена</span>
              </>
            ) : (
              <>
                <CancelCircleIcon className="w-4 h-4 text-rose-100" />
                <span>Абитуриент не найден</span>
              </>
            )
          ) : (
            <>
              <Search01Icon className="w-4 h-4" />
              <span>Найти абитуриента</span>
            </>
          )}
        </button>

        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-teal-100/80 hover:text-white font-medium transition-colors flex items-center gap-1 mt-1 cursor-pointer"
          >
            <CancelCircleIcon className="w-3.5 h-3.5" />
            <span>Очистить код</span>
          </button>
        )}
      </div>
    </div>
  );
}
