import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Check, Play, Pause, Timer, Zap, RefreshCw, Search, ChevronDown, X, Swords } from '../animated-icons';
import { TournamentData, Fight } from '../types';
import { updateFight } from '../services/api';
import { sileo } from 'sileo';
import { AssignResultModal } from './AssignResultModal';
import { isStopwatchEligible } from '../utils/stopwatch';

interface InlineStopwatchProps {
  data: TournamentData | null;
  fights: Fight[];
  onDataChange: () => void;
}

export function InlineStopwatch({ data, fights, onDataChange }: InlineStopwatchProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [targetFight, setTargetFight] = useState<number | null>(null);
  const [assigned, setAssigned] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const animRef = useRef<number>(0);

  const pendingTimeFights = useMemo(() => fights.filter(isStopwatchEligible).sort((a, b) => a.numero - b.numero), [fights]);

  useEffect(() => {
    if (!pendingTimeFights.some(f => f.numero === targetFight)) {
      setTargetFight(pendingTimeFights[0]?.numero ?? null);
      setShowResultModal(false);
      setIsOpen(false);
      setIsRunning(false);
      baseElapsedRef.current = 0;
      setElapsed(0);
    }
  }, [pendingTimeFights, targetFight]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      const tick = () => {
        const next = baseElapsedRef.current + (performance.now() - startTimeRef.current);
        const max = data?.configuracion.limiteTiempoActivo
          ? data.configuracion.duracionMaximaSegundos * 1000
          : Infinity;
        if (next >= max) {
          baseElapsedRef.current = max;
          setElapsed(max);
          setIsRunning(false);
          sileo.warning({ title: 'Tiempo límite alcanzado' });
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
  }, [isRunning, data?.configuracion]);

  const handleStart = useCallback(() => { if (!locked && pendingTimeFights.some(f => f.numero === targetFight)) setIsRunning(true); }, [locked, pendingTimeFights, targetFight]);
  const handlePause = useCallback(() => {
    baseElapsedRef.current += performance.now() - startTimeRef.current;
    setIsRunning(false);
  }, []);
  const handleReset = useCallback(() => {
    setIsRunning(false);
    baseElapsedRef.current = 0;
    setElapsed(0);
    setAssigned(false);
    setLocked(false);
  }, []);

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

  const filteredFights = useMemo(() => {
    if (!searchQuery.trim()) return pendingTimeFights;
    const q = searchQuery.trim().toLowerCase();
    return pendingTimeFights.filter(f => {
      const numStr = f.numero.toString();
      const g1 = (f.gallo1.galpon || '').toLowerCase();
      const g2 = (f.gallo2.galpon || '').toLowerCase();
      const c1 = (f.gallo1.color || '').toLowerCase();
      const c2 = (f.gallo2.color || '').toLowerCase();
      return (
        numStr.includes(q) ||
        `#${numStr}`.includes(q) ||
        g1.includes(q) ||
        g2.includes(q) ||
        c1.includes(q) ||
        c2.includes(q)
      );
    });
  }, [pendingTimeFights, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [isOpen]);

  const totalSec = Math.floor(elapsed / 1000);
  const ms = Math.floor((elapsed % 1000) / 100);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const display = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  const displayTimeOnly = `${m}:${s < 10 ? '0' : ''}${s}`;

  const selectedFight = pendingTimeFights.find(f => f.numero === targetFight);
  const limitLabel = data?.configuracion.limiteTiempoActivo
    ? `Límite: ${Math.floor(data.configuracion.duracionMaximaSegundos / 60)}:${String(data.configuracion.duracionMaximaSegundos % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative">
      <div className="px-4 pt-3.5 pb-0 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 grid place-items-center flex-shrink-0">
          <Timer className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Cronómetro</p>
          {limitLabel && <p className="text-[10px] text-slate-400">{limitLabel}</p>}
        </div>
        {pendingTimeFights.length > 0 ? (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {pendingTimeFights.length} pendientes
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
            <Check className="w-3 h-3" /> Todas al día
          </span>
        )}
      </div>

      <div className="px-4 pt-3 pb-3 text-center">
        <div className={`font-mono text-4xl font-extrabold tabular-nums tracking-widest transition-colors ${isRunning
            ? 'text-brand-500 dark:text-brand-400 drop-shadow-[0_0_12px_rgba(194,65,12,0.4)]'
            : elapsed > 0
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}>
          {display}
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={isRunning ? handlePause : handleStart}
          disabled={locked || !selectedFight}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${locked
              ? 'bg-emerald-600 text-white'
              : isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
        >
          {locked
            ? <><Check className="w-4 h-4" /> Tiempo asignado</>
            : isRunning
              ? <><Pause className="w-4 h-4" /> Pausar</>
              : <><Play className="w-4 h-4" /> {elapsed > 0 ? 'Continuar' : 'Iniciar'}</>
          }
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={elapsed === 0 && !isRunning}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
          title={locked ? 'Reiniciar para nueva pelea' : 'Reiniciar'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0" ref={comboboxRef}>
            <button
              type="button"
              onClick={() => {
                if (!locked && pendingTimeFights.length > 0) {
                  setIsOpen(!isOpen);
                }
              }}
              disabled={locked || pendingTimeFights.length === 0}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs border rounded-xl transition-all text-left ${locked || pendingTimeFights.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                  : isOpen
                    ? 'bg-white dark:bg-slate-800 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedFight ? (
                  <>
                    <span className="flex-shrink-0 font-mono font-black text-[11px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      #{selectedFight.numero}
                    </span>
                    <span className="font-semibold truncate">
                      {selectedFight.gallo1.galpon || 'Galpón 1'}{' '}
                      <span className="text-slate-400 font-normal">vs</span>{' '}
                      {selectedFight.gallo2.galpon || 'Galpón 2'}
                    </span>
                  </>
                ) : fights.length === 0 ? (
                  <span className="text-slate-400">No hay peleas</span>
                ) : (
                  <span className="text-slate-400">No hay peleas pendientes</span>
                )}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-500' : ''
                  }`}
              />
            </button>

            {isOpen && (
              <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 backdrop-blur-md min-w-[260px]">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por #pelea, galpón..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="px-1.5 pb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1">
                  <span>Peleas pendientes</span>
                  <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-md font-mono">
                    {filteredFights.length} de {pendingTimeFights.length}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                  {filteredFights.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No se encontraron peleas
                    </div>
                  ) : (
                    filteredFights.map(f => {
                      const isSelected = f.numero === targetFight;
                      return (
                        <button
                          key={f.numero}
                          type="button"
                          onClick={() => {
                            setTargetFight(f.numero);
                            setAssigned(false);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${isSelected
                              ? 'bg-brand-500/15 border border-brand-500/30 text-brand-700 dark:text-brand-300 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono flex-shrink-0 ${isSelected
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                              #{f.numero}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate leading-snug">
                                {f.gallo1.galpon || 'Galpón 1'}{' '}
                                <span className="text-slate-400 font-normal">vs</span>{' '}
                                {f.gallo2.galpon || 'Galpón 2'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {f.tiempo ? `⏱ ${f.tiempo}` : 'Sin tiempo'}
                                {f.gallo1.resultado ? ` · Ganó ${f.gallo1.galpon || 'G1'}` : f.gallo2.resultado ? ` · Ganó ${f.gallo2.galpon || 'G2'}` : ''}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedFight || elapsed === 0 || locked}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${assigned
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
          >
            {assigned ? <><Check className="w-3.5 h-3.5" /> Listo</> : <><Zap className="w-3.5 h-3.5" /> Asignar</>}
          </button>
        </div>

        {selectedFight ? (
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">
            Pelea #{selectedFight.numero} · {selectedFight.tiempo ? `Tiempo: ${selectedFight.tiempo}` : 'Sin tiempo registrado'}{selectedFight.gallo1.resultado ? ` · Ganó ${selectedFight.gallo1.galpon || 'G1'}` : selectedFight.gallo2.resultado ? ` · Ganó ${selectedFight.gallo2.galpon || 'G2'}` : ''}
          </p>
        ) : pendingTimeFights.length === 0 && fights.length > 0 ? (
          <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1.5 truncate flex items-center gap-1 font-medium">
            <Check className="w-3 h-3 flex-shrink-0" /> No hay peleas pendientes de cronometrar
          </p>
        ) : null}
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