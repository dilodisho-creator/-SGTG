import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { FightsPage } from './pages/FightsPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { LoginPage } from './pages/LoginPage';
import { RankingPage } from './pages/RankingPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditPage } from './pages/AuditPage';
import { BackupsPage } from './pages/BackupsPage';
import { ExportPage } from './pages/ExportPage';
import { UsersPage } from './pages/UsersPage';
import { StopwatchModal } from './components/StopwatchModal';
import { TournamentManagerModal } from './components/TournamentManagerModal';
import { archiveTournament, createTournament, deleteTournament, editTournament, exportTournament, getSession, getTournamentData, getTournaments, importTournamentData, logout, reactivateTournament, readOfficialWorkbook, resetTournamentData, selectTournament } from './services/api';
import { Permission, TournamentData, TournamentSummary } from './types';
import { useConfirm } from './components/ui/ConfirmDialog';
import { TriangleAlert } from './animated-icons';
import { Toaster, sileo } from 'sileo';
import roosterLogo from './assets/rooster-logo.png';

type Tab = 'registro' | 'fights' | 'ranking' | 'exportaciones' | 'respaldos' | 'auditoria' | 'configuracion' | 'usuarios';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('registro');
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string; rolId: string; permisos: Permission[] } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showTournaments, setShowTournaments] = useState(false);
  const [tournaments, setTournaments] = useState<{ activoId: string; torneos: TournamentSummary[] }>({ activoId: '', torneos: [] });
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    const stored = localStorage.getItem('gallos_simple_theme');
    const dark = stored !== null ? stored === 'dark' : true;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('gallos_simple_theme', next ? 'dark' : 'light');
      return next;
    });
  }

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const tournament = await getTournamentData();
      setData(tournament);
      setTournaments(await getTournaments());
    } catch (err) {
      setError('No se pudo conectar con el sistema local. Verifique que el backend esté iniciado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function verifySession() {
      if (!localStorage.getItem('gallos_simple_token')) {
        setCheckingSession(false);
        setLoading(false);
        return;
      }
      try {
        const session = await getSession();
        setUser({ username: session.user.username, role: session.user.role ?? 'Administrador', rolId: session.user.rolId ?? '', permisos: session.user.permisos ?? [] });
      } catch {
        localStorage.removeItem('gallos_simple_token');
      } finally {
        setCheckingSession(false);
      }
    }
    void verifySession();
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [loadData, user]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && e.target === document.body && showStopwatch) {
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showStopwatch]);

  async function handleResetData() {
    const ok = await confirm({
      title: 'Borrar torneo actual',
      description: 'Esta acción borrará galpones, gallos, peleas y resultados del torneo actual. Se creará un respaldo automático antes de continuar.',
      confirmLabel: 'Sí, borrar todo',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const tournament = await resetTournamentData();
      setData(tournament);
      sileo.success({ title: 'Datos restablecidos', description: 'Se guardó un respaldo automático.' });
    } catch (resetError) {
      sileo.error({ title: 'Error', description: resetError instanceof Error ? resetError.message : 'No se pudieron restablecer los datos.' });
    }
  }

  async function handleExport() {
    if (!data) return;
    try {
      await exportTournament(data);
      sileo.success({ title: 'Exportación lista', description: 'Archivo Excel generado correctamente.' });
    } catch {
      sileo.error({ title: 'Error', description: 'No se pudo generar el archivo Excel.' });
    }
  }

  async function handleImport(file: File) {
    const ok = await confirm({
      title: 'Importar archivo Excel',
      description: 'La importación reemplazará los datos actuales. Se creará un respaldo automático antes de continuar.',
      confirmLabel: 'Sí, importar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;
    sileo.promise(
      async () => {
        const parsed = await readOfficialWorkbook(file);
        const imported = await importTournamentData(parsed.data);
        setData(imported);
        setActiveTab('fights');
        return parsed;
      },
      {
        loading: { title: 'Importando...', description: 'Analizando el archivo Excel.' },
        success: (parsed) => ({ title: 'Importación completada', description: (parsed as { warnings: string[] }).warnings.length ? (parsed as { warnings: string[] }).warnings.join(' ') : 'Formato oficial importado correctamente.' }),
        error: (err) => ({ title: 'Error al importar', description: err instanceof Error ? err.message : 'No se pudo importar el archivo Excel.' }),
      }
    );
  }



  async function handleLogout() {
    await logout();
    setUser(null);
    setData(null);
    setError(null);
  }

  const totalFights = data
    ? Object.values(data.hojas).flat().filter((fight) => fight.gallo1.galpon && fight.gallo2.galpon && !fight.gallo1.resultado && !fight.gallo2.resultado).length
    : 0;

  if (checkingSession || (user && loading)) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-5">
          <div className="relative">
            <img
              src={roosterLogo}
              alt="SGTG"
              className="w-24 h-24 object-contain animate-pulse drop-shadow-[0_0_32px_rgba(249,115,22,0.6)]"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-white text-base font-bold tracking-wide">SGTG</p>
            <p className="text-slate-400 text-sm">Preparando el torneo...</p>
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <Toaster position="bottom-right" theme={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={(loggedUser) => { setLoading(true); setUser(loggedUser); }} />
        <Toaster position="bottom-right" theme={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-6 p-4">
          <TriangleAlert className="w-12 h-12 text-amber-400" />
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold mb-2">Sistema local no disponible</h2>
            <p className="text-slate-400 text-sm mb-6">{error}</p>
            <div className="bg-slate-800 rounded-xl p-4 text-left text-sm mb-6">
              <p className="text-slate-300 mb-2">Abra <strong>iniciar.bat</strong> dentro de la carpeta <strong>simple</strong> o inicie el backend manualmente:</p>
              <code className="text-emerald-400 block">cd backend &amp;&amp; node dist/server.js</code>
            </div>
            <button
              onClick={loadData}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl font-bold text-white transition-colors"
            >
              Reintentar conexión
            </button>
          </div>
        </div>
        <Toaster position="bottom-right" theme={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar
        currentTab={activeTab}
        onSelectTab={tab => setActiveTab(tab as Tab)}
        fightsCount={totalFights}
        torneo={data?.configuracion.nombreTorneo ?? ''}
        onManageTournaments={() => setShowTournaments(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenStopwatch={() => setShowStopwatch(true)}
          onResetData={handleResetData}
          onExport={handleExport}
          onImport={handleImport}
          username={user.username}
          role={user.role}
          onLogout={handleLogout}
          coliseo={data?.configuracion.nombreColiseo ?? ''}
          torneo={data?.configuracion.nombreTorneo ?? ''}
          onManageTournaments={() => setShowTournaments(true)}
          currentTab={activeTab}
        />
        <div className="flex-1 overflow-hidden flex flex-col pb-20 lg:pb-0">
          {activeTab === 'registro' && (
            <RegistrationPage data={data} onDataChange={loadData} />
          )}
          {activeTab === 'fights' && (
            <FightsPage data={data} onDataChange={loadData} onOpenSettings={() => setActiveTab('configuracion')} />
          )}
          {activeTab === 'ranking' && <RankingPage data={data} />}
          {activeTab === 'exportaciones' && <ExportPage data={data} />}
          {activeTab === 'respaldos' && <BackupsPage onDataChange={loadData} />}
          {activeTab === 'auditoria' && <AuditPage data={data} />}
          {activeTab === 'configuracion' && <SettingsPage data={data} onDataChange={loadData} />}
          {activeTab === 'usuarios' && <UsersPage currentUsername={user.username} currentRolId={user.rolId} />}
        </div>
      </div>
      {showStopwatch && (
        <StopwatchModal
          data={data}
          onDataChange={loadData}
          onClose={() => setShowStopwatch(false)}
        />
      )}

      {showTournaments && (
        <TournamentManagerModal
          activeId={tournaments.activoId}
          tournaments={tournaments.torneos}
          onClose={() => setShowTournaments(false)}
          onCreate={async (nombre, fecha) => { setData(await createTournament({ nombre, fecha })); setTournaments(await getTournaments()); setActiveTab('registro'); }}
          onSelect={async (id) => { setData(await selectTournament(id)); setTournaments(await getTournaments()); setShowTournaments(false); setActiveTab('registro'); }}
          onEdit={async (id, nombre, fecha) => { await editTournament(id, { nombre, fecha }); await loadData(); }}
          onArchive={async (id) => { setData(await archiveTournament(id)); setTournaments(await getTournaments()); }}
          onReactivate={async (id) => { setData(await reactivateTournament(id)); setTournaments(await getTournaments()); setShowTournaments(false); setActiveTab('registro'); }}
          onDelete={async (id) => {
            const result = await deleteTournament(id);
            setTournaments(await getTournaments());
            if (result.switched) {
              await loadData();
            }
            return result;
          }}
        />
      )}

      <Toaster position="bottom-right" theme={isDark ? 'light' : 'dark'} />
      {confirmDialog}
    </div>
  );
}

export default App;