import { FormEvent, useMemo, useState } from 'react';
import { Pin } from 'lucide-react';
import { Archive, CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Search, Trophy, X } from '../animated-icons';
import { TournamentSummary } from '../types';
import { TrashButton } from './ui/TrashButton';
import { EditButton } from './ui/EditButton';
import { SkipBackButton } from './ui/SkipBackButton';
import { useConfirm } from './ui/ConfirmDialog';
import { sileo } from 'sileo';

interface Props {
  activeId: string;
  tournaments: TournamentSummary[];
  onClose: () => void;
  onCreate: (nombre: string, fecha: string) => Promise<void>;
  onSelect: (id: string) => Promise<void>;
  onEdit: (id: string, nombre: string, fecha: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<{ backupFilename?: string; switched?: boolean; newActiveId?: string } | void>;
}

const fieldClass = 'min-w-0 max-w-full w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const ITEMS_PER_PAGE = 5;

function getTournamentTimestamp(item: TournamentSummary): number {
  if (item.creadoEn) {
    const val = Date.parse(item.creadoEn);
    if (!Number.isNaN(val) && val > 0) return val;
  }
  if (item.actualizadoEn) {
    const val = Date.parse(item.actualizadoEn);
    if (!Number.isNaN(val) && val > 0) return val;
  }
  if (item.fecha) {
    const val = Date.parse(`${item.fecha}T00:00:00`);
    if (!Number.isNaN(val)) return val;
  }
  return 0;
}

export function TournamentManagerModal({ activeId, tournaments, onClose, onCreate, onSelect, onEdit, onArchive, onReactivate, onDelete }: Props) {
  const [form, setForm] = useState({ nombre: '', fecha: new Date().toISOString().slice(0, 10) });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('sgtg_pinned_tournaments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('sgtg_pinned_tournaments', JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }

  const activeTournament = useMemo(() => {
    return tournaments.find((item) => item.id === activeId) ?? null;
  }, [tournaments, activeId]);

  const otherTournaments = useMemo(() => {
    return tournaments.filter((item) => item.id !== activeId);
  }, [tournaments, activeId]);

  const sortedOtherTournaments = useMemo(() => {
    return [...otherTournaments].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const diff = getTournamentTimestamp(b) - getTournamentTimestamp(a);
      if (diff !== 0) return diff;
      const createdDiff = (b.creadoEn || '').localeCompare(a.creadoEn || '');
      if (createdDiff !== 0) return createdDiff;
      return b.id.localeCompare(a.id);
    });
  }, [otherTournaments, pinnedIds]);

