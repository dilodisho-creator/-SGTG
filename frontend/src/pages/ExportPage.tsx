import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  Bird,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  History,
  LayoutList,
  Loader2,
  RotateCcw,
  Swords,
  Trophy,
  XCircle,
} from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { exportTournament, getRanking, getAudit, getTournaments } from '../services/api';
import { formatWeight } from '../utils/weight';
import { DownloadButton } from '../components/ui/DownloadButton';
import { TournamentData, TournamentSummary } from '../types';

interface ExportPageProps {
  data: TournamentData | null;
}

function downloadXlsx(sheets: { name: string; rows: unknown[][] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

function buildHeader(data: TournamentData, subtitle: string): unknown[][] {
  const sistemaHeader = data.configuracion.nombreSistema
    ? `${data.configuracion.nombreSistema} — ${data.configuracion.nombreColiseo}`
    : data.configuracion.nombreColiseo;
  return [
    [`${data.configuracion.nombreTorneo || 'Torneo'} — ${subtitle}`],
    [sistemaHeader],
    [],
  ];
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date) {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function startOfMonth(d: Date) {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

function Toast({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${ok ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate">{msg}</span>
    </span>
  );
}

function DownloadBtn({
  loading,
  disabled,
  onClick,
  label = 'Descargar',
  color = 'emerald',
  size = 'md',
}: {
  loading: boolean;
  disabled: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  color?: string;
  size?: 'sm' | 'md';
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
    orange: 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/30',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30',
    violet: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/30',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30',
  };

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs font-bold';

  return (
    <DownloadButton
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${pad} ${colors[color] ?? colors.emerald}`}
      size={16}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : null}
      <span className="truncate">{loading ? 'Generando…' : label}</span>
    </DownloadButton>
  );
}

export function ExportPage({ data }: ExportPageProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [toastMap, setToastMap] = useState<Record<string, { msg: string; ok: boolean } | null>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  function toggleFlip(cardId: string) {
    setFlippedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  function busy(key: string) { return loadingMap[key] ?? false; }
  function setLoad(key: string, v: boolean) { setLoadingMap(p => ({ ...p, [key]: v })); }
  function toast(key: string, msg: string, ok: boolean) {
    setToastMap(p => ({ ...p, [key]: { msg, ok } }));
    window.setTimeout(() => setToastMap(p => ({ ...p, [key]: null })), 4000);
  }

  const [torneos, setTorneos] = useState<TournamentSummary[]>([]);
  useEffect(() => {
    getTournaments().then(({ torneos: t }) => setTorneos(t)).catch(() => { });
  }, []);

  const sheetNames = data ? Object.keys(data.hojas) : [];
  const allFights = data ? Object.values(data.hojas).flat() : [];
  const completedFights = allFights.filter(f => Boolean(f.gallo1?.galpon && f.gallo2?.galpon));

  const activeSheetEntries = useMemo(() => {
    if (!data?.hojas) return [];
    return Object.entries(data.hojas).filter(([, fights]) =>
      fights.some(f => Boolean(f.gallo1?.galpon || f.gallo2?.galpon))
    );
  }, [data]);

  const activeSheetNames = useMemo(
    () => activeSheetEntries.map(([name]) => name),
    [activeSheetEntries]
  );

  const [fightHoja, setFightHoja] = useState<'todas' | string>('todas');

  useEffect(() => {
    if (fightHoja !== 'todas' && !activeSheetNames.includes(fightHoja)) {
      setFightHoja('todas');
    }
  }, [activeSheetNames, fightHoja]);

  type Period = 'hoy' | 'semana' | 'mes' | 'todo';
  const [auditPeriod, setAuditPeriod] = useState<Period>('mes');
  const [auditDesde, setAuditDesde] = useState(() => startOfMonth(new Date()).toISOString().slice(0, 10));
  const [auditHasta, setAuditHasta] = useState(today);

  function applyPeriod(p: Period) {
    setAuditPeriod(p);
    const now = new Date();
    if (p === 'hoy') { setAuditDesde(startOfDay(now).toISOString().slice(0, 10)); setAuditHasta(today); }
    if (p === 'semana') { setAuditDesde(startOfWeek(now).toISOString().slice(0, 10)); setAuditHasta(today); }
    if (p === 'mes') { setAuditDesde(startOfMonth(now).toISOString().slice(0, 10)); setAuditHasta(today); }
    if (p === 'todo') { setAuditDesde('2000-01-01'); setAuditHasta(today); }
  }

  const [gallosEstado, setGallosEstado] = useState<'todos' | 'disponible' | 'asignado' | 'retirado'>('todos');

  function getFilteredFights() {
    let fights = fightHoja === 'todas' ? allFights : (data?.hojas[fightHoja] ?? []);
    return fights.filter(f => f.gallo1.galpon && f.gallo2.galpon).sort((a, b) => a.numero - b.numero);
  }

  const filteredFights = getFilteredFights();

  async function handleOficial(e: React.MouseEvent) {
    e.stopPropagation();
    if (!data) return;
    setLoad('oficial', true);
    try {
      await exportTournament(data);
      toast('oficial', 'Libro oficial generado con éxito.', true);
    } catch {
      toast('oficial', 'Error al generar el archivo.', false);
    } finally {
      setLoad('oficial', false);
    }
  }

  function handlePeleas(e: React.MouseEvent) {
    e.stopPropagation();
    if (!data) return;
    setLoad('peleas', true);
    try {
      const fights = filteredFights;
      const header = buildHeader(data, fightHoja === 'todas' ? 'Resultados de Peleas' : `Resultados — ${fightHoja}`);
      const cols: unknown[] = ['N°', 'Hoja', 'Galpón 1', 'Color 1', 'Peso 1', 'Resultado 1', 'Galpón 2', 'Color 2', 'Peso 2', 'Resultado 2', 'Caja', 'Tiempo'];
      const rows = fights.map(f => [
        f.numero, f.hoja,
        f.gallo1.galpon, f.gallo1.color, formatWeight(f.gallo1.peso, data.configuracion.unidadPeso), f.gallo1.resultado,
        f.gallo2.galpon, f.gallo2.color, formatWeight(f.gallo2.peso, data.configuracion.unidadPeso), f.gallo2.resultado,
        f.caja ?? '', f.tiempo,
      ]);
      const suffix = fightHoja === 'todas' ? '' : `_${fightHoja.replace(/\s+/g, '')}`;
      downloadXlsx([{ name: 'Peleas', rows: [...header, cols, ...rows] }], `peleas${suffix}_${today}.xlsx`);
      toast('peleas', `${fights.length} peleas exportadas.`, true);
    } catch {
      toast('peleas', 'Error al generar el archivo.', false);
    } finally {
      setLoad('peleas', false);
    }
  }

  function handlePorHojas(e: React.MouseEvent) {
    e.stopPropagation();
    if (!data) return;
    setLoad('porhojas', true);
    try {
      const sheetsToExport = activeSheetEntries.length > 0 ? activeSheetEntries : [];
      if (sheetsToExport.length === 0) {
        toast('peleas', 'No hay hojas con peleas para exportar.', false);
        return;
      }
      const sheets = sheetsToExport.map(([name, fights]) => {
        const header = buildHeader(data, name);
        const cols: unknown[] = ['N°', 'Galpón 1', 'Color 1', 'Peso 1', 'Resultado 1', 'Galpón 2', 'Color 2', 'Peso 2', 'Resultado 2', 'Caja', 'Tiempo'];
        const rows = fights.filter(f => f.gallo1.galpon && f.gallo2.galpon).sort((a, b) => a.numero - b.numero).map(f => [
          f.numero,
          f.gallo1.galpon, f.gallo1.color, formatWeight(f.gallo1.peso, data.configuracion.unidadPeso), f.gallo1.resultado,
          f.gallo2.galpon, f.gallo2.color, formatWeight(f.gallo2.peso, data.configuracion.unidadPeso), f.gallo2.resultado,
          f.caja ?? '', f.tiempo,
        ]);
        return { name, rows: [...header, cols, ...rows] };
      });
      downloadXlsx(sheets, `peleas_por_hoja_${today}.xlsx`);
      toast('peleas', `${sheets.length} ${sheets.length === 1 ? 'hoja exportada' : 'hojas exportadas'}.`, true);
    } catch {
      toast('peleas', 'Error al generar el archivo.', false);
    } finally {
      setLoad('porhojas', false);
    }
  }

  async function handleRanking(e: React.MouseEvent) {
    e.stopPropagation();
    setLoad('ranking', true);
    try {
      const entries = await getRanking();
      const header = data ? buildHeader(data, 'Ranking de Galpones') : [[]];
      const cols: unknown[] = ['Posición', 'Galpón', 'Peleas', 'Victorias', 'Empates', 'Derrotas', 'Puntos'];
      const rows = entries.map(item => [item.posicion, item.galpon, item.peleas, item.victorias, item.empates, item.derrotas, item.puntos]);
      downloadXlsx([{ name: 'Ranking', rows: [...header, cols, ...rows] }], `ranking_${today}.xlsx`);
      toast('ranking', `${entries.length} galpones exportados.`, true);
    } catch {
      toast('ranking', 'No se pudo obtener el ranking.', false);
    } finally {
      setLoad('ranking', false);
    }
  }

  function handleGallos(e: React.MouseEvent) {
    e.stopPropagation();
    if (!data) return;
    setLoad('gallos', true);
    try {
      const galponMap = Object.fromEntries(data.galpones.map(g => [g.id, g.nombre]));
      const lista = gallosEstado === 'todos'
        ? data.gallos
        : data.gallos.filter(g => g.estado === gallosEstado);
      const header = buildHeader(data, `Inventario de Gallos${gallosEstado !== 'todos' ? ` (${gallosEstado})` : ''}`);
      const cols: unknown[] = ['Galpón', 'Ficha', 'Color', 'Peso', 'Estado'];
      const rows = lista.map(g => [galponMap[g.galponId] ?? g.galponId, g.ficha, g.color, formatWeight(g.peso, data.configuracion.unidadPeso), g.estado]);
      downloadXlsx([{ name: 'Gallos', rows: [...header, cols, ...rows] }], `gallos_${gallosEstado}_${today}.xlsx`);
      toast('gallos', `${lista.length} gallos exportados.`, true);
    } catch {
      toast('gallos', 'Error al generar el archivo.', false);
    } finally {
      setLoad('gallos', false);
    }
  }

  async function handleAuditoria(e: React.MouseEvent) {
    e.stopPropagation();
    setLoad('auditoria', true);
    try {
      const all = await getAudit();
      const desde = new Date(`${auditDesde}T00:00:00`);
      const hasta = new Date(`${auditHasta}T23:59:59`);
      const entries = all.filter(item => {
        const d = new Date(item.fecha);
        return d >= desde && d <= hasta;
      });
      const header = data ? buildHeader(data, `Auditoría ${auditDesde} al ${auditHasta}`) : [[]];
      const cols: unknown[] = ['Fecha', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'Detalle'];
      const rows = entries.map(item => [
        new Date(item.fecha).toLocaleString('es-PE'),
        item.usuario, item.accion, item.entidad, item.entidadId, item.detalle,
      ]);
      downloadXlsx([{ name: 'Auditoría', rows: [...header, cols, ...rows] }], `auditoria_${auditDesde}_${auditHasta}.xlsx`);
      toast('auditoria', `${entries.length} registros exportados.`, true);
    } catch {
      toast('auditoria', 'Error al obtener la auditoría.', false);
    } finally {
      setLoad('auditoria', false);
    }
  }

  function handleTorneoList(e: React.MouseEvent) {
    e.stopPropagation();
    setLoad('historial', true);
    try {
      const cols: unknown[] = ['#', 'Nombre', 'Fecha', 'Estado', 'Creado en', 'Actualizado en'];
      const rows = torneos.map((t, i) => [
        i + 1, t.nombre, t.fecha, t.estado,
        new Date(t.creadoEn).toLocaleDateString('es-PE'),
        new Date(t.actualizadoEn).toLocaleDateString('es-PE'),
      ]);
      downloadXlsx([{ name: 'Torneos', rows: [cols, ...rows] }], `historial_torneos_${today}.xlsx`);
      toast('historial', `${torneos.length} torneos exportados.`, true);
    } catch {
      toast('historial', 'Error al generar el archivo.', false);
    } finally {
      setLoad('historial', false);
    }
  }

  async function handleResumen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!data) return;
    setLoad('resumen', true);
    try {
      const header = buildHeader(data, 'Resumen del Torneo');
      const galponMap = Object.fromEntries(data.galpones.map(g => [g.id, g.nombre]));
      const sheetsForSummary = activeSheetEntries.length > 0 ? activeSheetEntries : Object.entries(data.hojas);
      const hojaStats = sheetsForSummary.map(([hoja, fights]) => {
        const valid = fights.filter(f => f.gallo1?.galpon && f.gallo2?.galpon);
        const done = valid.filter(f => f.gallo1.resultado !== '');
        return [hoja, valid.length, done.length, valid.length - done.length];
      });
      const sheetResumen: unknown[][] = [
        ...header,
        ['Campo', 'Valor'],
        ['Nombre del torneo', data.configuracion.nombreTorneo],
        ['Coliseo', data.configuracion.nombreColiseo],
        ['Fecha de exportación', new Date().toLocaleString('es-PE')],
        ['Total de hojas activas', activeSheetEntries.length],
        ['Total de peleas', completedFights.length],
        ['Con resultado', completedFights.filter(f => f.gallo1.resultado !== '').length],
        ['Sin resultado', completedFights.filter(f => f.gallo1.resultado === '').length],
        ['Galpones', data.galpones.length],
        ['Gallos en inventario', data.gallos.length],
        [],
        ['Detalle por Hoja', '', '', ''],
        ['Hoja', 'Peleas totales', 'Con resultado', 'Pendientes'],
        ...hojaStats,
      ];
      const sheetGalpones: unknown[][] = [
        ...buildHeader(data, 'Galpones Registrados'),
        ['N°', 'Nombre', 'Propietario', 'Teléfono', 'Estado', 'Registrado'],
        ...data.galpones.map((g, i) => [i + 1, g.nombre, g.propietario, g.telefono, g.estado, new Date(g.creadoEn).toLocaleDateString('es-PE')]),
      ];
      const sheetGallos: unknown[][] = [
        ...buildHeader(data, 'Inventario de Gallos'),
        ['Galpón', 'Ficha', 'Color', 'Peso', 'Estado'],
        ...data.gallos.map(g => [galponMap[g.galponId] ?? g.galponId, g.ficha, g.color, formatWeight(g.peso, data.configuracion.unidadPeso), g.estado]),
      ];
      downloadXlsx([
        { name: 'Resumen', rows: sheetResumen },
        { name: 'Galpones', rows: sheetGalpones },
        { name: 'Gallos', rows: sheetGallos },
      ], `resumen_torneo_${today}.xlsx`);
      toast('historial', 'Resumen general exportado.', true);
    } catch {
      toast('historial', 'Error al generar el resumen.', false);
    } finally {
      setLoad('resumen', false);
    }
  }

  const periods: { id: Period; label: string }[] = [
    { id: 'mes', label: 'Este mes' },
    { id: 'semana', label: 'Semana' },
    { id: 'hoy', label: 'Hoy' },
    { id: 'todo', label: 'Todo' },
  ];

  return (
    <PageShell>
      <div className="w-full max-w-6xl mx-auto flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['oficial'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('oficial')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-emerald-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center border border-emerald-500/20">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Oficial
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Formato Oficial</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Libro completo de torneo</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
                    {activeSheetNames.length > 0
                      ? `${activeSheetNames.length} ${activeSheetNames.length === 1 ? 'hoja activa' : 'hojas activas'} · ${completedFights.length} peleas`
                      : '0 hojas activas · 0 peleas'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-emerald-500/60 dark:border-emerald-500/40 p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4" /> Formato Oficial
                    </span>
                    {toastMap['oficial'] && <Toast {...toastMap['oficial']!} />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    Genera el libro oficial completo de Excel con todas las hojas de peleas, pollones, frentes y premios configurados.
                  </p>
                </div>
                <div className="pt-2">
                  <DownloadBtn
                    loading={busy('oficial')}
                    disabled={!data}
                    onClick={handleOficial}
                    label="Descargar libro oficial"
                    color="emerald"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['peleas'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('peleas')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 grid place-items-center border border-orange-500/20">
                    <Swords className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    Peleas
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Resultados de Peleas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enfrentamientos y marcadores</p>
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1.5 tabular-nums">
                    {completedFights.length > 0
                      ? `${completedFights.length} ${completedFights.length === 1 ? 'pelea programada' : 'peleas programadas'} (${activeSheetNames.length} ${activeSheetNames.length === 1 ? 'hoja' : 'hojas'})`
                      : 'Sin peleas programadas'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-orange-500/60 dark:border-orange-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <Swords className="w-4 h-4" /> Resultados de Peleas
                    </span>
                    {toastMap['peleas'] && <Toast {...toastMap['peleas']!} />}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    Descarga las peleas con tiempos, apuestas de caja y resultados por hoja o consolidado.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Filtrar por hoja:</label>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setFightHoja('todas')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                          fightHoja === 'todas'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-orange-500/60'
                        }`}
                      >
                        Todas ({completedFights.length})
                      </button>
                      {activeSheetNames.map(n => {
                        const count = (data?.hojas[n] ?? []).filter(f => f.gallo1.galpon && f.gallo2.galpon).length;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setFightHoja(n)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                              fightHoja === n
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-orange-500/60'
                            }`}
                          >
                            {n} ({count})
                          </button>
                        );
                      })}
                      {activeSheetNames.length === 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1">Sin hojas con peleas</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <DownloadBtn
                    loading={busy('peleas')}
                    disabled={!data || filteredFights.length === 0}
                    onClick={handlePeleas}
                    label="Descargar"
                    color="orange"
                    size="sm"
                  />
                  <DownloadBtn
                    loading={busy('porhojas')}
                    disabled={!data || activeSheetNames.length === 0}
                    onClick={handlePorHojas}
                    label="Por pestañas"
                    color="amber"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['auditoria'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('auditoria')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-violet-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 grid place-items-center border border-violet-500/20">
                    <History className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    Auditoría
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Auditoría del Sistema</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Historial de operaciones</p>
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-1.5 truncate">
                    Período: {auditPeriod === 'mes' ? 'Este mes' : auditPeriod === 'hoy' ? 'Hoy' : auditPeriod === 'semana' ? 'Esta semana' : 'Todo'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-violet-500/60 dark:border-violet-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                      <History className="w-4 h-4" /> Auditoría
                    </span>
                    {toastMap['auditoria'] && <Toast {...toastMap['auditoria']!} />}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    Exporta las acciones y cambios realizados por usuarios en el sistema.
                  </p>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {periods.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPeriod(p.id)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-colors ${auditPeriod === p.id
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-violet-500'
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <DownloadBtn
                    loading={busy('auditoria')}
                    disabled={false}
                    onClick={handleAuditoria}
                    label="Descargar auditoría"
                    color="violet"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['ranking'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('ranking')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-amber-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center border border-amber-500/20">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Ranking
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Ranking de Galpones</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tabla general y posiciones</p>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">
                    {data?.galpones.length ?? 0} galpones registrados
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-amber-500/60 dark:border-amber-500/40 p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" /> Ranking General
                    </span>
                    {toastMap['ranking'] && <Toast {...toastMap['ranking']!} />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    Descarga la tabla de posiciones con victorias, empates, derrotas, puntos y tiempos según la modalidad activa.
                  </p>
                </div>
                <div className="pt-2">
                  <DownloadBtn
                    loading={busy('ranking')}
                    disabled={!data || (data.galpones.length === 0)}
                    onClick={handleRanking}
                    label="Descargar ranking"
                    color="amber"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['gallos'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('gallos')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-sky-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 grid place-items-center border border-sky-500/20">
                    <Bird className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    Inventario
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Inventario de Gallos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registro y pesos por galpón</p>
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 mt-1.5 tabular-nums">
                    {data?.gallos.length ?? 0} gallos en total
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-sky-500/60 dark:border-sky-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Bird className="w-4 h-4" /> Inventario de Gallos
                    </span>
                    {toastMap['gallos'] && <Toast {...toastMap['gallos']!} />}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    Listado con ficha, color, peso, galpón y estado de cada gallo.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Filtrar por estado:</label>
                    <div className="flex flex-wrap gap-1">
                      {([
                        { value: 'todos', label: `Todos (${data?.gallos.length ?? 0})` },
                        { value: 'disponible', label: `Disp. (${data?.gallos.filter(g => g.estado === 'disponible').length ?? 0})` },
                        { value: 'asignado', label: `Asig. (${data?.gallos.filter(g => g.estado === 'asignado').length ?? 0})` },
                        { value: 'retirado', label: `Ret. (${data?.gallos.filter(g => g.estado === 'retirado').length ?? 0})` },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGallosEstado(opt.value)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                            gallosEstado === opt.value
                              ? 'bg-sky-500 text-white border-sky-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-sky-500/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <DownloadBtn
                    loading={busy('gallos')}
                    disabled={!data || data.gallos.length === 0}
                    onClick={handleGallos}
                    label="Descargar gallos"
                    color="sky"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flip-card-container h-[235px] sm:h-[245px] w-full cursor-pointer ${flippedCards['historial'] ? 'is-flipped' : ''}`}
            onClick={() => toggleFlip('historial')}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-rose-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center border border-rose-500/20">
                    <CalendarRange className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Torneos
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Historial y Resumen</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Torneos creados y estadísticas</p>
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 tabular-nums">
                    {torneos.length} torneos · Resumen global
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                  <span>Pasa el cursor para descargar</span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>

              <div
                className="flip-card-back bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-2 border-rose-500/60 dark:border-rose-500/40 p-4 sm:p-5 flex flex-col justify-between shadow-xl dark:shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <LayoutList className="w-4 h-4" /> Torneos y Resumen
                    </span>
                    {toastMap['historial'] && <Toast {...toastMap['historial']!} />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-snug">
                    Descarga el listado histórico de torneos o un resumen ejecutivo compacto en una sola hoja.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <DownloadBtn
                    loading={busy('historial')}
                    disabled={torneos.length === 0}
                    onClick={handleTorneoList}
                    label="Lista torneos"
                    color="rose"
                    size="sm"
                  />
                  <DownloadBtn
                    loading={busy('resumen')}
                    disabled={!data}
                    onClick={handleResumen}
                    label="Resumen torneo"
                    color="emerald"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}