import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Play, Pause, Search, Timer, Zap, X } from '../animated-icons';
import { sileo } from 'sileo';
import { SkipBackButton } from './ui/SkipBackButton';
import { TournamentData, Fight } from '../types';
import { updateFight } from '../services/api';
import { AssignResultModal } from './AssignResultModal';
import { isStopwatchEligible } from '../utils/stopwatch';

interface StopwatchModalProps {
  data: TournamentData | null;
  onDataChange: () => void;
  onClose: () => void;
}

export function StopwatchModal({ data, onDataChange, onClose }: StopwatchModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [targetFight, setTargetFight] = useState<number | null>(null);
  const [assigned, setAssigned] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const comboRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const pendingFights = useMemo(() => data
    ? Object.values(data.hojas).flat().filter(isStopwatchEligible).sort((a, b) => a.numero - b.numero)
    : [], [data]);
  const allFights = pendingFights;

  useEffect(() => {
    if (!pendingFights.some(f => f.numero === targetFight)) {
      setTargetFight(pendingFights[0]?.numero ?? null);
      setShowResultModal(false);
      setComboOpen(false);
      setIsRunning(false);
      baseElapsedRef.current = 0;
      setElapsed(0);
    }
  }, [pendingFights, targetFight]);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false); setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      const tick = () => {
        const next = baseElapsedRef.current + (performance.now() - startTimeRef.current);
        const maximum = data?.configuracion.limiteTiempoActivo ? data.configuracion.duracionMaximaSegundos * 1000 : Number.POSITIVE_INFINITY;
        if (next >= maximum) {
          baseElapsedRef.current = maximum;
          setElapsed(maximum);
          setIsRunning(false);
          return;
        }
        setElapsed(next);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isRunning, data?.configuracion.duracionMaximaSegundos, data?.configuracion.limiteTiempoActivo]);

  function handleStart() {
    if (pendingFights.some(f => f.numero === targetFight)) setIsRunning(true);
  }

  function handlePause() {
    baseElapsedRef.current += performance.now() - startTimeRef.current;
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    baseElapsedRef.current = 0;
    setElapsed(0);
    setAssigned(false);
  }

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea, button')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (isRunning) handlePause();
        else handleStart();
      }
      if (event.code === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isRunning, onClose, pendingFights, targetFight]);

  function handleAssign() {
    if (!selectedFight || !data || elapsed === 0) return;
    if (isRunning) {
      baseElapsedRef.current += performance.now() - startTimeRef.current;
      setIsRunning(false);
    }
    setShowResultModal(true);
  }

  async function handleConfirmResult({
    winner,
    time,
  }: {
    winner: 1 | 2 | 'tablas' | 'solo_tiempo';
    time: string;
  }) {
    if (!selectedFight || targetFight === null || !data) return;
    for (const sheet in data.hojas) {
      const fight = data.hojas[sheet].find((f) => f.numero === targetFight);
      if (fight && isStopwatchEligible(fight)) {
        try {
          const updated = JSON.parse(JSON.stringify(fight)) as Fight;
          updated.tiempo = time;
          if (winner === 1) {
            updated.gallo1.resultado = 'GANÓ';
            updated.gallo2.resultado = 'PERDIÓ';
          } else if (winner === 2) {
            updated.gallo2.resultado = 'GANÓ';
            updated.gallo1.resultado = 'PERDIÓ';
          } else if (winner === 'tablas') {
            updated.gallo1.resultado = 'TABLAS';
            updated.gallo2.resultado = 'TABLAS';
          }

          await updateFight(targetFight, updated);
          await onDataChange();

          const outcomeDesc =
            winner === 1
              ? `Ganó ${fight.gallo1.galpon || 'Gallo 1'}`
              : winner === 2
              ? `Ganó ${fight.gallo2.galpon || 'Gallo 2'}`
              : winner === 'tablas'
              ? 'Tablas (Empate)'
              : 'Tiempo registrado';

          sileo.success({
            title: `Pelea #${targetFight} registrada`,
            description: `${outcomeDesc} · ⏱ ${time}`,
          });

          setAssigned(true);
          setTimeout(() => setAssigned(false), 2500);
          handleReset();
        } catch (error) {
          sileo.error({
            title: 'Error al registrar pelea',
            description: error instanceof Error ? error.message : 'No se pudo guardar el resultado de la pelea.',
          });
        }
        break;
      }
    }
  }

  const totalSec = Math.floor(elapsed / 1000);
  const ms = Math.floor((elapsed % 1000) / 100);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const display = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  const displayTimeOnly = `${m}:${s < 10 ? '0' : ''}${s}`;
  const selectedFight = allFights.find(f => f.numero === targetFight);
  const q = searchQuery.toLowerCase().trim();
  const match = (f: typeof allFights[0]) =>
    !q || `${f.numero}`.includes(q) ||
    (f.gallo1.galpon || '').toLowerCase().includes(q) ||
    (f.gallo2.galpon || '').toLowerCase().includes(q);
  const filteredPending = pendingFights.filter(match);
  const hasResults = filteredPending.length > 0;
  function selectFight(num: number) { setTargetFight(num); setAssigned(false); setComboOpen(false); setSearchQuery(''); }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Timer className="w-5 h-5 text-brand-500" /> Cronómetro Oficial de Valla
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`font-mono text-6xl font-extrabold tabular-nums tracking-wider transition-colors ${isRunning
                ? 'text-brand-500 dark:text-brand-400 drop-shadow-[0_0_16px_rgba(194,65,12,0.5)]'
                : elapsed > 0
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              }`}>
              {display}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {isRunning ? 'Cronómetro en marcha — Barra espaciadora para pausar' : 'Presione Iniciar o Barra espaciadora'}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1">{data?.configuracion.limiteTiempoActivo ? `Límite: ${Math.floor(data.configuracion.duracionMaximaSegundos / 60)}:${String(data.configuracion.duracionMaximaSegundos % 60).padStart(2, '0')}` : 'Sin límite de tiempo'}</p>
          </div>
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={isRunning ? handlePause : handleStart}
              disabled={!selectedFight}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 ${isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
                }`}
            >
              {isRunning ? <><Pause className="w-5 h-5" /> Pausar</> : <><Play className="w-5 h-5" /> Iniciar</>}
            </button>
            <SkipBackButton
              onClick={handleReset}
              title="Reiniciar cronómetro"
              aria-label="Reiniciar cronómetro"
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              size={20}
            >
              Reiniciar
            </SkipBackButton>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center mb-6">
            Atajo: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 font-mono">Barra espaciadora</kbd>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asignar tiempo a pelea:</p>
              {pendingFights.length > 0 && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {pendingFights.length} pendiente{pendingFights.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {allFights.length === 0 ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center">
                <p className="text-sm font-semibold text-slate-400">No hay peleas pendientes.</p>
                <p className="text-xs text-slate-400 mt-1">Solo se muestran peleas sin tiempo ni resultado registrado.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 items-start">
                  <div ref={comboRef} className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => { setComboOpen(p => !p); if (!comboOpen) setTimeout(() => searchRef.current?.focus(), 50); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border transition-all ${comboOpen ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                      {selectedFight ? (
                        <>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedFight.gallo1.resultado || selectedFight.gallo2.resultado ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          <span className="flex-1 text-left text-slate-900 dark:text-slate-100 font-medium truncate">
                            <span className="text-slate-400 text-xs mr-1">#{selectedFight.numero}</span>
                            {selectedFight.gallo1.galpon || '?'}
                            <span className="text-slate-400 mx-1 font-normal">vs</span>
                            {selectedFight.gallo2.galpon || '?'}
                          </span>
                        </>
                      ) : (
                        <span className="flex-1 text-left text-slate-400">Seleccionar pelea...</span>
                      )}
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${comboOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {comboOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-black/20 overflow-hidden">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Buscar por galpon o numero..."
                              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                            />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>}
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1.5">
                          {!hasResults && <div className="px-4 py-3 text-xs text-slate-400 text-center">Sin coincidencias</div>}
                          {filteredPending.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pendientes</span>
                                <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/40" />
                                <span className="text-[10px] text-amber-500 font-bold">{filteredPending.length}</span>
                              </div>
                              {filteredPending.map(f => (
                                <button key={f.numero} type="button" onClick={() => selectFight(f.numero)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${targetFight === f.numero ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{f.gallo1.galpon || '?'}<span className="text-slate-400 font-normal mx-1">vs</span>{f.gallo2.galpon || '?'}</p>
                                    <p className="text-[10px] text-slate-400">Pelea #{f.numero}{f.tiempo ? ` · ${f.tiempo}` : ''}</p>
                                  </div>
                                  {targetFight === f.numero && <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />}
                                </button>
                              ))}
                            </>
                          )}

                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleAssign} disabled={!selectedFight || elapsed === 0}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${assigned ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                  >
                    {assigned ? <><Check className="w-4 h-4" /> Listo</> : <><Zap className="w-4 h-4" /> Asignar</>}
                  </button>
                </div>

                {selectedFight && (
                  <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedFight.gallo1.resultado || selectedFight.gallo2.resultado ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      <span className="text-sm">{selectedFight.gallo1.resultado || selectedFight.gallo2.resultado ? '\u2713' : '\u23f3'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedFight.gallo1.galpon || '?'}<span className="text-slate-400 font-normal mx-1.5">vs</span>{selectedFight.gallo2.galpon || '?'}
                      </p>
                      <p className="text-[11px] text-slate-400">Pelea #{selectedFight.numero}{selectedFight.tiempo ? ` · Tiempo previo: ${selectedFight.tiempo}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0 ${selectedFight.gallo1.resultado || selectedFight.gallo2.resultado ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                      {selectedFight.gallo1.resultado || selectedFight.gallo2.resultado ? 'Finalizada' : 'Pendiente'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AssignResultModal
        open={showResultModal}
        fight={selectedFight || null}
        timeString={displayTimeOnly}
        onClose={() => setShowResultModal(false)}
        onConfirm={handleConfirmResult}
      />
    </div>
  );
}