  const filteredOtherTournaments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedOtherTournaments;
    return sortedOtherTournaments.filter((item) => {
      const nameMatch = item.nombre.toLowerCase().includes(query);
      const dateMatch = item.fecha.toLowerCase().includes(query);
      const formattedDate = new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE');
      const formattedMatch = formattedDate.includes(query);
      const statusMatch = item.estado.toLowerCase().includes(query);
      return nameMatch || dateMatch || formattedMatch || statusMatch;
    });
  }, [sortedOtherTournaments, searchQuery]);

  const showActiveRow = useMemo(() => {
    if (!activeTournament) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const nameMatch = activeTournament.nombre.toLowerCase().includes(query);
    const dateMatch = activeTournament.fecha.toLowerCase().includes(query);
    const formattedDate = new Date(`${activeTournament.fecha}T00:00:00`).toLocaleDateString('es-PE');
    const formattedMatch = formattedDate.includes(query);
    const statusMatch = activeTournament.estado.toLowerCase().includes(query);
    return nameMatch || dateMatch || formattedMatch || statusMatch;
  }, [activeTournament, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOtherTournaments.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedOtherTournaments = filteredOtherTournaments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  async function run(action: () => Promise<void>, successTitle?: string) {
    setBusy(true);
    try {
      await action();
      setEditing(null);
      setForm({ nombre: '', fecha: new Date().toISOString().slice(0, 10) });
      if (successTitle) {
        sileo.success({ title: 'Gestión de torneos', description: successTitle });
      }
    } catch (error) {
      sileo.error({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo completar la operación.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: TournamentSummary) {
    if (tournaments.length <= 1) {
      sileo.warning({
        title: 'No se puede eliminar',
        description: 'Debe haber al menos un torneo en el sistema.',
      });
      return;
    }

    const isActive = item.id === activeId;
    const ok = await confirm({
      title: isActive ? `Eliminar "${item.nombre}" (Actual)` : `Eliminar "${item.nombre}"`,
      description: isActive
        ? 'Se creará automáticamente una copia de respaldo en la sección de Respaldos antes de eliminarlo y se activará otro torneo disponible.'
        : 'Se creará automáticamente una copia de respaldo en la sección de Respaldos antes de eliminar definitivamente este torneo.',
      confirmLabel: 'Sí, respaldar y eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    await run(
      async () => {
        await onDelete(item.id);
      },
      isActive
        ? 'Torneo eliminado con respaldo automático y cambiado al nuevo torneo activo.'
        : 'Torneo eliminado correctamente y respaldo automático guardado.'
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      async () => {
        if (editing) {
          await onEdit(editing, form.nombre, form.fecha);
        } else {
          await onCreate(form.nombre, form.fecha);
          setCurrentPage(1);
          setSearchQuery('');
        }
      },
      editing ? 'Torneo actualizado correctamente' : 'Torneo creado correctamente'
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div className="flex min-w-0 w-full max-w-6xl h-[680px] sm:h-[720px] max-h-[calc(100dvh-1rem)] sm:max-h-[95dvh] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="shrink-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 grid place-items-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white">Torneos</h2>
                <p className="text-xs text-slate-500">Crea, selecciona, archiva y elimina torneos</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid flex-1 min-h-0 min-w-0 grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-3 sm:gap-5 overflow-y-auto p-3 sm:p-5">
            <form onSubmit={submit} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 self-start">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{editing ? 'Editar torneo' : 'Nuevo torneo'}</h3>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Nombre
                <input required maxLength={100} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Fecha
                <input required type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className={`${fieldClass} mt-1.5`} />
              </label>
              <div className="flex gap-2">
                <button disabled={busy} className="flex-1 rounded-xl bg-brand-500 text-white px-3 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {editing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editing ? 'Guardar' : 'Crear'}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setForm({ nombre: '', fecha: new Date().toISOString().slice(0, 10) }); }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
            <div className="flex min-w-0 flex-col gap-3.5 h-full">
              {showActiveRow && activeTournament && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Torneo en uso ahora
                    </span>
                  </div>
                  <div className="min-w-0 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15 p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 shadow-xs">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white break-words [overflow-wrap:anywhere]">
                          {activeTournament.nombre}
                        </span>
                        <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
                          En uso
                        </span>
                        {pinnedIds.includes(activeTournament.id) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            Fijado
                          </span>
                        )}
                        {activeTournament.estado === 'archivado' && (
                          <span className="rounded-full bg-slate-500/10 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                            Archivado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(`${activeTournament.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePin(activeTournament.id)}
                        title={pinnedIds.includes(activeTournament.id) ? 'Desfijar torneo' : 'Fijar torneo'}
                        aria-label={pinnedIds.includes(activeTournament.id) ? 'Desfijar torneo' : 'Fijar torneo'}
                        className={`shrink-0 p-2 rounded-lg transition-colors ${
                          pinnedIds.includes(activeTournament.id)
                            ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        <Pin className={`w-4 h-4 ${pinnedIds.includes(activeTournament.id) ? 'fill-current' : ''}`} />
                      </button>
                      <EditButton
                        onClick={() => {
                          setEditing(activeTournament.id);
                          setForm({ nombre: activeTournament.nombre, fecha: activeTournament.fecha });
                        }}
                        aria-label="Editar torneo"
                        title="Editar torneo"
                      />
                      {activeTournament.estado === 'activo' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Archivar ${activeTournament.nombre}`,
                              description: 'El torneo se archiva y ya no será el activo. Podrá reactivarlo luego.',
                              confirmLabel: 'Archivar',
                              cancelLabel: 'Cancelar',
                              variant: 'warning',
                            });
                            if (ok) void run(() => onArchive(activeTournament.id), 'Torneo archivado correctamente');
                          }}
                          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-500/10"
                          aria-label="Archivar"
                          title="Archivar torneo"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <TrashButton
                        onClick={() => void handleDelete(activeTournament)}
                        aria-label="Eliminar torneo con respaldo"
                        title="Eliminar torneo (crea respaldo automático)"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar otros torneos por nombre o fecha..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="shrink-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                  {filteredOtherTournaments.length} {filteredOtherTournaments.length === 1 ? 'disponible' : 'disponibles'}
                </div>
              </div>

              <div className="min-w-0 space-y-2.5 flex-1 min-h-[355px]">
                {filteredOtherTournaments.length === 0 ? (
                  <div className="h-full min-h-[355px] flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Search className="w-7 h-7 mb-1.5 opacity-40" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {searchQuery ? 'No se encontraron otros torneos con ese criterio' : 'No hay otros torneos registrados'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery ? 'Prueba con otro término de búsqueda' : 'Puedes crear uno nuevo desde el panel izquierdo'}
                    </p>
                  </div>
                ) : (
                  paginatedOtherTournaments.map((item) => (
                    <div key={item.id} className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 grid place-items-center">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white break-words [overflow-wrap:anywhere]">
                            {item.nombre}
                          </span>
                          {pinnedIds.includes(item.id) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                              <Pin className="w-2.5 h-2.5 fill-current" />
                              Fijado
                            </span>
                          )}
                          {item.estado === 'archivado' && (
                            <span className="rounded-full bg-slate-500/10 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                              Archivado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                        </div>
                      </div>
                      <div className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 shrink-0">
                        {item.estado === 'activo' && (
                          <button
                            disabled={busy}
                            type="button"
                            onClick={() => void run(() => onSelect(item.id), 'Torneo seleccionado como activo')}
                            className="rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 px-2.5 py-1.5 text-xs font-bold transition-colors"
                          >
                            Usar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePin(item.id)}
                          title={pinnedIds.includes(item.id) ? 'Desfijar torneo' : 'Fijar torneo'}
                          aria-label={pinnedIds.includes(item.id) ? 'Desfijar torneo' : 'Fijar torneo'}
                          className={`shrink-0 p-2 rounded-lg transition-colors ${
                            pinnedIds.includes(item.id)
                              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          <Pin className={`w-4 h-4 ${pinnedIds.includes(item.id) ? 'fill-current' : ''}`} />
                        </button>
                        <EditButton
                          onClick={() => {
                            setEditing(item.id);
                            setForm({ nombre: item.nombre, fecha: item.fecha });
                          }}
                          aria-label="Editar torneo"
                          title="Editar torneo"
                        />
                        {item.estado === 'activo' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Archivar ${item.nombre}`,
                                description: 'El torneo se archiva y ya no será el activo. Podrá reactivarlo luego.',
                                confirmLabel: 'Archivar',
                                cancelLabel: 'Cancelar',
                                variant: 'warning',
                              });
                              if (ok) void run(() => onArchive(item.id), 'Torneo archivado correctamente');
                            }}
                            className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-500/10"
                            aria-label="Archivar"
                            title="Archivar torneo"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {item.estado === 'archivado' && (
                          <SkipBackButton
                            onClick={() => void run(() => onReactivate(item.id), 'Torneo reactivado correctamente')}
                            title="Reactivar torneo"
                            aria-label="Reactivar torneo"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300"
                            size={20}
                          >
                            Reactivar
                          </SkipBackButton>
                        )}
                        <TrashButton
                          onClick={() => void handleDelete(item)}
                          aria-label="Eliminar torneo con respaldo"
                          title="Eliminar torneo (crea respaldo automático)"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {filteredOtherTournaments.length > 0 && (
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <span>
                    Mostrando {filteredOtherTournaments.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredOtherTournaments.length)} de {filteredOtherTournaments.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-semibold text-slate-700 dark:text-slate-200">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  );
}