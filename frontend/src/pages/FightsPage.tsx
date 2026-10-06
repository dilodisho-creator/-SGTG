import { Fragment, useState, useEffect, useMemo } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { FightPlanner } from '../components/FightPlanner';
import { Fight, TournamentData } from '../types';
import { cancelFight, resetFightsData, updateFight, syncPollones, syncFrentes, syncPremios } from '../services/api';
import { Bird, ChevronDown, Crown, LayoutList, SlidersHorizontal, Search, Filter, Check, Minus, X, RefreshCw, Settings2, Swords, Trophy, Timer } from '../animated-icons';
import { TrashButton } from '../components/ui/TrashButton';
import { EditButton } from '../components/ui/EditButton';
import { formatWeight, WeightUnit } from '../utils/weight';
import { Select } from '../components/ui/Select';
import { Combobox, ComboOption } from '../components/ui/Combobox';
import { SuggestInput } from '../components/ui/SuggestInput';
import { DetailDrawer, DrawerRow } from '../components/ui/DetailDrawer';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { InlineStopwatch } from '../components/InlineStopwatch';
import { Pagination } from '../components/ui/Pagination';
import { sileo } from 'sileo';
import { cleanTimeInput, normalizeTimeOnBlur } from '../utils/time';

const COLOR_MAP: Record<string, string> = {
  'AJI': 'bg-red-900 text-red-200',
  'AJÍ': 'bg-red-900 text-red-200',
  'MORO BLANCO': 'bg-gradient-to-r from-slate-700 to-slate-100 text-amber-400',
  'MORO': 'bg-slate-700 text-slate-200',
  'GIRO': 'bg-amber-800 text-amber-200',
  'CENIZO': 'bg-slate-500 text-slate-100',
  'GALLINO': 'bg-purple-900 text-purple-200',
  'AMARILLO': 'bg-yellow-800 text-yellow-200',
  'PINTO': 'bg-indigo-800 text-indigo-200',
  'NEGRO': 'bg-slate-950 text-slate-400',
  'CARMELO': 'bg-orange-900 text-orange-200',
  'BLANCO': 'bg-slate-50 text-slate-900',
};

function getColorClass(color: string): string {
  if (!color) return 'bg-slate-800 text-slate-400';
  const upper = color.toUpperCase().trim();
  for (const [key, cls] of Object.entries(COLOR_MAP)) {
    if (upper.includes(key)) return cls;
  }
  return 'bg-slate-700 text-slate-300';
}

interface EditModalProps {
  fight: Fight | null;
  weightUnit: WeightUnit;
  data: TournamentData | null;
  onClose: () => void;
  onSave: (fight: Fight) => void;
}

