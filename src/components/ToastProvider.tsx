import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, durationMs?: number) => void;
  error: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  warn: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus for non-React dispatch
const TOAST_EVENT = 'LF_TACTICAL_TOAST_EVENT';

export function notify(message: string, type: ToastType = 'info', title?: string, durationMs = 4500) {
  if (typeof window !== 'undefined') {
    const detail: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      durationMs,
    };
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
  }
}

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg, type, title, duration) => notify(msg, type, title, duration),
      error: (msg, title) => notify(msg, 'error', title || '作战指令受阻'),
      success: (msg, title) => notify(msg, 'success', title || '战略指令达成'),
      warn: (msg, title) => notify(msg, 'warning', title || '战略情报预警'),
      info: (msg, title) => notify(msg, 'info', title || '战略通告'),
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [...prev.slice(-4), toast]); // Max 5 toasts
    const dur = toast.durationMs ?? 4500;
    if (dur > 0) {
      setTimeout(() => {
        removeToast(toast.id);
      }, dur);
    }
  }, [removeToast]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, durationMs = 4500) => {
      const item: ToastItem = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        message,
        durationMs,
      };
      addToast(item);
    },
    [addToast]
  );

  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title || '作战指令受阻'), [showToast]);
  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title || '战略指令达成'), [showToast]);
  const warn = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title || '战略情报预警'), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title || '战略通告'), [showToast]);

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };
    window.addEventListener(TOAST_EVENT, handleCustomEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleCustomEvent);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showToast, error, success, warn, info }}>
      {children}
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2 pointer-events-none max-w-sm w-full select-none">
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarn = t.type === 'warning';

          const borderColor = isError
            ? 'border-red-600/80 bg-[#1e1315]/95'
            : isSuccess
            ? 'border-strategy-gold/70 bg-[#161a18]/95'
            : isWarn
            ? 'border-amber-500/70 bg-[#1c1811]/95'
            : 'border-sky-500/70 bg-[#121820]/95';

          const textColor = isError
            ? 'text-red-200'
            : isSuccess
            ? 'text-strategy-gold'
            : isWarn
            ? 'text-amber-200'
            : 'text-sky-200';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${borderColor}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isError && <ShieldAlert className="w-5 h-5 text-red-500" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-strategy-gold" />}
                {isWarn && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {!isError && !isSuccess && !isWarn && <Info className="w-5 h-5 text-sky-400" />}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className={`text-xs font-serif font-bold uppercase tracking-wider mb-0.5 ${textColor}`}>
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-300 font-mono leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
