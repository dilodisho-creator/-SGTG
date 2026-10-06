import { FormEvent, useState } from 'react';
import { Archive, CalendarDays, Check, Plus, Trophy, X } from '../animated-icons';
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

export function TournamentManagerModal({ activeId, tournaments, onClose, onCreate, onSelect, onEdit, onArchive, onReactivate, onDelete }: Props) {
  const [form, setForm] = useState({ nombre: '', fecha: new Date().toISOString().slice(0, 10) });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

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
      () => editing ? onEdit(editing, form.nombre, form.fecha) : onCreate(form.nombre, form.fecha),
      editing ? 'Torneo actualizado correctamente' : 'Torneo creado correctamente'
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div className="flex min-w-0 w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="shrink-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3"><div className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 grid place-items-center"><Trophy className="w-5 h-5" /></div><div><h2 className="font-extrabold text-slate-900 dark:text-white">Torneos</h2><p className="text-xs text-slate-500">Crea, selecciona, archiva y elimina torneos</p></div></div>
            <button type="button" onClick={onClose} className="shrink-0 p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid min-h-0 min-w-0 grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-3 sm:gap-5 overflow-y-auto p-3 sm:p-5">
            <form onSubmit={submit} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 self-start">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{editing ? 'Editar torneo' : 'Nuevo torneo'}</h3>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Nombre<input required maxLength={100} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className={`${fieldClass} mt-1.5`} /></label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Fecha<input required type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className={`${fieldClass} mt-1.5`} /></label>
              <div className="flex gap-2"><button disabled={busy} className="flex-1 rounded-xl bg-brand-500 text-white px-3 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">{editing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editing ? 'Guardar' : 'Crear'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm({ nombre: '', fecha: new Date().toISOString().slice(0, 10) }); }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3"><X className="w-4 h-4" /></button>}</div>
            </form>
            <div className="min-w-0 space-y-2">
              {tournaments.map((item) => (
                <div key={item.id} className={`min-w-0 rounded-xl border p-3 flex flex-wrap items-center gap-3 ${item.id === activeId ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 grid place-items-center"><CalendarDays className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm text-slate-900 dark:text-white break-words [overflow-wrap:anywhere]">{item.nombre}</span>{item.id === activeId && <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">Actual</span>}{item.estado === 'archivado' && <span className="rounded-full bg-slate-500/10 text-slate-500 px-2 py-0.5 text-[10px] font-bold">Archivado</span>}</div><div className="text-xs text-slate-500">{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}</div></div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                  {item.estado === 'activo' && item.id !== activeId && <button disabled={busy} type="button" onClick={() => void run(() => onSelect(item.id), 'Torneo seleccionado como activo')} className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">Usar</button>}
                  <EditButton onClick={() => { setEditing(item.id); setForm({ nombre: item.nombre, fecha: item.fecha }); }} aria-label="Editar torneo" title="Editar torneo" />
                  {item.estado === 'activo' && <button type="button" onClick={async () => {
                    const ok = await confirm({ title: `Archivar ${item.nombre}`, description: 'El torneo se archiva y ya no será el activo. Podrá reactivarlo luego.', confirmLabel: 'Archivar', cancelLabel: 'Cancelar', variant: 'warning' });
                    if (ok) void run(() => onArchive(item.id), 'Torneo archivado correctamente');
                  }} className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-500/10" aria-label="Archivar" title="Archivar torneo"><Archive className="w-4 h-4" /></button>}
                  {item.estado === 'archivado' && <SkipBackButton onClick={() => void run(() => onReactivate(item.id), 'Torneo reactivado correctamente')} title="Reactivar torneo" aria-label="Reactivar torneo" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300" size={20}>Reactivar</SkipBackButton>}
                  <TrashButton onClick={() => void handleDelete(item)} aria-label="Eliminar torneo con respaldo" title="Eliminar torneo (crea respaldo automático)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  );
}