function EditFightModal({ fight, weightUnit, data, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<Fight | null>(null);

  useEffect(() => {
    if (fight) setForm(JSON.parse(JSON.stringify(fight)));
  }, [fight]);

  const galponOptions: ComboOption[] = useMemo(() => {
    if (!data) return [];
    const list: ComboOption[] = data.galpones.map((g) => {
      const roostersCount = data.gallos.filter((r) => r.galponId === g.id).length;
      return {
        value: g.nombre,
        label: g.nombre,
        sub: g.propietario ? `Prop: ${g.propietario}` : undefined,
        badge: roostersCount > 0 ? `${roostersCount} gallos` : undefined,
      };
    }).sort((a, b) => a.label.localeCompare(b.label));

    if (form?.gallo1.galpon && !list.some((o) => o.value.toLowerCase() === form.gallo1.galpon.toLowerCase())) {
      list.unshift({ value: form.gallo1.galpon, label: form.gallo1.galpon, sub: 'Personalizado', badge: 'Manual' });
    }
    if (form?.gallo2.galpon && !list.some((o) => o.value.toLowerCase() === form.gallo2.galpon.toLowerCase())) {
      list.unshift({ value: form.gallo2.galpon, label: form.gallo2.galpon, sub: 'Personalizado', badge: 'Manual' });
    }
    return list;
  }, [data, form?.gallo1.galpon, form?.gallo2.galpon]);

  const colorOptions: ComboOption[] = useMemo(() => {
    const defaultColors = [
      'AJI', 'COLORADO', 'CENIZO', 'GIRO', 'CARMELO', 'NEGRO', 'BLANCO',
      'MORO', 'JABAO', 'CANAGUAY', 'PINTADO', 'ZAMBO', 'MALATO',
      'TALISAYO', 'GALLINO', 'AMARILLO', 'PINTO', 'MORO BLANCO',
    ];
    const set = new Set<string>(defaultColors);
    if (data) {
      data.gallos.forEach((g) => {
        if (g.color && g.color.trim()) set.add(g.color.trim().toUpperCase());
      });
      Object.values(data.hojas).forEach((fights) => {
        fights.forEach((f) => {
          if (f.gallo1?.color?.trim()) set.add(f.gallo1.color.trim().toUpperCase());
          if (f.gallo2?.color?.trim()) set.add(f.gallo2.color.trim().toUpperCase());
        });
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((c) => ({
      value: c,
      label: c,
    }));
  }, [data]);

  const g1GalponObj = useMemo(() => {
    if (!data || !form?.gallo1.galpon) return null;
    return data.galpones.find((g) => g.nombre.trim().toLowerCase() === form.gallo1.galpon.trim().toLowerCase());
  }, [data, form?.gallo1.galpon]);

  const g2GalponObj = useMemo(() => {
    if (!data || !form?.gallo2.galpon) return null;
    return data.galpones.find((g) => g.nombre.trim().toLowerCase() === form.gallo2.galpon.trim().toLowerCase());
  }, [data, form?.gallo2.galpon]);

  const selectedG1Rooster = useMemo(() => {
    if (!data || !form?.gallo1.ficha) return null;
    return data.gallos.find((g) => {
      const matchGalpon = g1GalponObj ? g.galponId === g1GalponObj.id : true;
      return matchGalpon && g.ficha.trim().toLowerCase() === form.gallo1.ficha.trim().toLowerCase();
    }) || null;
  }, [data, form?.gallo1.ficha, g1GalponObj]);

  const selectedG2Rooster = useMemo(() => {
    if (!data || !form?.gallo2.ficha) return null;
    return data.gallos.find((g) => {
      const matchGalpon = g2GalponObj ? g.galponId === g2GalponObj.id : true;
      return matchGalpon && g.ficha.trim().toLowerCase() === form.gallo2.ficha.trim().toLowerCase();
    }) || null;
  }, [data, form?.gallo2.ficha, g2GalponObj]);

  const g1RoosterOptions: ComboOption[] = useMemo(() => {
    if (!data) return [];
    const source = g1GalponObj
      ? data.gallos.filter((g) => g.galponId === g1GalponObj.id)
      : data.gallos;
    const opts: ComboOption[] = source.map((g) => {
      const gGalpon = data.galpones.find((gp) => gp.id === g.galponId);
      return {
        value: g.id,
        label: `Ficha ${g.ficha} · ${g.color}`,
        sub: `${gGalpon?.nombre || 'Galpón'} · ${formatWeight(g.peso, weightUnit)} · ${g.estado}`,
        badge: formatWeight(g.peso, weightUnit),
      };
    });
    if (form?.gallo1.ficha && !selectedG1Rooster) {
      opts.unshift({
        value: '__custom_g1__',
        label: `Ficha actual: ${form.gallo1.ficha}`,
        sub: `${form.gallo1.color || 'Sin color'} · ${formatWeight(form.gallo1.peso, weightUnit)}`,
        badge: 'Manual',
      });
    }
    return opts;
  }, [data, g1GalponObj, weightUnit, form?.gallo1.ficha, form?.gallo1.color, form?.gallo1.peso, selectedG1Rooster]);

  const g2RoosterOptions: ComboOption[] = useMemo(() => {
    if (!data) return [];
    const source = g2GalponObj
      ? data.gallos.filter((g) => g.galponId === g2GalponObj.id)
      : data.gallos;
    const opts: ComboOption[] = source.map((g) => {
      const gGalpon = data.galpones.find((gp) => gp.id === g.galponId);
      return {
        value: g.id,
        label: `Ficha ${g.ficha} · ${g.color}`,
        sub: `${gGalpon?.nombre || 'Galpón'} · ${formatWeight(g.peso, weightUnit)} · ${g.estado}`,
        badge: formatWeight(g.peso, weightUnit),
      };
    });
    if (form?.gallo2.ficha && !selectedG2Rooster) {
      opts.unshift({
        value: '__custom_g2__',
        label: `Ficha actual: ${form.gallo2.ficha}`,
        sub: `${form.gallo2.color || 'Sin color'} · ${formatWeight(form.gallo2.peso, weightUnit)}`,
        badge: 'Manual',
      });
    }
    return opts;
  }, [data, g2GalponObj, weightUnit, form?.gallo2.ficha, form?.gallo2.color, form?.gallo2.peso, selectedG2Rooster]);

  const g1RoosterValue = selectedG1Rooster ? selectedG1Rooster.id : (form?.gallo1.ficha ? '__custom_g1__' : '');
  const g2RoosterValue = selectedG2Rooster ? selectedG2Rooster.id : (form?.gallo2.ficha ? '__custom_g2__' : '');

  if (!fight || !form) return null;

  const setG1 = (field: string, value: string | number | null) => {
    setForm((prev) => (prev ? { ...prev, gallo1: { ...prev.gallo1, [field]: value } } : prev));
  };
  const setG2 = (field: string, value: string | number | null) => {
    setForm((prev) => (prev ? { ...prev, gallo2: { ...prev.gallo2, [field]: value } } : prev));
  };

  const handleSelectRooster1 = (roosterId: string) => {
    if (!roosterId) {
      setForm((prev) => (prev ? {
        ...prev,
        gallo1: { ...prev.gallo1, ficha: '', color: '', peso: null },
      } : prev));
      return;
    }
    if (roosterId.startsWith('__custom')) return;
    const g = data?.gallos.find((item) => item.id === roosterId);
    if (!g) return;
    const gGalpon = data?.galpones.find((item) => item.id === g.galponId);
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gallo1: {
          ...prev.gallo1,
          galpon: gGalpon?.nombre || prev.gallo1.galpon,
          ficha: g.ficha,
          color: g.color,
          peso: g.peso,
        },
      };
    });
  };

  const handleSelectRooster2 = (roosterId: string) => {
    if (!roosterId) {
      setForm((prev) => (prev ? {
        ...prev,
        gallo2: { ...prev.gallo2, ficha: '', color: '', peso: null },
      } : prev));
      return;
    }
    if (roosterId.startsWith('__custom')) return;
    const g = data?.gallos.find((item) => item.id === roosterId);
    if (!g) return;
    const gGalpon = data?.galpones.find((item) => item.id === g.galponId);
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gallo2: {
          ...prev.gallo2,
          galpon: gGalpon?.nombre || prev.gallo2.galpon,
          ficha: g.ficha,
          color: g.color,
          peso: g.peso,
        },
      };
    });
  };

  const handleResultadoChange1 = (res: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      let other = prev.gallo2.resultado;
      if (res === 'GANÓ') other = 'PERDIÓ';
      else if (res === 'PERDIÓ') other = 'GANÓ';
      else if (res === 'TABLAS') other = 'TABLAS';
      else if (res === '') other = '';
      return {
        ...prev,
        gallo1: { ...prev.gallo1, resultado: res as any },
        gallo2: { ...prev.gallo2, resultado: other as any },
      };
    });
  };

  const handleResultadoChange2 = (res: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      let other = prev.gallo1.resultado;
      if (res === 'GANÓ') other = 'PERDIÓ';
      else if (res === 'PERDIÓ') other = 'GANÓ';
      else if (res === 'TABLAS') other = 'TABLAS';
      else if (res === '') other = '';
      return {
        ...prev,
        gallo1: { ...prev.gallo1, resultado: other as any },
        gallo2: { ...prev.gallo2, resultado: res as any },
      };
    });
  };

  const handleQuickWinner = (outcome: 1 | 2 | 'tablas' | 'clear') => {
    setForm((prev) => {
      if (!prev) return prev;
      if (outcome === 1) {
        return {
          ...prev,
          gallo1: { ...prev.gallo1, resultado: 'GANÓ' },
          gallo2: { ...prev.gallo2, resultado: 'PERDIÓ' },
        };
      }
      if (outcome === 2) {
        return {
          ...prev,
          gallo1: { ...prev.gallo1, resultado: 'PERDIÓ' },
          gallo2: { ...prev.gallo2, resultado: 'GANÓ' },
        };
      }
      if (outcome === 'tablas') {
        return {
          ...prev,
          gallo1: { ...prev.gallo1, resultado: 'TABLAS' },
          gallo2: { ...prev.gallo2, resultado: 'TABLAS' },
        };
      }
      return {
        ...prev,
        gallo1: { ...prev.gallo1, resultado: '' },
        gallo2: { ...prev.gallo2, resultado: '' },
      };
    });
  };

  const g1Won = form.gallo1.resultado === 'GANÓ';
  const g2Won = form.gallo2.resultado === 'GANÓ';
  const isDraw = form.gallo1.resultado === 'TABLAS';
  const isPending = !form.gallo1.resultado && !form.gallo2.resultado;



  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-orange-500/10 via-brand-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white grid place-items-center shadow-md shadow-brand-500/30 font-mono font-black text-sm">
              #{fight.numero}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Editar Enfrentamiento #{fight.numero}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fight.hoja ? `Hoja: ${fight.hoja}` : 'Configura participantes y resultado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Resultado Rápido de la Pelea
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {isPending ? 'Pendiente' : g1Won ? `Ganó ${form.gallo1.galpon || 'G1'}` : g2Won ? `Ganó ${form.gallo2.galpon || 'G2'}` : 'Tablas'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickWinner(1)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 border ${g1Won
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:text-orange-600'
                  }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                Ganó G1
              </button>
              <button
                type="button"
                onClick={() => handleQuickWinner('tablas')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 border ${isDraw
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400 hover:text-amber-600'
                  }`}
              >
                <span>⚖</span>
                Tablas
              </button>
              <button
                type="button"
                onClick={() => handleQuickWinner(2)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 border ${g2Won
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600'
                  }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                Ganó G2
              </button>
              <button
                type="button"
                onClick={() => handleQuickWinner('clear')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 active:scale-95 border ${isPending
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Minus className="w-3.5 h-3.5" />
                Pendiente
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${g1Won ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-orange-200 dark:border-orange-500/30 bg-orange-50/20 dark:bg-orange-950/10'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-orange-200/60 dark:border-orange-500/20">
                <span className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <Bird className="w-4 h-4" />
                  Participante 1
                </span>
                {g1Won && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    GANADOR
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 grid place-items-center text-xs font-black flex-shrink-0">
                  {(form.gallo1.ficha || form.gallo1.galpon || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {form.gallo1.galpon || 'Sin galpón'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {[form.gallo1.color, form.gallo1.peso != null ? formatWeight(form.gallo1.peso, weightUnit) : null].filter(Boolean).join(' · ') || 'Sin datos'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${g2Won ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-sky-200 dark:border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/10'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-sky-200/60 dark:border-sky-500/20">
                <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Bird className="w-4 h-4" />
                  Participante 2
                </span>
                {g2Won && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    GANADOR
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 grid place-items-center text-xs font-black flex-shrink-0">
                  {(form.gallo2.ficha || form.gallo2.galpon || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {form.gallo2.galpon || 'Sin galpón'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {[form.gallo2.color, form.gallo2.peso != null ? formatWeight(form.gallo2.peso, weightUnit) : null].filter(Boolean).join(' · ') || 'Sin datos'}
                  </p>
                </div>
              </div>
            </div>
          </div>



          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-brand-500" />
              Detalles del Combate
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Caja de Apuesta (S/.)
                </label>
                <input
                  type="number"
                  step="10"
                  value={form.caja ?? ''}
                  onChange={(e) => setForm((prev) => (prev ? { ...prev, caja: e.target.value ? parseFloat(e.target.value) : null } : prev))}
                  placeholder="Ej. 100"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Tiempo Oficial (m:ss)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 01:21 o 1:21"
                  maxLength={5}
                  inputMode="decimal"
                  value={form.tiempo}
                  onChange={(e) => {
                    const val = cleanTimeInput(e.target.value, form.tiempo);
                    setForm((prev) => (prev ? { ...prev, tiempo: val } : prev));
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeTimeOnBlur(e.target.value);
                    if (normalized !== form.tiempo) {
                      setForm((prev) => (prev ? { ...prev, tiempo: normalized } : prev));
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (form) {
                const finalTiempo = normalizeTimeOnBlur(form.tiempo);
                onSave({ ...form, tiempo: finalTiempo });
              }
            }}
            className="px-6 py-2.5 text-xs font-black rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

interface FightsPageProps {
  data: TournamentData | null;
  onDataChange: () => void;
  onOpenSettings: () => void;
}

export function FightsPage({ data, onDataChange, onOpenSettings }: FightsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending'>('all');
  const [editingFight, setEditingFight] = useState<Fight | null>(null);
  const [selectedFight, setSelectedFight] = useState<Fight | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const allScheduledFights = useMemo(() => {
    if (!data) return [];
    return Object.values(data.hojas).flat()
      .filter((fight) => fight.gallo1.galpon && fight.gallo2.galpon)
      .sort((first, second) => first.numero - second.numero);
  }, [data]);

  let fights = allScheduledFights;
  const scheduledCount = fights.length;
  if (searchTerm) {
    const query = searchTerm.toLocaleLowerCase('es-PE');
    fights = fights.filter((fight) => fight.gallo1.galpon.toLocaleLowerCase('es-PE').includes(query)
      || fight.gallo2.galpon.toLocaleLowerCase('es-PE').includes(query)
      || fight.gallo1.color.toLocaleLowerCase('es-PE').includes(query)
      || fight.gallo2.color.toLocaleLowerCase('es-PE').includes(query)
      || fight.numero.toString().includes(query));
  }
  if (statusFilter === 'done') fights = fights.filter((fight) => fight.gallo1.resultado || fight.gallo2.resultado);
  if (statusFilter === 'pending') fights = fights.filter((fight) => !fight.gallo1.resultado && !fight.gallo2.resultado);
  const filteredCount = fights.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const paginatedFights = fights.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [searchTerm, statusFilter, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
      Cargando enfrentamientos...
    </div>
  );
  async function handleQuickResult(fight: Fight, winner: 1 | 2 | 'tablas') {
    const updated = JSON.parse(JSON.stringify(fight)) as Fight;
    if (winner === 1) { updated.gallo1.resultado = 'GANÓ'; updated.gallo2.resultado = 'PERDIÓ'; }
    else if (winner === 2) { updated.gallo2.resultado = 'GANÓ'; updated.gallo1.resultado = 'PERDIÓ'; }
    else { updated.gallo1.resultado = 'TABLAS'; updated.gallo2.resultado = 'TABLAS'; }
    try {
      await updateFight(fight.numero, updated);
      await onDataChange();
      const resText = winner === 'tablas'
        ? 'Tablas'
        : `Ganó ${winner === 1 ? (fight.gallo1.galpon || 'Gallo 1') : (fight.gallo2.galpon || 'Gallo 2')}`;
      sileo.success({
        title: `Pelea #${fight.numero} actualizada`,
        description: `Resultado registrado: ${resText}`,
      });
    } catch (error) {
      sileo.error({
        title: 'Error al actualizar resultado',
        description: error instanceof Error ? error.message : 'No se pudo guardar el resultado.',
      });
    }
  }

  async function handleClear(fight: Fight) {
    const updated = JSON.parse(JSON.stringify(fight)) as Fight;
    updated.gallo1.resultado = ''; updated.gallo2.resultado = ''; updated.tiempo = '';
    try {
      await updateFight(fight.numero, updated);
      await onDataChange();
      sileo.info({
        title: `Pelea #${fight.numero} reiniciada`,
        description: 'Se restableció el resultado y tiempo de la pelea.',
      });
    } catch (error) {
      sileo.error({
        title: 'Error al reiniciar pelea',
        description: error instanceof Error ? error.message : 'No se pudo reiniciar la pelea.',
      });
    }
  }

  async function handleSaveEdit(fight: Fight) {
    try {
      await updateFight(fight.numero, fight);
      await onDataChange();
      setEditingFight(null);
      sileo.success({
        title: `Pelea #${fight.numero} guardada`,
        description: 'Los cambios fueron actualizados correctamente.',
      });
    } catch (error) {
      sileo.error({
        title: 'Error al guardar cambios',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los cambios de la pelea.',
      });
    }
  }

  async function handleCancelFight(fight: Fight) {
    const ok = await confirm({
      title: `Cancelar Pelea #${fight.numero}`,
      description: `Los dos gallos (${fight.gallo1.galpon || '?'} y ${fight.gallo2.galpon || '?'}) volverán a estar disponibles.`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'Volver',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await cancelFight(fight.numero);
      await onDataChange();
      sileo.success({
        title: `Pelea #${fight.numero} cancelada`,
        description: 'La pelea fue eliminada y los gallos volvieron a estar disponibles.',
      });
    } catch (error) {
      sileo.error({
        title: 'Error al cancelar pelea',
        description: error instanceof Error ? error.message : 'No se pudo cancelar la pelea.',
      });
    }
  }

  async function handleSyncAll() {
    try {
      await syncFrentes();
      await syncPremios();
      if (data?.configuracion.pollonesActivos) await syncPollones();
      await onDataChange();
      sileo.success({
        title: 'Sincronización completa',
        description: 'Frentes, premios y pollones actualizados.',
      });
    } catch (error) {
      sileo.error({
        title: 'Error al sincronizar',
        description: error instanceof Error ? error.message : 'No se pudo completar la sincronización.',
      });
    }
  }

  async function handleResetFights() {
    const ok = await confirm({
      title: 'Reiniciar peleas',
      description: 'Se eliminarán todos los enfrentamientos y resultados, pero se conservarán galpones y gallos. Los gallos asignados volverán a estar disponibles.',
      confirmLabel: 'Sí, reiniciar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await resetFightsData();
      await onDataChange();
      sileo.success({
        title: 'Peleas reiniciadas',
        description: 'Todos los enfrentamientos fueron eliminados correctamente.',
      });
    } catch (error) {
      sileo.error({
        title: 'Error al reiniciar peleas',
        description: error instanceof Error ? error.message : 'No se pudieron reiniciar las peleas.',
      });
    }
  }

  return (
    <>
      <PageShell>
        <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(320px,400px)_1fr] gap-5 items-stretch">

          <div className="flex flex-col gap-4 no-print min-h-0">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
              <FightPlanner data={data} onDataChange={onDataChange} />
            </section>
            <InlineStopwatch data={data} fights={allScheduledFights} onDataChange={onDataChange} />
          </div>

          <div className="flex flex-col gap-3 min-h-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm no-print flex-shrink-0">
              <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar galpón, color, número..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  {(['all', 'pending', 'done'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${statusFilter === s
                          ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                      {s === 'all' ? 'Todos' : s === 'pending' ? 'Próximos' : 'Finalizados'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  Mostrar
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                      className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-7 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </label>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{filteredCount} de {scheduledCount} peleas</div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => void handleResetFights()}
                    data-motion-icon-group=""
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" trigger="parent-hover" mode="signature" />
                    Reiniciar peleas
                  </button>
                  <button
                    onClick={onOpenSettings}
                    data-motion-icon-group=""
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" trigger="parent-hover" mode="signature" />
                    Reglas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {paginatedFights.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500 text-sm">
                  {scheduledCount === 0 ? 'Todavía no hay enfrentamientos programados.' : 'No se encontraron peleas.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {paginatedFights.map(fight => {
                    const g1Won = fight.gallo1.resultado === 'GANÓ';
                    const g2Won = fight.gallo2.resultado === 'GANÓ';
                    const isTablas = fight.gallo1.resultado === 'TABLAS';
                    const hasResult = g1Won || g2Won || isTablas;
                    const isPending = !hasResult;
                    return (
                      <div
                        key={fight.numero}
                        onClick={() => setSelectedFight(fight)}
                        className={`relative rounded-2xl border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden group ${g1Won ? 'border-orange-300 dark:border-orange-700/60 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 dark:to-slate-900' :
                            g2Won ? 'border-sky-300 dark:border-sky-700/60 bg-gradient-to-bl from-sky-50 to-white dark:from-sky-900/10 dark:to-slate-900' :
                              isTablas ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/10' :
                                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                      >
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pelea #{fight.numero}</span>
                          {fight.caja ? <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">S/. {fight.caja}</span> : null}
                          {hasResult ? (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isTablas ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                              }`}>{isTablas ? 'Tablas' : 'Finalizada'}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Pendiente</span>
                          )}
                        </div>

                        <div className="px-3 pb-2 flex items-center gap-2">
                          <div className={`flex-1 rounded-xl p-2.5 text-center transition-all ${g1Won ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' :
                              hasResult && !g1Won ? 'opacity-35' :
                                'bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                            {g1Won && <div className="text-amber-500 text-sm mb-0.5">👑</div>}
                            <p className={`font-extrabold text-sm leading-tight truncate ${g1Won ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                              }`}>{fight.gallo1.galpon || '?'}</p>
                            <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
                              {fight.gallo1.color && <span className={`text-[9px] font-bold px-1.5 rounded-full ${getColorClass(fight.gallo1.color)}`}>{fight.gallo1.color}</span>}
                              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">{formatWeight(fight.gallo1.peso, data.configuracion.unidadPeso)}</span>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-center">
                            <span className="text-xs font-black text-slate-300 dark:text-slate-600">VS</span>
                          </div>

                          <div className={`flex-1 rounded-xl p-2.5 text-center transition-all ${g2Won ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' :
                              hasResult && !g2Won ? 'opacity-35' :
                                'bg-slate-50 dark:bg-slate-800/50'
                            }`}>
                            {g2Won && <div className="text-amber-500 text-sm mb-0.5">👑</div>}
                            <p className={`font-extrabold text-sm leading-tight truncate ${g2Won ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                              }`}>{fight.gallo2.galpon || '?'}</p>
                            <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
                              {fight.gallo2.color && <span className={`text-[9px] font-bold px-1.5 rounded-full ${getColorClass(fight.gallo2.color)}`}>{fight.gallo2.color}</span>}
                              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">{formatWeight(fight.gallo2.peso, data.configuracion.unidadPeso)}</span>
                            </div>
                          </div>
                        </div>

                        {isPending && (
                          <div className="px-3 pb-3" onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => handleQuickResult(fight, 1)}
                                className="py-2.5 rounded-xl text-xs font-extrabold bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 dark:hover:text-white transition-all active:scale-95 border border-orange-200 dark:border-orange-700/40"
                              >
                                Ganó<br /><span className="text-[9px] font-bold opacity-70 truncate block px-1">{fight.gallo1.galpon || 'G1'}</span>
                              </button>
                              <button
                                onClick={() => handleQuickResult(fight, 'tablas')}
                                className="py-2.5 rounded-xl text-xs font-extrabold bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 transition-all active:scale-95 border border-amber-200 dark:border-amber-700/40"
                              >
                                ⚖<br /><span className="text-[9px] font-bold opacity-70">Empate</span>
                              </button>
                              <button
                                onClick={() => handleQuickResult(fight, 2)}
                                className="py-2.5 rounded-xl text-xs font-extrabold bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 transition-all active:scale-95 border border-sky-200 dark:border-sky-700/40"
                              >
                                Ganó<br /><span className="text-[9px] font-bold opacity-70 truncate block px-1">{fight.gallo2.galpon || 'G2'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input
                              key={`tiempo-${fight.numero}-${fight.tiempo}`}
                              type="text"
                              defaultValue={fight.tiempo}
                              placeholder="m:ss"
                              maxLength={5}
                              inputMode="decimal"
                              onInput={(e) => {
                                const el = e.target as HTMLInputElement;
                                const prev = el.dataset.prev || '';
                                el.value = cleanTimeInput(el.value, prev);
                                el.dataset.prev = el.value;
                              }}
                              onBlur={async (e) => {
                                const normalized = normalizeTimeOnBlur(e.target.value);
                                e.target.value = normalized;
                                e.target.dataset.prev = normalized;
                                if (normalized !== fight.tiempo) {
                                  await updateFight(fight.numero, { ...fight, tiempo: normalized });
                                  onDataChange();
                                }
                              }}
                              className="w-14 text-center text-xs font-bold font-mono text-amber-600 dark:text-amber-400 bg-transparent border-b border-dashed border-amber-400/40 focus:outline-none focus:border-amber-500"
                              title="Tiempo"
                            />
                            {hasResult && (
                              <button
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: `Limpiar resultado — Pelea #${fight.numero}`,
                                    description: `¿Seguro que deseas eliminar el resultado de la Pelea #${fight.numero}? Esta acción no se puede deshacer.`,
                                    confirmLabel: 'Limpiar',
                                    cancelLabel: 'Cancelar',
                                  });
                                  if (ok) handleClear(fight);
                                }}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-500/10 px-2 py-0.5 rounded-lg transition-colors"
                              >
                                Limpiar resultado
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <EditButton onClick={() => setEditingFight(fight)} size={16} className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg" />
                            {!hasResult && !fight.tiempo ? (
                              <TrashButton onClick={() => void handleCancelFight(fight)} size={16} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {filteredCount > 0 && (
              <div className="no-print flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredCount}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="peleas"
                  className="border-t-0"
                />
              </div>
            )}
          </div>
        </div>

        {editingFight && (
          <EditFightModal
            fight={editingFight}
            weightUnit={data.configuracion.unidadPeso}
            data={data}
            onClose={() => setEditingFight(null)}
            onSave={handleSaveEdit}
          />
        )}
      </PageShell>

      {selectedFight && (() => {
        const f = selectedFight;
        const g1Won = f.gallo1.resultado === 'GANÓ';
        const g2Won = f.gallo2.resultado === 'GANÓ';
        const isTablas = f.gallo1.resultado === 'TABLAS';
        const isPending = !f.gallo1.resultado && !f.gallo2.resultado;
        return (
          <DetailDrawer
            open={!!selectedFight}
            onClose={() => setSelectedFight(null)}
            title={`Pelea N° ${f.numero}`}
            subtitle={f.hoja ? `Hoja: ${f.hoja}` : 'Sin hoja asignada'}
            icon={<Swords className="w-5 h-5" />}
            iconBg="bg-orange-500/10 text-orange-600"
            footer={
              <div className="flex gap-2">
                <button onClick={() => { setSelectedFight(null); setEditingFight(f); }} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold py-2.5 text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Editar pelea
                </button>
                {isPending && (
                  <button onClick={() => { setSelectedFight(null); void handleCancelFight(f); }} className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold py-2.5 text-red-600 dark:text-red-400 transition flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                )}
                {!isPending && (
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Limpiar resultado — Pelea #${f.numero}`,
                        description: `¿Seguro que deseas eliminar el resultado de la Pelea #${f.numero}? Esta acción no se puede deshacer.`,
                        confirmLabel: 'Limpiar',
                        cancelLabel: 'Cancelar',
                      });
                      if (ok) { void handleClear(f); setSelectedFight(null); }
                    }}
                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold py-2.5 text-slate-500 transition flex items-center justify-center gap-1.5"
                  >
                    <Minus className="w-3.5 h-3.5" /> Limpiar resultado
                  </button>
                )}
              </div>
            }
          >
            <div className={`mx-5 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${isTablas ? 'bg-amber-500/10 border border-amber-400/30' :
                g1Won || g2Won ? 'bg-emerald-500/10 border border-emerald-400/30' :
                  'bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
              }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isTablas ? 'bg-amber-500/20' :
                  g1Won || g2Won ? 'bg-emerald-500/20' :
                    'bg-slate-200 dark:bg-slate-700'
                }`}>
                <Swords className={`w-4 h-4 ${isTablas ? 'text-amber-600' : g1Won || g2Won ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-extrabold uppercase tracking-wide ${isTablas ? 'text-amber-600' : g1Won || g2Won ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                  {isTablas ? 'Empate (Tablas)' : g1Won ? `Ganó: ${f.gallo1.galpon || 'Participante 1'}` : g2Won ? `Ganó: ${f.gallo2.galpon || 'Participante 2'}` : 'Pendiente de resultado'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {f.tiempo ? `Tiempo: ${f.tiempo}` : 'Sin tiempo registrado'}{f.caja ? ` · Caja: S/. ${f.caja}` : ''}
                </p>
              </div>
            </div>

            <div className="px-5 pt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Participante 1', gallo: f.gallo1, won: g1Won, lost: g2Won && !isTablas },
                { label: 'Participante 2', gallo: f.gallo2, won: g2Won, lost: g1Won && !isTablas },
              ].map(({ label, gallo, won, lost }) => (
                <div key={label} className={`rounded-2xl border p-3 flex flex-col gap-2 transition-all ${won ? 'border-emerald-400/40 bg-emerald-500/8 dark:bg-emerald-500/10' :
                    lost ? 'border-red-300/40 bg-red-500/5 dark:bg-red-500/8 opacity-70' :
                      isTablas ? 'border-amber-300/40 bg-amber-500/8' :
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                    {won && <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">GANÓ</span>}
                    {lost && <span className="text-[9px] font-extrabold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">PERDIÓ</span>}
                    {isTablas && <span className="text-[9px] font-extrabold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">TABLAS</span>}
                  </div>
                  <p className={`text-sm font-extrabold leading-tight truncate ${won ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    {gallo.galpon || '—'}
                  </p>
                  {gallo.color && (
                    <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${getColorClass(gallo.color)}`}>
                      {gallo.color}
                    </span>
                  )}
                  <div className="space-y-0.5 mt-1">
                    {gallo.peso != null && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="text-slate-400">Peso:</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{formatWeight(gallo.peso, data.configuracion.unidadPeso)}</span>
                      </p>
                    )}
                    {gallo.ficha && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="text-slate-400">Ficha:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">#{gallo.ficha}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isPending && (
              <div className="px-5 pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Registrar resultado rápido</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { void handleQuickResult(f, 1); setSelectedFight(null); }}
                    className="rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold py-2.5 transition border border-orange-300/30 flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Ganó 1
                  </button>
                  <button onClick={() => { void handleQuickResult(f, 'tablas'); setSelectedFight(null); }}
                    className="rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold py-2.5 transition border border-amber-300/30 flex items-center justify-center gap-1">
                    <Minus className="w-3.5 h-3.5" /> Tablas
                  </button>
                  <button onClick={() => { void handleQuickResult(f, 2); setSelectedFight(null); }}
                    className="rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 text-xs font-bold py-2.5 transition border border-sky-300/30 flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Ganó 2
                  </button>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Datos de la pelea</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                <DrawerRow label="N° Pelea" value={<span className="font-mono font-bold">#{f.numero}</span>} />
                {f.caja != null && <DrawerRow label="Caja" value={<span className="font-bold text-amber-600">S/. {f.caja}</span>} />}
                {f.tiempo && <DrawerRow label="Tiempo" value={<span className="font-mono font-bold text-brand-600">{f.tiempo}</span>} />}
                {f.hoja && <DrawerRow label="Hoja" value={f.hoja} />}
                <DrawerRow label="Estado" value={
                  isPending
                    ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Pendiente</span>
                    : isTablas ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">Tablas</span>
                      : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">Finalizada</span>
                } />
              </div>
            </div>
          </DetailDrawer>
        );
      })()}
      {confirmDialog}
    </>
  );
}