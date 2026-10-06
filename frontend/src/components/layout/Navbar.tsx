import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, LogOut, Maximize, Minimize, Moon, Plus, Printer, RefreshCw, Sun, Timer, Trophy, Upload, X } from '../../animated-icons';
import roosterLogo from '../../assets/rooster-logo.png';

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenStopwatch: () => void;
  onResetData: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  username: string;
  role: string;
  onLogout: () => void;
  coliseo: string;
  torneo: string;
  onManageTournaments: () => void;
  currentTab: string;
}

const TAB_TITLES: Record<string, string> = {
  registro: 'Registro',
  fights: 'Enfrentamientos',
  ranking: 'Ranking',
  exportaciones: 'Exportaciones',
  respaldos: 'Respaldos',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
  usuarios: 'Usuarios y Permisos',
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  registro: 'Registra galpones y gallos participantes del torneo',
  fights: 'Peleas programadas y finalizadas del evento',
  ranking: 'Posiciones y puntajes de cada galpón en el torneo',
  exportaciones: 'Descarga los datos del torneo en formato Excel',
  respaldos: 'Crea y recupera copias de los datos del torneo',
  auditoria: 'Historial cronológico de cambios y operaciones',
  configuracion: 'Ajustes generales y reglas del torneo',
  usuarios: 'Gestiona los usuarios del sistema y configura los roles con sus permisos',
};

export function Navbar({ isDark, onToggleTheme, onOpenStopwatch, onResetData, onExport, onImport, username, role, onLogout, coliseo, torneo, onManageTournaments, currentTab }: NavbarProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (quickRef.current && !quickRef.current.contains(target)) setQuickOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setQuickOpen(false);
        setUserOpen(false);
      }
    }
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = '';
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  const quickItems = [
    { id: 'cronometro', title: 'Cronómetro', subtitle: 'Cronómetro oficial de valla', icon: Timer, tone: 'text-amber-500', action: onOpenStopwatch, cls: '' },
    { id: 'torneos', title: 'Torneos', subtitle: 'Administrar o crear torneo', icon: Trophy, tone: 'text-indigo-400', action: onManageTournaments, cls: 'icon-trophy' },
    { id: 'importar', title: 'Importar Excel', subtitle: 'Formato oficial de Excel', icon: Upload, tone: 'text-emerald-500', action: () => fileInput.current?.click(), cls: 'icon-upload' },
    { id: 'exportar', title: 'Exportar Excel', subtitle: 'Descargar datos del torneo', icon: Download, tone: 'text-orange-500', action: onExport, cls: 'icon-download' },
    { id: 'imprimir', title: 'Imprimir', subtitle: 'Vista actual', icon: Printer, tone: 'text-sky-400', action: () => window.print(), cls: '' },
    { id: 'reset', title: 'Borrar torneo actual', subtitle: 'Elimina galpones, gallos y peleas con respaldo', icon: RefreshCw, tone: 'text-red-400', action: onResetData, cls: 'icon-refresh' },
  ];

  const initials = username.trim().slice(0, 2).toUpperCase() || 'US';


  return (
    <header className="relative z-30 h-[68px] flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-3 sm:px-6 flex items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <div className="lg:hidden flex-shrink-0">
          <img src={roosterLogo} alt="SGTG" className="w-10 h-10 object-contain" />
        </div>
        {TAB_TITLES[currentTab] && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10 flex-shrink-0" />
            <div className="min-w-0">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {TAB_TITLES[currentTab]}
              </span>
              {TAB_DESCRIPTIONS[currentTab] && (
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                  {TAB_DESCRIPTIONS[currentTab]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <input ref={fileInput} type="file" accept=".xlsx,.xls" onChange={selectFile} className="hidden" />

      <div className="flex items-center gap-1 sm:gap-1.5">
        <div ref={quickRef} className="relative">
          <button
            type="button"
            data-motion-icon-group=""
            onClick={() => {
              setQuickOpen((prev) => !prev);
              setUserOpen(false);
            }}
            title="Acceso rápido"
            className={`w-11 h-11 grid place-items-center rounded-xl transition-all duration-150 ${quickOpen
                ? 'icon-close bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'icon-plus text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            {quickOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
          {quickOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl shadow-black/30 p-3 z-50">
              <div className="px-2 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Acceso rápido
              </div>
              <div className="space-y-0.5">
                {quickItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-motion-icon-group=""
                      onClick={() => {
                        setQuickOpen(false);
                        item.action();
                      }}
                      className={`${item.cls} w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${item.tone}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <span className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />

        <button
          type="button"
          data-motion-icon-group=""
          onClick={onToggleTheme}
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          className="w-11 h-11 grid place-items-center rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          type="button"
          data-motion-icon-group=""
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="hidden sm:grid w-11 h-11 place-items-center rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        <span className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />

        <div ref={userRef} className="relative">
          <button
            type="button"
            data-motion-icon-group=""
            onClick={() => {
              setUserOpen((prev) => !prev);
              setQuickOpen(false);
            }}
            className="flex items-center gap-3 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <span className="relative w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-amber-500 text-white grid place-items-center text-sm font-extrabold shadow-lg shadow-orange-600/20 flex-shrink-0">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />
            </span>
            <span className="hidden md:block text-left min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{username}</span>
              <span className="block text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                {role}
              </span>
            </span>
            <ChevronDown className={`hidden md:block w-4 h-4 text-slate-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl shadow-black/30 p-2 z-50">
              <div className="px-3 py-2.5 border-b border-slate-200 dark:border-white/10 mb-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{username}</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 truncate">{role}</div>
              </div>
              <button
                type="button"
                data-motion-icon-group=""
                onClick={() => {
                  setUserOpen(false);
                  onLogout();
                }}
                className="icon-logout w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}