import { Component, type ReactNode, type ErrorInfo } from 'react';
import { CancelCircleIcon, RefreshIcon } from 'hugeicons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Последний рубеж: ошибка рендера любого компонента не должна
// превращать приложение в белый экран без диагностики
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-4">
            <CancelCircleIcon className="w-7 h-7 text-rose-500" />
          </div>
          <h1 className="text-lg font-semibold mb-2">Что-то пошло не так</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Возникла непредвиденная ошибка интерфейса. Попробуйте перезагрузить страницу —
            данные при этом не потеряются.
          </p>
          <details className="text-left text-xs text-slate-400 dark:text-slate-500 mb-5">
            <summary className="cursor-pointer select-none mb-1">Технические подробности</summary>
            <pre className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5">
              {this.state.error.message}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4" />
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
