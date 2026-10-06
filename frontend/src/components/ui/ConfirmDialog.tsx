import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from '../../animated-icons';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    setState(null);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    setState(null);
  }

  const dialog = state ? (
    <ConfirmDialog {...state} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null;

  return { confirm, dialog };
}

interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const iconBg =
    variant === 'danger' ? 'bg-red-500/10' :
      variant === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10';

  const iconColor =
    variant === 'danger' ? 'text-red-500' :
      variant === 'warning' ? 'text-amber-500' : 'text-blue-500';

  const confirmCls =
    variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20' :
      variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' :
        'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/40">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className={`w-11 h-11 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center mb-4`}>
            {variant === 'danger'
              ? <Trash2 className="w-5 h-5" />
              : <AlertTriangle className="w-5 h-5" />
            }
          </div>

          <h2 id="confirm-title" className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
            {title}
          </h2>
          <p id="confirm-desc" className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>

          <div className="flex gap-2 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              {cancelLabel}
            </button>
            <button
              autoFocus
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 ${confirmCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}