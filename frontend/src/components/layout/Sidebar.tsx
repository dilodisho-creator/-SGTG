import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DatabaseBackup,
  Download,
  History,
  Search,
  Settings2,
  Swords,
  Trophy,
} from '../../animated-icons';
import roosterLogo from '../../assets/rooster-logo.png';

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type IconType = React.ComponentType<{ className?: string; size?: number;[key: string]: any }>;

interface NavItem {
  id: string;
  label: string;
  subtitle: string;
  icon: IconType;
  badge: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  fightsCount: number;
  torneo: string;
  onManageTournaments: () => void;
}

const STORAGE_KEY = 'gallos_simple_sidebar';

function persistCollapsed(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? 'collapsed' : 'expanded');
}

function SidebarTooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap
        bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100
        border border-slate-700 dark:border-slate-600
        shadow-lg shadow-black/30
        opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
        transition-all duration-150"
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800 dark:border-r-slate-700" />
    </span>
  );
}

export function Sidebar({ currentTab, onSelectTab, fightsCount, torneo, onManageTournaments }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'collapsed');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ gestion: true, datos: true, sistema: true });
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const registro: NavItem = {
    id: 'registro',
    label: 'Registro',
    subtitle: 'Galpones y gallos',
    icon: ClipboardList,
    badge: '',
  };
  const fights: NavItem = {
    id: 'fights',
    label: 'Enfrentamientos',
    subtitle: 'Sorteo, programación y resultados',
    icon: Swords,
    badge: fightsCount > 0 ? fightsCount.toString() : '',
  };
  const ranking: NavItem = {
    id: 'ranking',
    label: 'Ranking',
    subtitle: 'Clasificación por puntos o tiempo',
    icon: Trophy,
    badge: '',
  };
  const exportaciones: NavItem = {
    id: 'exportaciones',
    label: 'Exportaciones',
    subtitle: 'Descargar datos en Excel',
    icon: Download,
    badge: '',
  };
  const respaldos: NavItem = {
    id: 'respaldos',
    label: 'Respaldos',
    subtitle: 'Copias y restauración de datos',
    icon: DatabaseBackup,
    badge: '',
  };
  const auditoria: NavItem = {
    id: 'auditoria',
    label: 'Auditoría',
    subtitle: 'Historial de movimientos',
    icon: History,
    badge: '',
  };
  const configuracion: NavItem = {
    id: 'configuracion',
    label: 'Configuración',
    subtitle: 'Puntos, tiempos y ranking',
    icon: Settings2,
    badge: '',
  };
  const usuarios: NavItem = {
    id: 'usuarios',
    label: 'Usuarios',
    subtitle: 'Usuarios y permisos del sistema',
    icon: UsersIcon as IconType,
    badge: '',
  };

  const groups: NavGroup[] = [
    { id: 'gestion', label: 'Gestión', items: [registro, fights, ranking, exportaciones] },
    { id: 'datos', label: 'Datos', items: [respaldos] },
    { id: 'sistema', label: 'Sistema', items: [auditoria, configuracion, usuarios] },
  ];

  const allItems = groups.flatMap((group) => group.items);
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? allItems.filter((item) => item.label.toLowerCase().includes(normalized) || item.subtitle.toLowerCase().includes(normalized))
    : [];

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      persistCollapsed(!prev);
      return !prev;
    });
  }, []);

  const openSearch = useCallback(() => {
    setCollapsed(false);
    persistCollapsed(false);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'k') {
        event.preventDefault();
        openSearch();
      }
      if (key === 'b') {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch, toggleCollapsed]);

  function selectItem(id: string) {
    onSelectTab(id);
    setQuery('');
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        data-motion-icon-group=""
        onClick={() => selectItem(item.id)}
        className={`group relative w-full flex items-center py-3 rounded-xl transition-all duration-150 ${collapsed ? 'justify-center px-0' : 'justify-between px-3'
          } ${isActive
            ? 'bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent text-slate-900 dark:text-white font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
      >
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-orange-500" />}
        <span className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-[22px] h-[22px] flex-shrink-0 transition-colors ${isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-500'
              }`}
          />
          {!collapsed && <span className="text-sm truncate">{item.label}</span>}
        </span>
        {item.badge && !collapsed && (
          <span className="min-w-[24px] h-6 px-1.5 grid place-items-center rounded-full text-[11px] font-bold tabular-nums bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            {item.badge}
          </span>
        )}
        {item.badge && collapsed && <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-orange-500" />}
        <SidebarTooltip label={item.label} visible={collapsed} />
      </button>
    );
  }

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col h-full flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 transition-[width] duration-200 no-print ${collapsed ? 'w-[88px] overflow-visible' : 'w-72 overflow-hidden'
          }`}
      >
        <div
          className={`h-[68px] flex-shrink-0 flex items-center border-b border-slate-200 dark:border-white/5 ${collapsed ? 'justify-center' : 'gap-2.5 px-4'
            }`}
        >
          <div className="relative flex-shrink-0">
            <img src={roosterLogo} alt="SGTG" className="w-[42px] h-[42px] object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-white truncate">SGTG</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Gestión del torneo</div>
            </div>
          )}
        </div>

        <div className={`px-4 pt-4 pb-2 flex-shrink-0 ${collapsed ? 'overflow-visible' : ''}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={openSearch}
              className="group relative icon-search w-full h-11 grid place-items-center rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors"
            >
              <Search className="w-4 h-4" />
              <SidebarTooltip label="Buscar módulo (Ctrl+K)" visible={true} />
            </button>
          ) : (
            <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && results[0]) selectItem(results[0].id);
                  if (event.key === 'Escape') {
                    setQuery('');
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Buscar módulo..."
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300 border border-slate-300/60 dark:border-white/10">
                Ctrl+K
              </kbd>
            </label>
          )}
        </div>

        <nav className={`flex-1 px-4 py-2 space-y-3 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {normalized ? (
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">Resultados</div>
              <div className="space-y-1">
                {results.length > 0 ? (
                  results.map(renderItem)
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
                )}
              </div>
            </div>
          ) : (
            groups.map((group) => {
              const isOpen = openGroups[group.id];
              return (
                <div key={group.id}>
                  {collapsed ? (
                    <div className="mx-2 mb-2 h-px bg-slate-200 dark:bg-white/10" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <span>{group.label}</span>
                      <span className="flex items-center gap-2 text-slate-400 font-semibold">
                        <span className="tabular-nums text-xs">{group.items.length}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                      </span>
                    </button>
                  )}
                  {(collapsed || isOpen) && <div className="space-y-1">{group.items.map(renderItem)}</div>}
                </div>
              );
            })
          )}
        </nav>

        <div className={`p-4 border-t border-slate-200 dark:border-white/5 space-y-2 flex-shrink-0 ${collapsed ? 'overflow-visible' : ''}`}>
          <button
            type="button"
            data-motion-icon-group=""
            onClick={onManageTournaments}
            className={`group relative w-full flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              }`}
          >
            <Trophy className="w-5 h-5 text-orange-500 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">Torneo Activo</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{torneo || 'Sin nombre'}</span>
                </span>
                <span
                  className="w-8 h-8 rounded-full border-2 border-orange-500/70 grid place-items-center text-[11px] font-bold text-slate-900 dark:text-white tabular-nums flex-shrink-0"
                >
                  {fightsCount}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </>
            )}
            <SidebarTooltip label={`Torneo Activo — ${torneo || 'Sin nombre'}`} visible={collapsed} />
          </button>
          <button
            type="button"
            data-motion-icon-group=""
            onClick={toggleCollapsed}
            className={`group relative w-full h-11 flex items-center text-sm text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors ${collapsed ? 'justify-center' : 'justify-between px-3'
              }`}
          >
            <span className="flex items-center gap-3">
              {collapsed ? <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" /> : <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" />}
              {!collapsed && <span className="font-medium">Colapsar</span>}
            </span>
            {!collapsed && (
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300 border border-slate-300/60 dark:border-white/10">
                Ctrl+B
              </kbd>
            )}
            <SidebarTooltip label="Expandir (Ctrl+B)" visible={collapsed} />
          </button>
        </div>
      </aside>

      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[76px] bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-white/5 flex gap-1 p-2 overflow-x-auto no-print">
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-w-[82px] flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-150 ${isActive
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
              <span className="text-[10px] truncate max-w-[78px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}