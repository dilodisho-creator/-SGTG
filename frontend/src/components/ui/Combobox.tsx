import { useState, useRef, useEffect, useId, KeyboardEvent } from 'react';
import { Check, ChevronDown, Search, X } from '../../animated-icons';

export interface ComboOption {
  value: string;
  label: string;
  sub?: string;
  badge?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  searchable?: boolean;
  clearable?: boolean;
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  emptyText?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  hint,
  error,
  searchable = false,
  clearable = false,
  allowCustom = false,
  required,
  disabled,
  className = '',
  size = 'md',
  emptyText = 'Sin resultados',
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState(0);

  const selected = options.find(o => o.value === value) || (value ? { value, label: value, sub: 'Personalizado' } : undefined);

  const filtered = searchable && query.trim()
    ? options.filter(o =>
      o.label.toLocaleLowerCase('es-PE').includes(query.toLocaleLowerCase('es-PE')) ||
      o.sub?.toLocaleLowerCase('es-PE').includes(query.toLocaleLowerCase('es-PE'))
    )
    : options;

  const hasExact = options.some(o => o.value.toLowerCase() === query.trim().toLowerCase());
  const customOption: ComboOption | null = (allowCustom && query.trim() && !hasExact)
    ? { value: query.trim(), label: `Usar "${query.trim()}"`, sub: 'Valor nuevo / personalizado', badge: '+' }
    : null;
  const displayList = customOption ? [...filtered, customOption] : filtered;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
    if (open) setHighlighted(Math.max(0, displayList.findIndex(o => o.value === value)));
  }, [open]);

  function pick(val: string) {
    onChange(val);
    setOpen(false);
    setQuery('');
  }

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, displayList.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = displayList[highlighted];
      if (opt && !opt.disabled) pick(opt.value);
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3 py-2.5 text-sm';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKey}
        className={[
          'w-full flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-900 text-left',
          'transition-all outline-none',
          pad,
          error
            ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : open
              ? 'border-brand-500 ring-2 ring-brand-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="flex-1 min-w-0 flex flex-col">
          {selected ? (
            <>
              <span className="font-semibold text-slate-900 dark:text-white truncate leading-tight">
                {selected.label}
              </span>
              {selected.sub && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                  {selected.sub}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </span>

        {selected?.badge && (
          <span className="text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-lg flex-shrink-0">
            {selected.badge}
          </span>
        )}

        {clearable && selected && (
          <span
            role="button"
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}

        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
          style={{ minWidth: '100%' }}
        >
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
                  onKeyDown={handleKey as unknown as React.KeyboardEventHandler<HTMLInputElement>}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
          >
            {displayList.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                {emptyText}
              </li>
            ) : (
              displayList.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlighted;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => !opt.disabled && pick(opt.value)}
                    className={[
                      'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none',
                      opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                      isHighlighted && !opt.disabled
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : '',
                    ].join(' ')}
                  >
                    <span className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-brand-500' : 'text-transparent'}`}>
                      <Check className="w-4 h-4" />
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-semibold truncate ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>
                        {opt.label}
                      </span>
                      {opt.sub && (
                        <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                          {opt.sub}
                        </span>
                      )}
                    </span>

                    {opt.badge && (
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}