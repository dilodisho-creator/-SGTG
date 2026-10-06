import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Shuffle, X } from '../animated-icons';
import { assignFight, drawFights } from '../services/api';
import { TournamentData } from '../types';
import { formatWeight } from '../utils/weight';
import { Combobox } from './ui/Combobox';
import { useConfirm } from './ui/ConfirmDialog';
import { sileo } from 'sileo';

const fieldClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function FightPlanner({ data, onDataChange }: { data: TournamentData; onDataChange: () => void }) {
  const fights = Object.values(data.hojas).flat();
  const availableFights = fights.filter((f) => !f.gallo1.galpon && !f.gallo2.galpon);
  const nextNumber = availableFights.length > 0 ? availableFights[0].numero : '';

  const [numero, setNumero] = useState<string>(String(nextNumber));
  const [gallo1Id, setGallo1Id] = useState('');
  const [gallo2Id, setGallo2Id] = useState('');
  const [caja, setCaja] = useState('');
  const [drawAmount, setDrawAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const availableRoosters = useMemo(
    () => data.gallos.filter((g) => g.estado === 'disponible' && data.galpones.some((e) => e.id === g.galponId && e.estado === 'activo')),
    [data],
  );

  const gallo1 = availableRoosters.find((r) => r.id === gallo1Id);
  const gallo2 = availableRoosters.find((r) => r.id === gallo2Id);
  const galpon1Name = gallo1 ? data.galpones.find((g) => g.id === gallo1.galponId)?.nombre : null;
  const galpon2Name = gallo2 ? data.galpones.find((g) => g.id === gallo2.galponId)?.nombre : null;
  const weightDiff = gallo1 && gallo2 ? Math.abs((gallo1.peso ?? 0) - (gallo2.peso ?? 0)) : null;
  const maxDiff = data.configuracion.diferenciaPesoMaximaOnzas ?? 4;
  const weightOk = weightDiff !== null && weightDiff <= maxDiff;

  function resetForm() {
    const remaining = availableFights.filter((f) => f.numero !== Number(numero));
    setNumero(remaining.length > 0 ? String(remaining[0].numero) : '');
    setGallo1Id('');
    setGallo2Id('');
    setCaja('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!numero || !gallo1Id || !gallo2Id) return;
    setSaving(true);
    try {
      await assignFight({ numero: Number(numero), gallo1Id, gallo2Id, caja: caja ? Number(caja) : null });
      await onDataChange();
      sileo.success({ title: 'Pelea programada', description: `Pelea #${numero} programada correctamente.` });
      resetForm();
    } catch (error) {
      sileo.error({ title: 'Error al programar', description: error instanceof Error ? error.message : 'No se pudo programar la pelea.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDraw() {
    setSaving(true);
    try {
      const amount = drawAmount ? Number(drawAmount) : undefined;
      const preview = await drawFights(amount, false);
      if (!preview.creadas) {
        sileo.warning({ title: 'Sin parejas compatibles', description: 'No se encontraron parejas compatibles con la diferencia de peso configurada.' });
        return;
      }
      const previewLines = preview.propuestas
        .slice(0, 8)
        .map((item: { numero: number; gallo1: string; gallo2: string; diferenciaOnzas: number }) => `Pelea ${item.numero}: ${item.gallo1} vs ${item.gallo2} (${item.diferenciaOnzas} oz)`)
        .join(' · ');
      const extra = preview.propuestas.length > 8 ? ` y ${preview.propuestas.length - 8} más.` : '';
      const ok = await confirm({
        title: `Confirmar sorteo — ${preview.creadas} pelea${preview.creadas !== 1 ? 's' : ''}`,
        description: previewLines + extra,
        confirmLabel: 'Confirmar sorteo',
        cancelLabel: 'Cancelar',
        variant: 'info',
      });
      if (!ok) return;
      const result = await drawFights(amount, true);
      await onDataChange();
      sileo.success({ title: 'Sorteo completado', description: `${result.creadas} peleas creadas. ${result.sinPareja} gallos quedaron sin pareja.` });
    } catch (error) {
      sileo.error({ title: 'Error en sorteo', description: error instanceof Error ? error.message : 'No se pudo realizar el sorteo.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 grid place-items-center flex-shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-sm">Programar pelea</h2>
              <p className="text-xs text-slate-500">Asignación manual o sorteo automático</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <form onSubmit={submit} className="space-y-4">

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Número de pelea
              </label>
              <input
                type="number"
                min="1"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej. 1"
                className={fieldClass}
              />
            </div>

            <Combobox
              label="Primer gallo"
              searchable
              clearable
              required
              placeholder="— Busca por ficha, color o galpón —"
              emptyText="No hay gallos disponibles"
              value={gallo1Id}
              onChange={(val) => { setGallo1Id(val); setGallo2Id(''); }}
              options={availableRoosters.map((item) => {
                const galpon = data.galpones.find((g) => g.id === item.galponId);
                return {
                  value: item.id,
                  label: `Ficha ${item.ficha} · ${item.color}`,
                  sub: `${galpon?.nombre ?? '—'} · ${formatWeight(item.peso, data.configuracion.unidadPeso)}`,
                  badge: galpon?.nombre?.split(' ')[0],
                };
              })}
            />

            <Combobox
              label="Segundo gallo"
              searchable
              clearable
              required
              placeholder="— Busca por ficha, color o galpón —"
              emptyText={gallo1Id ? 'No hay gallos de otro galpón disponibles' : 'Selecciona el primer gallo antes'}
              value={gallo2Id}
              onChange={setGallo2Id}
              options={availableRoosters
                .filter((item) => item.id !== gallo1Id && item.galponId !== gallo1?.galponId)
                .map((item) => {
                  const galpon = data.galpones.find((g) => g.id === item.galponId);
                  return {
                    value: item.id,
                    label: `Ficha ${item.ficha} · ${item.color}`,
                    sub: `${galpon?.nombre ?? '—'} · ${formatWeight(item.peso, data.configuracion.unidadPeso)}`,
                    badge: galpon?.nombre?.split(' ')[0],
                  };
                })}
            />

            {weightDiff !== null && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border ${weightOk
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                }`}>
                {weightOk ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                Diferencia: {weightDiff} oz — {weightOk ? `Compatible (máx. ${maxDiff} oz)` : `Excede el límite de ${maxDiff} oz`}
              </div>
            )}

            {gallo1 && gallo2 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-600 dark:text-orange-400">{galpon1Name}</span>
                  <span className="font-mono text-slate-400 text-[10px]">VS</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">{galpon2Name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{gallo1.color} · {formatWeight(gallo1.peso, data.configuracion.unidadPeso)}</span>
                  <span>{gallo2.color} · {formatWeight(gallo2.peso, data.configuracion.unidadPeso)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Caja (S/.) — opcional
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={caja}
                onChange={(e) => setCaja(e.target.value)}
                placeholder="Importe de apuesta"
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !numero || !gallo1Id || !gallo2Id}
              className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Guardar pelea
            </button>
          </form>
        </div>
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 py-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Sorteo automático por peso</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={Math.floor(availableRoosters.length / 2)}
              value={drawAmount}
              onChange={(e) => setDrawAmount(e.target.value)}
              className={fieldClass}
              placeholder={`Máx. ${Math.floor(availableRoosters.length / 2)} peleas`}
            />
            <button
              type="button"
              disabled={saving || availableRoosters.length < 2}
              onClick={() => void handleDraw()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Sortear
            </button>
          </div>
        </div>

      </section>
      {confirmDialog}
    </>
  );
}