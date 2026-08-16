import React, { useEffect, useRef } from 'react';
import { CancelCircleIcon, Search01Icon, CheckmarkCircle02Icon, RefreshIcon } from 'hugeicons-react';

interface PinCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: () => void;
  isFound?: boolean;
  /** Идёт ли ещё поиск по направлениям (нейтральное состояние кнопки) */
  isSearching?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Сколько ячеек показывать до ввода — доминирующая длина кода */
  defaultLength?: number;
}

export function PinCodeInput({
  value = '',
  onChange,
  onComplete,
  isFound = false,
  isSearching = false,
  minLength = 6,
  maxLength = 8,
  defaultLength = 7,
}: PinCodeInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Реальные ИД абитуриентов бывают разной длины (в данных 6 и 7 цифр),
  // поэтому валидность — диапазон, а не фиксированная длина. Поле показывает
  // defaultLength ячеек и расширяется, только если введена восьмая цифра —
  // иначе для господствующих 7-значных кодов всегда торчала бы пустая ячейка
  const isValid = value.length >= minLength && value.length <= maxLength;
  const displayLength = Math.min(maxLength, Math.max(value.length, defaultLength));
  const firstGroupSize = displayLength > 7 ? 4 : 3;
  const digits = Array.from({ length: displayLength }, (_, i) => value[i] || '');

  // Автопереход к результатам — только когда код действительно найден
  // или достигнут максимум длины; на промежуточных длинах не дёргаем
  useEffect(() => {
    if (isValid && isFound && onComplete) onComplete();
  }, [isValid, isFound, onComplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(rawVal);
    if (rawVal.length === maxLength && onComplete) {
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

  const renderCell = (digit: string, actualIndex: number) => {
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
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Hidden native input for seamless typing & paste */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        value={value}
        onChange={handleInputChange}
        className="sr-only"
        aria-label={`Ввод уникального кода (${minLength}–${maxLength} цифр)`}
      />

      {/* Shadcn UI Style Input OTP Joined Container - Perfectly Centered */}
      <div
        onClick={handleContainerClick}
        className="flex items-center justify-center gap-1 sm:gap-2 cursor-pointer max-w-full"
      >
        {/* Group 1 */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
          {digits.slice(0, firstGroupSize).map((digit, idx) => renderCell(digit, idx))}
        </div>

        {/* Separator Dot */}
        <div className="text-white/60 dark:text-slate-500 font-semibold text-sm sm:text-base px-0.5 select-none">
          •
        </div>

        {/* Group 2 */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
          {digits.slice(firstGroupSize, displayLength).map((digit, idx) => renderCell(digit, idx + firstGroupSize))}
        </div>
      </div>

      {/* 3-State Action Button & Centered Clear Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          className={`h-11 sm:h-12 px-6 sm:px-8 rounded-full text-white font-semibold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isValid
              ? isSearching
                ? 'bg-teal-600 hover:bg-teal-700 active:scale-95'
                : isFound
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
              : 'bg-teal-600 hover:bg-teal-700 active:scale-95'
          }`}
        >
          {isValid ? (
            isSearching ? (
              <>
                <RefreshIcon className="w-4 h-4 text-teal-100 animate-spin" />
                <span>Ищем абитуриента…</span>
              </>
            ) : isFound ? (
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
