import { useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, Check, DatabaseBackup, HardDrive, RefreshCw, Search, Trash2, X } from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { createBackup, deleteBackup, getBackups, restoreBackup } from '../services/api';
import { BackupEntry } from '../types';
import { Pagination } from '../components/ui/Pagination';
import { sileo } from 'sileo';
import { useConfirm } from '../components/ui/ConfirmDialog';

export function BackupsPage({ onDataChange }: { onDataChange: () => void }) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function load() {
    try {
      const data = await getBackups();
      setBackups(data);
    } catch {
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setLoading(true);
    try {
      await createBackup();
      await load();
      sileo.success({ title: 'Respaldo creado', description: 'La copia de seguridad se guardó correctamente.' });
    } catch (error) {
      sileo.error({ title: 'Error al crear respaldo', description: error instanceof Error ? error.message : 'No se pudo crear el respaldo.' });
    } finally {
      setLoading(false);
    }
  }

  async function remove(filename: string) {
    setLoading(true);
    try {
      await deleteBackup(filename);
      await load();
      setConfirmingDelete(null);
      sileo.success({ title: 'Respaldo eliminado', description: 'La copia de seguridad fue eliminada.' });
    } catch (error) {
      sileo.error({ title: 'Error al eliminar', description: error instanceof Error ? error.message : 'No se pudo eliminar el respaldo.' });
    } finally {
      setLoading(false);
    }
  }

  async function restore(filename: string) {
    const ok = await confirm({
      title: 'Restaurar respaldo',
      description: 'Se guardará automáticamente una copia del estado actual antes de sobreescribir los datos del torneo.',
      confirmLabel: 'Sí, restaurar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await restoreBackup(filename);
      await onDataChange();
      await load();
      sileo.success({ title: 'Respaldo restaurado', description: 'Los datos del torneo se recuperaron correctamente.' });
    } catch (error) {
      sileo.error({ title: 'Error al restaurar', description: error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.' });
    } finally {
      setLoading(false);
    }
  }

  const filteredBackups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return backups
      .filter(
        (b) =>
          !q ||
          b.filename.toLowerCase().includes(q) ||
          new Date(b.createdAt).toLocaleString('es-PE').toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [backups, search]);

  const paginatedBackups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBackups.slice(start, start + pageSize);
  }, [filteredBackups, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredBackups.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <PageShell
        actions={
          <button
            onClick={create}
            disabled={loading}
            data-motion-icon-group=""
            className="rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <DatabaseBackup className="w-4 h-4" />
            Crear respaldo
          </button>
        }
      >
        <div className="h-full flex flex-col min-h-0">
          <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                <HardDrive className="w-4 h-4 text-brand-500" />
                <span>Copias disponibles ({backups.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar copia..."
                    className="w-full sm:w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  onClick={load}
                  data-motion-icon-group=""
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Actualizar lista de respaldos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedBackups.map((backup) => (
                <div
                  key={backup.filename}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center flex-shrink-0">
                      <DatabaseBackup className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {backup.filename}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(backup.createdAt).toLocaleString('es-PE')} ·{' '}
                        <span className="font-mono">{(backup.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                    {confirmingDelete === backup.filename ? (
                      <>
                        <span className="text-xs text-slate-500 hidden sm:inline">¿Eliminar?</span>
                        <button
                          onClick={() => void remove(backup.filename)}
                          disabled={loading}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Sí
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => restore(backup.filename)}
                          disabled={loading}
                          data-motion-icon-group=""
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <ArchiveRestore className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Restaurar
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(backup.filename)}
                          disabled={loading}
                          data-motion-icon-group=""
                          className="rounded-xl border border-red-200 dark:border-red-800 px-2.5 py-2 text-xs font-bold text-red-500 flex items-center justify-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Eliminar respaldo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {filteredBackups.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-400">
                  {search
                    ? 'No se encontraron copias con ese criterio de búsqueda.'
                    : 'Todavía no existen respaldos manuales.'}
                </div>
              )}
            </div>

            <div className="flex-shrink-0">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={filteredBackups.length}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
                itemLabel="copias de respaldo"
              />
            </div>
          </div>
        </div>
      </PageShell>
      {confirmDialog}
    </>
  );
}