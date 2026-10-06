import { useEffect, useMemo, useState, useCallback } from 'react';
import { Clock3, Medal, RefreshCw, Search, Timer, Trophy, ShieldCheck, Bird, Swords } from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { getRanking } from '../services/api';
import { RankingEntry, TournamentData, Fight } from '../types';
import { Pagination } from '../components/ui/Pagination';
import { DetailDrawer, DrawerRow, DrawerStatGrid } from '../components/ui/DetailDrawer';

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RankingPage({ data }: { data: TournamentData | null }) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);

  const configuredMode = data?.configuracion.rankingModo ?? 'puntos';
  const [rankingView, setRankingView] = useState<'puntos' | 'tiempo'>(configuredMode);

  useEffect(() => {
    if (data?.configuracion.rankingModo) {
      setRankingView(data.configuracion.rankingModo);
    }
  }, [data?.configuracion.rankingModo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRanking(await getRanking());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, data]);

  const minWins = data?.configuracion.victoriasRequeridasTiempo ?? 2;
  const allowDraws = data?.configuracion.permitirEmpatesTiempo ?? false;
  const allowLosses = data?.configuracion.permitirDerrotasTiempo ?? false;

  const isClasificado = useCallback((e: RankingEntry) => {
    return (
      e.victorias >= minWins &&
      (allowDraws || e.empates === 0) &&
      (allowLosses || e.derrotas === 0)
    );
  }, [minWins, allowDraws, allowLosses]);

  const isEnCarrera = useCallback((e: RankingEntry) => {
    return (
      !isClasificado(e) &&
      (allowDraws || e.empates === 0) &&
      (allowLosses || e.derrotas === 0)
    );
  }, [isClasificado, allowDraws, allowLosses]);

  const rankedAll = useMemo(() => {
    const list = [...ranking];

    if (rankingView === 'tiempo') {
      list.sort((a, b) => {
        const aClas = isClasificado(a) ? 1 : 0;
        const bClas = isClasificado(b) ? 1 : 0;
        if (aClas !== bClas) return bClas - aClas;

        if (aClas && bClas) {
          const aTime = a.tiempoSegundos > 0 ? a.tiempoSegundos : 999999;
          const bTime = b.tiempoSegundos > 0 ? b.tiempoSegundos : 999999;
          if (aTime !== bTime) return aTime - bTime;
          if (a.puntos !== b.puntos) return b.puntos - a.puntos;
          return a.galpon.localeCompare(b.galpon);
        }

        const aCarr = isEnCarrera(a) ? 1 : 0;
        const bCarr = isEnCarrera(b) ? 1 : 0;
        if (aCarr !== bCarr) return bCarr - aCarr;

        if (a.victorias !== b.victorias) return b.victorias - a.victorias;

        const aTime = a.tiempoSegundos > 0 ? a.tiempoSegundos : 999999;
        const bTime = b.tiempoSegundos > 0 ? b.tiempoSegundos : 999999;
        if (aTime !== bTime) return aTime - bTime;

        if (a.puntos !== b.puntos) return b.puntos - a.puntos;
        return a.galpon.localeCompare(b.galpon);
      });
    } else {
      list.sort((a, b) => {
        if (a.puntos !== b.puntos) return b.puntos - a.puntos;
        if (a.victorias !== b.victorias) return b.victorias - a.victorias;
        const aTime = a.tiempoSegundos > 0 ? a.tiempoSegundos : 999999;
        const bTime = b.tiempoSegundos > 0 ? b.tiempoSegundos : 999999;
        if (aTime !== bTime) return aTime - bTime;
        if (a.derrotas !== b.derrotas) return a.derrotas - b.derrotas;
        return a.galpon.localeCompare(b.galpon);
      });
    }

    return list.map((item, index) => ({
      ...item,
      posicion: index + 1,
      clasificado: isClasificado(item),
    }));
  }, [ranking, rankingView, isClasificado, isEnCarrera]);

  const filtrarPorPeleas = data?.configuracion.rankingFiltrarPorPeleas ?? false;
  const minimosPeleas = data?.configuracion.rankingMinimosPeleas ?? 2;

  const rankedVisible = useMemo(() => {
    if (!filtrarPorPeleas) return rankedAll;
    return rankedAll
      .filter((e) => e.peleas >= minimosPeleas)
      .map((item, index) => ({ ...item, posicion: index + 1 }));
  }, [rankedAll, filtrarPorPeleas, minimosPeleas]);

  const filteredRanking = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rankedVisible;
    return rankedVisible.filter((e) => e.galpon.toLowerCase().includes(q));
  }, [rankedVisible, search]);

  const paginatedRanking = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRanking.slice(start, start + pageSize);
  }, [filteredRanking, page, pageSize]);

  const podiumEntries = useMemo(() => {
    return (search.trim() ? filteredRanking : rankedVisible).slice(0, 3);
  }, [rankedVisible, filteredRanking, search]);

  const clasificadosCount = useMemo(() => {
    return rankedVisible.filter((e) => isClasificado(e)).length;
  }, [rankedVisible, isClasificado]);

  const selectedFights = useMemo(() => {
    if (!selectedEntry || !data?.hojas) return [];
    const all = Object.values(data.hojas).flat();
    const gName = selectedEntry.galpon.trim().toLocaleUpperCase('es-PE');
    return all.filter((f) => {
      const g1 = f.gallo1?.galpon?.trim().toLocaleUpperCase('es-PE');
      const g2 = f.gallo2?.galpon?.trim().toLocaleUpperCase('es-PE');
      return (g1 === gName && f.gallo1?.resultado) || (g2 === gName && f.gallo2?.resultado) || g1 === gName || g2 === gName;
    });
  }, [selectedEntry, data]);

  const timeRuleText = data
    ? `Clasifican con mínimo ${minWins} victoria${minWins > 1 ? 's' : ''}${allowDraws ? '' : ', sin tablas'
    }${allowLosses ? '' : ' y sin derrotas'}; se ordenan por menor tiempo acumulado.`
    : '';

  return (
    <>
      <PageShell
        actions={
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setRankingView('puntos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingView === 'puntos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Puntos
            </button>
            <button
              onClick={() => setRankingView('tiempo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingView === 'tiempo'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <Timer className="w-3.5 h-3.5" />
              Tiempo
            </button>
          </div>
        }
      >
        <div className="h-full flex flex-col">

          {podiumEntries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {podiumEntries.map((entry, index) => {
                const clasificado = isClasificado(entry);
                const enCarrera = isEnCarrera(entry);

                return (
                  <div
                    key={entry.galpon}
                    onClick={() => setSelectedEntry(entry)}
                    className={`rounded-2xl border p-5 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${index === 0
                        ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                        : index === 1
                          ? 'border-slate-300 dark:border-slate-700'
                          : 'border-amber-700/30 dark:border-amber-700/40'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-10 h-10 rounded-xl grid place-items-center ${index === 0
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : index === 1
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                              : 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                          }`}
                      >
                        {index === 0 ? (
                          <Trophy className="w-5 h-5" trigger="parent-hover" mode="signature" />
                        ) : (
                          <Medal className="w-5 h-5" trigger="parent-hover" mode="signature" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {rankingView === 'tiempo' && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${clasificado
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : enCarrera
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                          >
                            {clasificado ? '✓ Clasificado' : enCarrera ? 'En carrera' : 'Sin clasificar'}
                          </span>
                        )}
                        <span className="text-3xl font-extrabold text-slate-300 dark:text-slate-700">
                          #{entry.posicion}
                        </span>
                      </div>
                    </div>
                    <h2 className="font-extrabold text-slate-900 dark:text-white mt-4 truncate text-base" title={entry.galpon}>
                      {entry.galpon}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`font-bold ${rankingView === 'puntos' ? 'text-brand-600 dark:text-brand-400 text-sm' : 'text-slate-700 dark:text-slate-300'}`}>
                        {entry.puntos} pts
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {entry.victorias}V - {entry.empates}T - {entry.derrotas}D
                      </span>
                      <span>·</span>
                      <span className={`font-mono ${rankingView === 'tiempo' ? 'text-amber-600 dark:text-amber-400 font-bold text-sm' : ''}`}>
                        {formatTime(entry.tiempoSegundos)}
                      </span>
                      {entry.premioPollon > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            S/ {entry.premioPollon} pollón
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="w-4 h-4 text-amber-500" trigger="hover" mode="signature" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Tabla General ({filteredRanking.length} {filteredRanking.length === 1 ? 'galpón' : 'galpones'})
                </h3>
                {filtrarPorPeleas && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    Mín. {minimosPeleas} {minimosPeleas === 1 ? 'pelea' : 'peleas'} · {rankedAll.length - rankedVisible.length} ocultos
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar galpón..."
                  className="w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="p-3 text-center w-16">Pos</th>
                    <th className="p-3 text-left">Galpón</th>
                    {rankingView === 'tiempo' && <th className="p-3 text-center">Estado</th>}
                    <th className="p-3 text-center">Peleas</th>
                    <th className="p-3 text-center">Ganadas</th>
                    <th className="p-3 text-center">Tablas</th>
                    <th className="p-3 text-center">Perdidas</th>
                    <th className={`p-3 text-center ${rankingView === 'puntos' ? 'font-black text-brand-600 dark:text-brand-400 bg-brand-500/10' : 'font-bold'}`}>
                      Puntos
                    </th>
                    <th className={`p-3 text-center ${rankingView === 'tiempo' ? 'font-black text-amber-600 dark:text-amber-400 bg-amber-500/10' : ''}`}>
                      Tiempo
                    </th>
                    <th className="p-3 text-center">Premio Pollón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRanking.map((entry) => {
                    const clasificado = isClasificado(entry);
                    const enCarrera = isEnCarrera(entry);

                    return (
                      <tr
                        key={entry.galpon}
                        onClick={() => setSelectedEntry(entry)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="p-3 text-center font-extrabold">
                          {entry.posicion <= 3 ? (
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-sm ${entry.posicion === 1
                                  ? 'bg-amber-500 text-white'
                                  : entry.posicion === 2
                                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white'
                                    : 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                                }`}
                            >
                              {entry.posicion}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold">{entry.posicion}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {entry.galpon}
                        </td>
                        {rankingView === 'tiempo' && (
                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${clasificado
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : enCarrera
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                            >
                              {clasificado ? '✓ Clasificado' : enCarrera ? 'En carrera' : 'Sin clasificar'}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                          {entry.peleas}
                        </td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{entry.victorias}</td>
                        <td className="p-3 text-center text-slate-500">{entry.empates}</td>
                        <td className="p-3 text-center text-red-500 font-semibold">{entry.derrotas}</td>
                        <td className={`p-3 text-center font-black ${rankingView === 'puntos' ? 'text-brand-600 dark:text-brand-400 bg-brand-500/5' : 'text-slate-900 dark:text-white'}`}>
                          {entry.puntos}
                        </td>
                        <td className={`p-3 text-center font-mono text-xs ${rankingView === 'tiempo' ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5' : ''}`}>
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            {entry.tiempoSegundos > 0 && <Clock3 className="w-3.5 h-3.5 text-slate-400" />}
                            {formatTime(entry.tiempoSegundos)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600">
                          {entry.premioPollon > 0 ? `S/ ${entry.premioPollon}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!loading && filteredRanking.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-400">
                {search
                  ? 'No se encontraron galpones con ese nombre.'
                  : 'Registre resultados de peleas para generar la tabla de posiciones.'}
              </div>
            )}

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredRanking.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 25, 50]}
              itemLabel="galpones"
            />
          </div>
        </div>
      </PageShell>

      {selectedEntry && (
        <DetailDrawer
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={selectedEntry.galpon}
          subtitle={`Posición #${selectedEntry.posicion} · ${selectedEntry.puntos} pts`}
          icon={selectedEntry.posicion === 1 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
          iconBg={
            selectedEntry.posicion === 1
              ? 'bg-amber-500 text-white'
              : selectedEntry.posicion === 2
                ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200'
                : 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
          }
        >
          <div className="px-5 pt-5 pb-3 text-center">
            <div className="inline-flex items-center gap-3 bg-brand-500/10 rounded-2xl px-6 py-3 border border-brand-500/20">
              <span className="text-4xl font-black text-brand-600 dark:text-brand-400">
                #{selectedEntry.posicion}
              </span>
              <div className="text-left">
                <p className="text-xs text-slate-500">Puntaje</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedEntry.puntos} pts
                </p>
              </div>
            </div>

            {rankingView === 'tiempo' && (
              <div className="mt-3">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${isClasificado(selectedEntry)
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : isEnCarrera(selectedEntry)
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                  {isClasificado(selectedEntry)
                    ? '✓ Clasificado para Premios'
                    : isEnCarrera(selectedEntry)
                      ? 'En carrera por clasificar'
                      : 'Sin clasificar'}
                </span>
              </div>
            )}
          </div>

          <DrawerStatGrid
            stats={[
              { label: 'Victorias', value: selectedEntry.victorias, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: 'Tablas', value: selectedEntry.empates, color: 'text-amber-600 bg-amber-500/10' },
              { label: 'Derrotas', value: selectedEntry.derrotas, color: 'text-red-500 bg-red-500/10' },
            ]}
          />

          <div className="px-5 pb-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 mb-4">
              <DrawerRow label="Total de peleas" value={selectedEntry.peleas} />
              <DrawerRow
                label="Puntos"
                value={<span className="font-black text-brand-600 dark:text-brand-400">{selectedEntry.puntos}</span>}
              />
              <DrawerRow
                label="% Victorias"
                value={
                  <div className="flex items-center gap-2 min-w-[120px] justify-end">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden max-w-[60px]">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${selectedEntry.peleas > 0 ? Math.round((selectedEntry.victorias / selectedEntry.peleas) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {selectedEntry.peleas > 0 ? Math.round((selectedEntry.victorias / selectedEntry.peleas) * 100) : 0}%
                    </span>
                  </div>
                }
              />
              <DrawerRow
                label="Tiempo acumulado"
                value={<span className="font-mono text-amber-600 font-bold">{formatTime(selectedEntry.tiempoSegundos)}</span>}
              />
              {selectedEntry.peleas > 0 && selectedEntry.tiempoSegundos > 0 && (
                <DrawerRow
                  label="Tiempo promedio"
                  value={<span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{formatTime(Math.round(selectedEntry.tiempoSegundos / selectedEntry.peleas))}</span>}
                />
              )}
              {selectedEntry.premioPollon > 0 && (
                <DrawerRow
                  label="Premio Pollón"
                  value={<span className="font-black text-amber-700 dark:text-amber-400">S/ {selectedEntry.premioPollon}</span>}
                />
              )}
              {rankingView === 'tiempo' && (
                <DrawerRow
                  label="Estado clasificación"
                  value={
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isClasificado(selectedEntry)
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : isEnCarrera(selectedEntry)
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isClasificado(selectedEntry) ? 'Clasificado' : isEnCarrera(selectedEntry) ? 'En carrera' : 'Sin clasificar'}
                    </span>
                  }
                />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Swords className="w-4 h-4 text-brand-500" />
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Peleas en el torneo ({selectedFights.length})
                </h4>
              </div>

              {selectedFights.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  No hay peleas registradas para este galpón.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedFights.map((f: Fight) => {
                    const gName = selectedEntry.galpon.trim().toLocaleUpperCase('es-PE');
                    const isG1 = f.gallo1?.galpon?.trim().toLocaleUpperCase('es-PE') === gName;
                    const myGallo = isG1 ? f.gallo1 : f.gallo2;
                    const oppGallo = isG1 ? f.gallo2 : f.gallo1;
                    const won = myGallo?.resultado === 'GANÓ';
                    const lost = myGallo?.resultado === 'PERDIÓ';
                    const draw = myGallo?.resultado === 'TABLAS';

                    return (
                      <div
                        key={`${f.hoja}-${f.numero}`}
                        className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-2.5 text-xs flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                            <span className="font-mono text-slate-400 text-[10px]">P.{f.numero}</span>
                            <span className="truncate">vs {oppGallo?.galpon || 'Sin rival'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                            {myGallo?.ficha && <span>Ficha {myGallo.ficha}</span>}
                            {myGallo?.color && <span className="text-slate-500">· {myGallo.color}</span>}
                            {f.tiempo && <span className="font-mono text-amber-600 dark:text-amber-400">· {f.tiempo}</span>}
                            {f.caja != null && <span className="text-emerald-600 dark:text-emerald-400">· S/. {f.caja}</span>}
                            {f.hoja && <span className="text-slate-400">· {f.hoja}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {won ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                              GANÓ
                            </span>
                          ) : lost ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                              PERDIÓ
                            </span>
                          ) : draw ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              TABLAS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DetailDrawer>
      )}
    </>
  );
}