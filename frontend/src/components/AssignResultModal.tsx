import { useState, useEffect } from 'react';
import { Fight } from '../types';
import { Trophy, Timer, Swords, X, Check } from '../animated-icons';
import { cleanTimeInput, normalizeTimeOnBlur } from '../utils/time';

interface AssignResultModalProps {
  open: boolean;
  fight: Fight | null;
  timeString: string;
  onClose: () => void;
  onConfirm: (result: {
    winner: 1 | 2 | 'tablas' | 'solo_tiempo';
    time: string;
  }) => Promise<void>;
}

export function AssignResultModal({
  open,
  fight,
  timeString,
  onClose,
  onConfirm,
}: AssignResultModalProps) {
  const [time, setTime] = useState(timeString);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTime(timeString);
  }, [timeString, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, saving, onClose]);

  if (!open || !fight) return null;

  const g1Name = fight.gallo1?.galpon || 'Gallo 1';
  const g2Name = fight.gallo2?.galpon || 'Gallo 2';

  const handleSelect = async (winner: 1 | 2 | 'tablas' | 'solo_tiempo') => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm({
        winner,
        time: normalizeTimeOnBlur(time.trim() || timeString),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white grid place-items-center shadow-lg shadow-orange-500/30 flex-shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white font-mono">
                  Pelea #{fight.numero}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {fight.hoja}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                ¿Quién ganó la pelea?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Tiempo oficial registrado</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Puedes ajustar el tiempo si es necesario</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">⏱</span>
              <input
                type="text"
                value={time}
                maxLength={5}
                inputMode="decimal"
                onChange={(e) => setTime(cleanTimeInput(e.target.value, time))}
                onBlur={(e) => setTime(normalizeTimeOnBlur(e.target.value))}
                placeholder="m:ss"
                className="w-24 px-3 py-1.5 text-center font-mono font-black text-base rounded-xl border border-amber-400/40 bg-white dark:bg-slate-950 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/30 dark:bg-orange-950/20 p-4 flex flex-col justify-between hover:border-orange-500 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Gallo 1 (Izquierda)
                  </span>
                  {fight.gallo1?.color && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {fight.gallo1.color}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate" title={g1Name}>
                  {g1Name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {fight.gallo1?.ficha && <span>Ficha: <strong>{fight.gallo1.ficha}</strong></span>}
                  {fight.gallo1?.peso && <span>· {fight.gallo1.peso} oz</span>}
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSelect(1)}
                className="mt-4 w-full py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy className="w-4 h-4" />
                Ganó {g1Name}
              </button>
            </div>

            <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/30 dark:bg-sky-950/20 p-4 flex flex-col justify-between hover:border-sky-500 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Gallo 2 (Derecha)
                  </span>
                  {fight.gallo2?.color && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {fight.gallo2.color}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate" title={g2Name}>
                  {g2Name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {fight.gallo2?.ficha && <span>Ficha: <strong>{fight.gallo2.ficha}</strong></span>}
                  {fight.gallo2?.peso && <span>· {fight.gallo2.peso} oz</span>}
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSelect(2)}
                className="mt-4 w-full py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy className="w-4 h-4" />
                Ganó {g2Name}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800 mt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSelect('tablas')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span>⚖</span>
            <span>Declarar Tablas (Empate)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSelect('solo_tiempo')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Solo guardar tiempo
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}