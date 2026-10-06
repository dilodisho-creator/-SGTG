import { useMemo, useState } from 'react';
import {
  Bird,
  Building2,
  Calendar,
  Database,
  Filter,
  History,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  Swords,
  Trophy,
  User,
  X,
} from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { TournamentData, AuditEntry } from '../types';
import { Pagination } from '../components/ui/Pagination';
import { Combobox } from '../components/ui/Combobox';
import { DetailDrawer, DrawerRow } from '../components/ui/DetailDrawer';

interface AuditPageProps {
  data: TournamentData | null;
}

function getEntityIcon(entidad: string) {
  const lower = entidad.toLowerCase();
  if (lower.includes('gallo')) return <Bird className="w-4 h-4 text-amber-500" />;
  if (lower.includes('galpon') || lower.includes('galpón')) return <Building2 className="w-4 h-4 text-brand-500" />;
  if (lower.includes('pelea') || lower.includes('enfrentamiento')) return <Swords className="w-4 h-4 text-orange-500" />;
  if (lower.includes('premio') || lower.includes('pollon') || lower.includes('ranking')) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (lower.includes('config')) return <Settings2 className="w-4 h-4 text-violet-500" />;
  if (lower.includes('respaldo') || lower.includes('backup')) return <Database className="w-4 h-4 text-emerald-500" />;
  return <History className="w-4 h-4 text-slate-400" />;
}

function getActionBadge(accion: string) {
  const upper = accion.toUpperCase();
  if (upper.includes('CREAR') || upper.includes('REGISTRAR') || upper.includes('ASIGNAR')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  if (upper.includes('ELIMINAR') || upper.includes('CANCELAR') || upper.includes('BORRAR')) {
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  }
  if (upper.includes('ACTUALIZAR') || upper.includes('EDITAR') || upper.includes('MODIFICAR')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  }
  if (upper.includes('SORTEO') || upper.includes('SORTEAR')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  }
  if (upper.includes('REINICIAR') || upper.includes('RESTAURAR')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

export function AuditPage({ data }: AuditPageProps) {
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('todas');
  const [selectedAction, setSelectedAction] = useState('todas');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntry | null>(null);

  const rawAudit = data?.auditoria ?? [];

  const entitiesList = useMemo(() => {
    const set = new Set<string>();
    rawAudit.forEach((e) => {
      if (e.entidad) set.add(e.entidad);
    });
    return Array.from(set).sort();
  }, [rawAudit]);

  const actionsList = useMemo(() => {
    const set = new Set<string>();
    rawAudit.forEach((e) => {
      if (e.accion) set.add(e.accion);
    });
    return Array.from(set).sort();
  }, [rawAudit]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es-PE');
    return rawAudit
      .filter((entry) => {
        if (selectedEntity !== 'todas' && entry.entidad !== selectedEntity) return false;
        if (selectedAction !== 'todas' && entry.accion !== selectedAction) return false;
        if (!q) return true;
        const haystack = `${entry.accion} ${entry.entidad} ${entry.detalle} ${entry.usuario} ${entry.entidadId}`.toLocaleLowerCase('es-PE');
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [rawAudit, search, selectedEntity, selectedAction]);

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page, pageSize]);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleEntityChange(val: string) {
    setSelectedEntity(val);
    setPage(1);
  }

  function handleActionChange(val: string) {
    setSelectedAction(val);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setSelectedEntity('todas');
    setSelectedAction('todas');
    setPage(1);
  }

  const hasActiveFilters = search || selectedEntity !== 'todas' || selectedAction !== 'todas';

  return (
    <>
      <PageShell>
        <div className="h-full flex flex-col space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 grid place-items-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Registro de Actividades
                  </h2>
                  <p className="text-xs text-slate-500">
                    {rawAudit.length} operaciones registradas en total
                  </p>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 self-start sm:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por detalle, usuario, ID..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <Combobox
                value={selectedEntity}
                onChange={handleEntityChange}
                size="sm"
                options={[
                  { value: 'todas', label: 'Todas las entidades' },
                  ...entitiesList.map((e) => ({
                    value: e,
                    label: e,
                    badge: String(rawAudit.filter((item) => item.entidad === e).length),
                  })),
                ]}
              />

              <Combobox
                value={selectedAction}
                onChange={handleActionChange}
                size="sm"
                options={[
                  { value: 'todas', label: 'Todas las acciones' },
                  ...actionsList.map((a) => ({
                    value: a,
                    label: a,
                    badge: String(rawAudit.filter((item) => item.accion === a).length),
                  })),
                ]}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
            {paginatedEntries.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No se encontraron movimientos
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {hasActiveFilters
                    ? 'Intente modificar los filtros o el texto de búsqueda.'
                    : 'Las acciones del sistema aparecerán aquí conforme se registren.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedAuditEntry(entry)}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center flex-shrink-0 mt-0.5">
                        {getEntityIcon(entry.entidad)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {entry.entidad}
                          </span>

                          <span
                            className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border ${getActionBadge(
                              entry.accion
                            )}`}
                          >
                            {entry.accion}
                          </span>

                          {entry.entidadId && (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                              ID: {entry.entidadId}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 break-words">
                          {entry.detalle || 'Sin detalle adicional'}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 gap-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {entry.usuario || 'Sistema'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(entry.fecha).toLocaleString('es-PE')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredEntries.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[15, 25, 50, 100]}
              itemLabel="movimientos"
            />
          </div>
        </div>
      </PageShell>

      {selectedAuditEntry && (
        <DetailDrawer
          open={!!selectedAuditEntry}
          onClose={() => setSelectedAuditEntry(null)}
          title={selectedAuditEntry.accion}
          subtitle={selectedAuditEntry.entidad}
          icon={getEntityIcon(selectedAuditEntry.entidad)}
          iconBg="bg-slate-100 dark:bg-slate-800 text-slate-500"
        >
          <div className="border-b border-slate-100 dark:border-slate-800">
            <DrawerRow label="Entidad" value={selectedAuditEntry.entidad} />
            <DrawerRow label="Acción" value={
              <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border ${getActionBadge(selectedAuditEntry.accion)}`}>
                {selectedAuditEntry.accion}
              </span>
            } />
            {selectedAuditEntry.usuario && <DrawerRow label="Usuario" value={selectedAuditEntry.usuario} />}
            {selectedAuditEntry.entidadId && <DrawerRow label="ID" value={<span className="font-mono text-xs">{selectedAuditEntry.entidadId}</span>} />}
            <DrawerRow label="Fecha" value={new Date(selectedAuditEntry.fecha).toLocaleString('es-PE')} />
          </div>
          {selectedAuditEntry.detalle && (
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Detalle</p>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">{selectedAuditEntry.detalle}</p>
              </div>
            </div>
          )}
        </DetailDrawer>
      )}
    </>
  );
}