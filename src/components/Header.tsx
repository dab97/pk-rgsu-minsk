import React from 'react';
import { Sun01Icon, MoonIcon } from 'hugeicons-react';
import { Button } from './ui/button';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Переключить тему"
    >
      <Sun01Icon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Header({
  sidebarOpen,
  setSidebarOpen,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="flex items-center space-x-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg md:text-xl font-semibold truncate pr-2">
            Мониторинг конкурсных списков РГСУ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block truncate pr-2">
            Приемная комиссия • Официальные рейтинги абитуриентов
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
