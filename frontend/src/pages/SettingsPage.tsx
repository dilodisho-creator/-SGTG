import { FormEvent, useEffect, useState } from 'react';
import { sileo } from 'sileo';
import { Clock3, Plus, Save, Scale, Settings2, ShieldCheck, Trophy } from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { updateSettings } from '../services/api';
import { TournamentData, TournamentSettings } from '../types';
import { TrashButton } from '../components/ui/TrashButton';

type Section = 'general' | 'pesos' | 'ranking' | 'pollon';

const inputClass = 'w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const cardClass = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm';

export function SettingsPage({ data, onDataChange }: { data: TournamentData | null; onDataChange: () => void }) {
  const [form, setForm] = useState<TournamentSettings | null>(data?.configuracion ?? null);
  const [section, setSection] = useState<Section>('general');
  useEffect(() => setForm(data?.configuracion ?? null), [data?.configuracion]);
  if (!form) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    try {
      await updateSettings(form);
      await onDataChange();
      sileo.success({ title: 'Configuración guardada', description: 'Los cambios se aplicaron correctamente.' });
    } catch (err) {
      sileo.error({ title: 'Error al guardar', description: err instanceof Error ? err.message : 'No se pudo guardar la configuración.' });
    }
  }

  const sections = [
    { id: 'general' as const, label: 'General', icon: Settings2 },
    { id: 'pesos' as const, label: 'Pesos', icon: Scale },
    { id: 'ranking' as const, label: 'Ranking', icon: Trophy },
    { id: 'pollon' as const, label: 'Pollón y premios', icon: ShieldCheck },
  ];

  return (
    <PageShell>
      <form onSubmit={submit} className="h-full flex flex-col min-h-0">
        <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 mb-4">
          {sections.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`rounded-xl px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-2 ${section === item.id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Icon className="w-4 h-4" />{item.label}</button>; })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
          {section === 'general' && <>
            <section className={cardClass}>
              <div className="flex items-center gap-3 mb-5"><Settings2 className="w-5 h-5 text-brand-500" /><div><h2 className="font-extrabold text-slate-900 dark:text-white">Datos generales</h2><p className="text-xs text-slate-500">Identificación del evento</p></div></div>
              <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nombre del coliseo<input value={form.nombreColiseo} onChange={(event) => setForm({ ...form, nombreColiseo: event.target.value })} className={inputClass} /></label><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nombre del torneo<input value={form.nombreTorneo} onChange={(event) => setForm({ ...form, nombreTorneo: event.target.value })} className={inputClass} /></label></div>

              <div className="mt-4">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Logo del coliseo <span className="font-normal text-slate-400">(aparece en el encabezado de los Excel exportados)</span></p>
                <div className="flex items-center gap-4">
                  {form.logoBase64 && (
                    <img src={form.logoBase64} alt="Logo" className="h-16 w-16 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1" />
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
                    <span>{form.logoBase64 ? 'Cambiar imagen' : 'Subir imagen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result;
                          if (typeof result === 'string') setForm({ ...form, logoBase64: result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {form.logoBase64 && (
                    <button type="button" onClick={() => setForm({ ...form, logoBase64: '' })} className="text-xs text-red-500 hover:underline">Quitar</button>
                  )}
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="flex items-center justify-between gap-3 mb-1"><div className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-brand-500" /><h2 className="font-extrabold text-slate-900 dark:text-white">Tiempo reglamentario</h2></div><label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">Habilitado<input type="checkbox" checked={form.limiteTiempoActivo} onChange={(event) => setForm({ ...form, limiteTiempoActivo: event.target.checked })} className="w-4 h-4 accent-orange-500" /></label></div>
              <p className="text-xs text-slate-500 mb-4">Controla el límite del cronómetro y el tiempo usado en tablas.</p>
              <div className={`grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end ${!form.limiteTiempoActivo ? 'opacity-50 pointer-events-none' : ''}`}><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Duración máxima, segundos<input type="number" min="1" value={form.duracionMaximaSegundos} onChange={(event) => setForm({ ...form, duracionMaximaSegundos: Number(event.target.value) })} className={inputClass} /></label><button type="button" onClick={() => setForm({ ...form, duracionMaximaSegundos: 360 })} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold">6 minutos</button><button type="button" onClick={() => setForm({ ...form, duracionMaximaSegundos: 480 })} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold">8 minutos</button></div>
              <label className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm font-bold text-slate-700 dark:text-slate-200"><span>Usar el tiempo completo en tablas</span><input type="checkbox" disabled={!form.limiteTiempoActivo} checked={form.usarTiempoReglamentarioEmpate} onChange={(event) => setForm({ ...form, usarTiempoReglamentarioEmpate: event.target.checked })} className="w-4 h-4 accent-orange-500" /></label>
            </section>
          </>}

          {section === 'pesos' && <section className={cardClass}>
            <div className="flex items-center gap-3 mb-1"><Scale className="w-5 h-5 text-amber-500" /><h2 className="font-extrabold text-slate-900 dark:text-white">Peso y emparejamiento</h2></div><p className="text-xs text-slate-500 mb-4">Unidad visible y tolerancia del sorteo automático.</p>
            <div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, unidadPeso: 'libras_onzas' })} className={`rounded-xl border p-4 text-left ${form.unidadPeso === 'libras_onzas' ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}><div className="font-bold text-sm">Libras y onzas</div><div className="text-xs opacity-70 mt-1">3.11 equivale a 3 libras con 11 onzas</div></button><button type="button" onClick={() => setForm({ ...form, unidadPeso: 'onzas' })} className={`rounded-xl border p-4 text-left ${form.unidadPeso === 'onzas' ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}><div className="font-bold text-sm">Onzas totales</div><div className="text-xs opacity-70 mt-1">59 onzas equivale a 3 libras con 11 onzas</div></button></div>
            <label className="block mt-4 max-w-sm text-xs font-bold text-slate-600 dark:text-slate-300">Diferencia máxima del sorteo, en onzas<input type="number" min="0" step="0.5" value={form.diferenciaPesoMaximaOnzas} onChange={(event) => setForm({ ...form, diferenciaPesoMaximaOnzas: Number(event.target.value) })} className={inputClass} /></label>
          </section>}

          {section === 'ranking' && <>
            <section className={cardClass}><h2 className="font-extrabold text-slate-900 dark:text-white mb-4">Forma de clasificación</h2><div className="grid sm:grid-cols-2 gap-3">{(['puntos', 'tiempo'] as const).map((mode) => <button key={mode} type="button" onClick={() => setForm({ ...form, rankingModo: mode })} className={`rounded-xl border p-4 text-left flex items-center gap-3 ${form.rankingModo === mode ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{mode === 'puntos' ? <Trophy className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}<div><div className="font-bold text-sm">Ranking por {mode}</div><div className="text-xs opacity-70">{mode === 'puntos' ? 'Puntaje, victorias y tiempo' : 'Suma de las mejores victorias requeridas'}</div></div></button>)}</div></section>
            <section className={cardClass}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white">Filtro por mínimo de peleas</h2>
                  <p className="text-xs text-slate-500 mt-1">Solo aparecen en el ranking los galpones que hayan peleado al menos N veces. Sus tiempos se suman para el orden.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={form.rankingFiltrarPorPeleas ?? false}
                    onChange={(e) => setForm({ ...form, rankingFiltrarPorPeleas: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
              {(form.rankingFiltrarPorPeleas ?? false) && (
                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Mínimo de peleas requeridas
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={form.rankingMinimosPeleas ?? 2}
                      onChange={(e) => setForm({ ...form, rankingMinimosPeleas: Math.max(1, Number(e.target.value)) })}
                      className={inputClass}
                    />
                  </label>
                  <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/20 p-3 text-xs text-brand-700 dark:text-brand-300 flex items-start gap-2">
                    <span className="mt-0.5 text-brand-500 font-black">i</span>
                    <span>Galpones con menos de <strong>{form.rankingMinimosPeleas ?? 2}</strong> pela{(form.rankingMinimosPeleas ?? 2) === 1 ? 'a' : 'as'} no aparecerán en el ranking ni en el pódium.</span>
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-brand-200 dark:border-brand-900 bg-brand-50/40 dark:bg-brand-950/20 p-5 shadow-sm"><div className="flex items-center gap-3 mb-1"><ShieldCheck className="w-5 h-5 text-brand-500" /><h2 className="font-extrabold text-slate-900 dark:text-white">Reglamento por tiempo</h2></div><p className="text-xs text-slate-500 mb-4">La misma regla se usa para ranking, frentes y premios.</p><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Victorias mínimas<input type="number" min="1" max="2" value={form.victoriasRequeridasTiempo} onChange={(event) => setForm({ ...form, victoriasRequeridasTiempo: Number(event.target.value) })} className={inputClass} /></label><div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-200">Se suman las {form.victoriasRequeridasTiempo} victorias más rápidas.</div></div><div className="grid sm:grid-cols-2 gap-3 mt-4"><label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm font-bold"><span>Permitir tablas</span><input type="checkbox" checked={form.permitirEmpatesTiempo} onChange={(event) => setForm({ ...form, permitirEmpatesTiempo: event.target.checked })} /></label><label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm font-bold"><span>Permitir derrotas</span><input type="checkbox" checked={form.permitirDerrotasTiempo} onChange={(event) => setForm({ ...form, permitirDerrotasTiempo: event.target.checked })} /></label></div></section>
            <section className={cardClass}><h2 className="font-extrabold text-slate-900 dark:text-white mb-4">Puntuación</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{([['Pollón', 'puntosPollon'], ['Victoria', 'puntosVictoria'], ['Tablas', 'puntosEmpate'], ['Derrota', 'puntosDerrota']] as const).map(([label, key]) => <label key={key} className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}<input type="number" min="0" step="0.5" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} className={inputClass} /></label>)}</div></section>
          </>}

          {section === 'pollon' && <>
            <section className={cardClass}><h2 className="font-extrabold text-slate-900 dark:text-white mb-1">Criterio de pollón</h2><p className="text-xs text-slate-500 mb-4">Regla usada para clasificar los tiempos.</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{([{ value: '30', label: '30 segundos' }, { value: '60', label: '1 minuto' }, { value: '120', label: '2 minutos' }, { value: 'mejores', label: 'Mejores tiempos' }] as const).map((option) => <button key={option.value} type="button" onClick={() => setForm({ ...form, pollonCriterio: option.value, pollonMaximoSegundos: option.value === 'mejores' ? form.pollonMaximoSegundos : Number(option.value) })} className={`rounded-xl border p-3 text-sm font-bold ${form.pollonCriterio === option.value ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{option.label}</button>)}</div>{form.pollonCriterio === 'mejores' && <label className="block mt-4 max-w-xs text-xs font-bold text-slate-600 dark:text-slate-300">Cantidad de mejores tiempos<input type="number" min="1" value={form.pollonCantidadMejores} onChange={(event) => setForm({ ...form, pollonCantidadMejores: Number(event.target.value) })} className={inputClass} /></label>}<label className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm font-bold"><span>Habilitar pollones</span><input type="checkbox" checked={form.pollonesActivos} onChange={(event) => setForm({ ...form, pollonesActivos: event.target.checked })} /></label></section>
            <section className={cardClass}><div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-extrabold text-slate-900 dark:text-white">Premios por tiempo de pollón</h2><p className="text-xs text-slate-500 mt-1">Se aplica el primer rango de tiempo que corresponda.</p></div><button type="button" onClick={() => setForm({ ...form, pollonPremios: [...form.pollonPremios, { maximoSegundos: 120, premio: 0 }] })} className="icon-plus rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" />Agregar</button></div><div className="space-y-2">{form.pollonPremios.map((rule, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Hasta, segundos<input type="number" min="1" value={rule.maximoSegundos} onChange={(event) => { const values = [...form.pollonPremios]; values[index] = { ...rule, maximoSegundos: Number(event.target.value) }; setForm({ ...form, pollonPremios: values }); }} className={inputClass} /></label><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Premio<input type="number" min="0" step="10" value={rule.premio} onChange={(event) => { const values = [...form.pollonPremios]; values[index] = { ...rule, premio: Number(event.target.value) }; setForm({ ...form, pollonPremios: values }); }} className={inputClass} /></label><TrashButton onClick={() => setForm({ ...form, pollonPremios: form.pollonPremios.filter((_, valueIndex) => valueIndex !== index) })} className="mb-0.5 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10" size={28} /></div>)}</div></section>
            <section className={cardClass}><div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-extrabold text-slate-900 dark:text-white">Premios del ranking</h2><div className="flex items-center gap-2"><button type="button" onClick={() => setForm({ ...form, premiosCantidad: Math.max(1, form.premiosCantidad - 1) })} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">−</button><span className="text-xs font-bold text-slate-500">{form.premiosCantidad} puestos</span><button type="button" onClick={() => setForm({ ...form, premiosCantidad: Math.min(form.premiosMontos.length, form.premiosCantidad + 1) })} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">+</button></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{form.premiosMontos.slice(0, form.premiosCantidad).map((amount, index) => <label key={index} className="text-xs font-bold text-slate-600 dark:text-slate-300">Puesto {index + 1}<input type="number" min="0" step="50" value={amount} onChange={(event) => { const values = [...form.premiosMontos]; values[index] = Number(event.target.value); setForm({ ...form, premiosMontos: values }); }} className={inputClass} /></label>)}</div></section>
          </>}
        </div>

        <div className="flex-shrink-0 flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
          <button className="icon-edit rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 text-sm font-bold flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar configuración
          </button>
        </div>
      </form>
    </PageShell>
  );
}