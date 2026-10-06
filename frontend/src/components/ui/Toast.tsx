import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from '../../animated-icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    if (!duration) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  const badge = {
    success: {
      bg: 'bg-emerald-500',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      label: 'Guardado',
    },
    error: {
      bg: 'bg-red-500',
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: 'Error',
    },
    info: {
      bg: 'bg-brand-500',
      icon: <Info className="w-3.5 h-3.5" />,
      label: 'Aviso',
    },
  }[type];

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] max-w-xs w-full animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="relative bg-slate-800 dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/30 border border-slate-700/60 overflow-visible">
        <div
          className={`absolute -top-3 right-4 ${badge.bg} text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-black/20`}
        >
          {badge.icon}
          {badge.label}
        </div>

        <div className="flex items-start gap-3 px-4 pt-5 pb-4">
          <p className="flex-1 text-sm text-slate-200 leading-snug">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 mt-0.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}