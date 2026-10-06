import { ChevronDown } from '../../animated-icons';
import { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  icon?: ReactNode;
  error?: string;
  size?: 'sm' | 'md';
}

export function Select({ label, hint, icon, error, size = 'md', className = '', children, ...props }: SelectProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3 py-2.5 text-sm';
  const iconPad = icon ? 'pl-9' : '';

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
          {label}
        </span>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <select
          {...props}
          className={[
            'w-full appearance-none rounded-xl border bg-white dark:bg-slate-950',
            'text-slate-900 dark:text-white outline-none transition-all',
            'pr-8',
            pad,
            iconPad,
            error
              ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 hover:border-slate-300 dark:hover:border-slate-600',
            props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {children}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
      </div>
      {hint && !error && (
        <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>
      )}
      {error && (
        <span className="block text-[11px] text-red-500 mt-1">{error}</span>
      )}
    </label>
  );
}