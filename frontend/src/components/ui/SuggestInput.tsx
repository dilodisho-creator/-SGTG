import { useState, useRef, useEffect, KeyboardEvent, ReactNode } from 'react';
import { Check, ChevronDown, Sparkles } from '../../animated-icons';

export interface SuggestionItem {
  value: string;
  label?: string;
  badge?: string;
}

interface SuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: (string | SuggestionItem)[];
  quickChips?: string[];
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  warning?: string;
  required?: boolean;
  disabled?: boolean;
  uppercase?: boolean;
  className?: string;
  maxLength?: number;
  icon?: ReactNode;
  autoFocus?: boolean;
}

export function SuggestInput({
  value,
  onChange,
  suggestions,
  quickChips,
  placeholder,
  label,
  hint,
  error,
  warning,
  required,
  disabled,
  uppercase = false,
  className = '',
  maxLength,
  icon,
  autoFocus,
}: SuggestInputProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const normalizedList: SuggestionItem[] = suggestions.map((item) =>
    typeof item === 'string' ? { value: item, label: item } : item
  );

  const q = value.trim().toLocaleLowerCase('es-PE');
  const filtered = q
    ? normalizedList.filter(
      (s) =>
        s.value.toLocaleLowerCase('es-PE').includes(q) ||
        s.label?.toLocaleLowerCase('es-PE').includes(q)
    )
    : normalizedList;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handleSelect(val: string) {
    const finalVal = uppercase ? val.toUpperCase() : val;
    onChange(finalVal);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        if (highlighted >= 0 && highlighted < filtered.length) {
          e.preventDefault();
          handleSelect(filtered[highlighted].value);
        }
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
  }

  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </span>
          {normalizedList.length > 0 && (
            <span className="text-[10px] font-normal text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sugerencias ({normalizedList.length})
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={() => {
            if (normalizedList.length > 0) {
              setOpen(true);
              setHighlighted(-1);
            }
          }}
          onChange={(e) => {
            const v = uppercase ? e.target.value.toUpperCase() : e.target.value;
            onChange(v);
            if (!open) setOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          className={[
            'w-full rounded-xl border bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all',
            icon ? 'pl-9' : '',
            normalizedList.length > 0 ? 'pr-8' : '',
            error
              ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : warning
                ? 'border-amber-400 dark:border-amber-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          ].join(' ')}
        />

        {normalizedList.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Sugerencias disponibles</span>
            <span>{filtered.length} opción(es)</span>
          </div>
          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {filtered.map((item, idx) => {
              const isSelected = item.value.toUpperCase() === value.trim().toUpperCase();
              const isHigh = idx === highlighted;

              return (
                <li
                  key={item.value + idx}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => handleSelect(item.value)}
                  className={[
                    'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-sm select-none',
                    isHigh ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-brand-500' : 'text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold truncate">{item.label || item.value}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {quickChips && quickChips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-400">Rápido:</span>
          {quickChips.map((chip) => {
            const isCurrent = value.trim().toUpperCase() === chip.toUpperCase();
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleSelect(chip)}
                className={[
                  'text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all',
                  isCurrent
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-600',
                ].join(' ')}
              >
                {chip}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      {warning && !error && <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1">{warning}</p>}
      {hint && !error && !warning && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}