import { useEffect } from 'react';
import { X } from '../../animated-icons';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DetailDrawer({ open, onClose, title, subtitle, icon, iconBg = 'bg-brand-500/10 text-brand-600 dark:text-brand-400', children, footer }: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div
        className={`fixed top-0 right-0 h-full z-50 w-full max-w-sm flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className={`w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

export function DrawerRow({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <span className="text-xs font-semibold text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-sm font-bold text-slate-800 dark:text-slate-200 text-right ml-4 truncate ${valueClass}`}>{value}</span>
    </div>
  );
}

export function DrawerStatGrid({ stats }: { stats: { label: string; value: number; color: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-5 py-4">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
          <p className="text-2xl font-black">{s.value}</p>
          <p className="text-[10px] font-semibold mt-0.5 opacity-80">{s.label}</p>
        </div>
      ))}
    </div>
  );
}