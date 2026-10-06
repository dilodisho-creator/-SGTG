import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bird, ArrowUpDown, Building2, Check, Hash, Phone, Plus, Scale, Search, Sparkles, User, X } from '../animated-icons';
import { PageShell } from '../components/layout/PageShell';
import { createEstablishment, createRooster, deleteEstablishment, deleteRooster, updateEstablishment, updateRooster } from '../services/api';
import { TournamentData } from '../types';
import { formatWeight, weightForInput, weightFromInput } from '../utils/weight';
import { Combobox } from '../components/ui/Combobox';
import { SuggestInput } from '../components/ui/SuggestInput';
import { Pagination } from '../components/ui/Pagination';
import { sileo } from 'sileo';
import { GalponRow } from '../components/galpon/GalponRow';
import { TrashButton } from '../components/ui/TrashButton';
import { EditButton } from '../components/ui/EditButton';
import { DetailDrawer, DrawerRow, DrawerStatGrid } from '../components/ui/DetailDrawer';
import { useConfirm } from '../components/ui/ConfirmDialog';

interface RegistrationPageProps {
  data: TournamentData | null;
  onDataChange: () => void;
}

type Section = 'galpones' | 'gallos';

const fieldClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function RegistrationPage({ data, onDataChange }: RegistrationPageProps) {
  const [section, setSection] = useState<Section>('galpones');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [establishmentForm, setEstablishmentForm] = useState({ nombre: '', propietario: '', telefono: '', estado: 'activo' as 'activo' | 'inactivo' });
  const [roosterForm, setRoosterForm] = useState({ galponId: '', ficha: '', color: '', peso: '', estado: 'disponible' as 'disponible' | 'asignado' | 'retirado' });
  const [editingEstablishment, setEditingEstablishment] = useState<string | null>(null);
  const [editingRooster, setEditingRooster] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(15);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);
  const [selectedRooster, setSelectedRooster] = useState<string | null>(null);
  const [roosterSortDir, setRoosterSortDir] = useState<'asc' | 'desc'>('asc');
  const { confirm, dialog: confirmDialog } = useConfirm();

  const recentListRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const container = recentListRef.current;
    if (!container) return;
    const ITEM_HEIGHT = 68;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const available = entry.contentRect.height;
        setVisibleCount(Math.max(1, Math.floor(available / ITEM_HEIGHT)));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const establishments = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLocaleLowerCase('es-PE');
    return data.galpones
      .filter((item) => !query || item.nombre.toLocaleLowerCase('es-PE').includes(query) || item.propietario.toLocaleLowerCase('es-PE').includes(query))
      .slice()
      .reverse();
  }, [data, search]);

  const roosters = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLocaleLowerCase('es-PE');
    return data.gallos
      .filter((item) => {
        const establishment = data.galpones.find((value) => value.id === item.galponId);
        return !query || item.ficha.toLocaleLowerCase('es-PE').includes(query) || item.color.toLocaleLowerCase('es-PE').includes(query) || establishment?.nombre.toLocaleLowerCase('es-PE').includes(query);
      })
      .slice()
      .reverse();
  }, [data, search]);

  const recentEstablishments = useMemo(() => {
    if (!data) return [];
    return data.galpones.slice(-20).reverse();
  }, [data]);

  const recentRoosters = useMemo(() => {
    if (!data) return [];
    return data.gallos.slice(-20).reverse();
  }, [data]);

  const paginatedEstablishments = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return establishments.slice(start, start + listPageSize);
  }, [establishments, listPage, listPageSize]);

  const paginatedRoosters = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return roosters.slice(start, start + listPageSize);
  }, [roosters, listPage, listPageSize]);

  const colorStats = useMemo(() => {
    if (!data) return { suggestions: [], quickChips: [] };
    const counts: Record<string, number> = {};

    data.gallos.forEach((g) => {
      const c = g.color?.trim().toUpperCase();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });

    Object.values(data.hojas).forEach((fights) => {
      fights.forEach((f) => {
        const c1 = f.gallo1?.color?.trim().toUpperCase();
        const c2 = f.gallo2?.color?.trim().toUpperCase();
        if (c1) counts[c1] = (counts[c1] || 0) + 1;
        if (c2) counts[c2] = (counts[c2] || 0) + 1;
      });
    });

    const standardColors = [
      'AJI', 'CENIZO', 'GIRO', 'COLORADO', 'CARMELO',
      'NEGRO', 'BLANCO', 'MORO', 'JABAO', 'CANAGUAY',
      'PINTADO', 'ZAMBO', 'MALATO', 'TALISAYO'
    ];
    standardColors.forEach((c) => {
      if (!(c in counts)) counts[c] = 0;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const suggestions = sorted.map(([color, count]) => ({
      value: color,
      label: color,
      badge: count > 0 ? `${count} ${count === 1 ? 'gallo' : 'gallos'}` : undefined,
    }));

    const quickChips = sorted.slice(0, 5).map(([c]) => c);

    return { suggestions, quickChips };
  }, [data]);

  const duplicateFichaRooster = useMemo(() => {
    if (!data || !roosterForm.ficha.trim()) return null;
    const clean = roosterForm.ficha.trim().toUpperCase();
    return data.gallos.find((g) => g.id !== editingRooster && g.ficha.trim().toUpperCase() === clean);
  }, [data, roosterForm.ficha, editingRooster]);

  const duplicateFichaWarning = duplicateFichaRooster
    ? `⚠️ Ficha "${roosterForm.ficha}" ya existe en el galpón "${data?.galpones.find((gp) => gp.id === duplicateFichaRooster.galponId)?.nombre || 'desconocido'}"`
    : undefined;

  const nextNumericFicha = useMemo(() => {
    if (!data || data.gallos.length === 0) return null;
    const nums = data.gallos
      .map((g) => parseInt(g.ficha.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return null;
    return Math.max(...nums) + 1;
  }, [data]);

  const weightPreview = useMemo(() => {
    if (!roosterForm.peso || !data) return null;
    const unit = data.configuracion.unidadPeso;
    if (unit === 'onzas') {
      const oz = Number(roosterForm.peso);
      if (isNaN(oz) || oz <= 0) return { error: 'Peso inválido' };
      const lb = Math.floor(oz / 16);
      const rem = oz % 16;
      return { text: `${oz} oz = ${lb} lb ${rem} oz`, error: null };
    } else {
      const val = String(roosterForm.peso).trim().replace(',', '.');
      const parts = val.split('.');
      const lbs = parseInt(parts[0] || '0', 10);
      const ozStr = parts[1] || '0';
      const oz = parseInt(ozStr.padEnd(2, '0').slice(0, 2), 10);
      if (oz >= 16) {
        return { text: null, error: 'Las onzas van de 00 a 15 (ej: 3.08 = 3 lb 8 oz)' };
      }
      const totalOz = lbs * 16 + oz;
      return { text: `${lbs} lb ${oz} oz (${totalOz} oz totales)`, error: null };
    }
  }, [roosterForm.peso, data]);

  const duplicateGalponWarning = useMemo(() => {
    if (!data || !establishmentForm.nombre.trim()) return undefined;
    const clean = establishmentForm.nombre.trim().toUpperCase();
    const found = data.galpones.find((g) => g.id !== editingEstablishment && g.nombre.trim().toUpperCase() === clean);
    if (found) return `⚠️ Ya existe un galpón registrado con el nombre "${found.nombre}"`;
    return undefined;
  }, [data, establishmentForm.nombre, editingEstablishment]);

  async function execute(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    try {
      await action();
      await onDataChange();
      sileo.success({
        title: 'Registro exitoso',
        description: success
      });
    } catch (error) {
      sileo.error({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo completar la operación.' });
    } finally {
      setSaving(false);
    }
  }

  async function submitEstablishment(event: FormEvent) {
    event.preventDefault();
    await execute(() => editingEstablishment ? updateEstablishment(editingEstablishment, establishmentForm) : createEstablishment(establishmentForm), editingEstablishment ? 'Galpón actualizado correctamente.' : 'Galpón registrado correctamente.');
    setEditingEstablishment(null);
    setEstablishmentForm({ nombre: '', propietario: '', telefono: '', estado: 'activo' });
  }

  async function submitRooster(event: FormEvent) {
    event.preventDefault();
    const convertedWeight = weightFromInput(roosterForm.peso, data?.configuracion.unidadPeso ?? 'libras_onzas');
    if (convertedWeight === null) {
      sileo.error({ title: 'Peso inválido', description: 'Ingrese un peso válido.' });
      return;
    }
    const payload = { ...roosterForm, peso: convertedWeight };
    await execute(() => editingRooster ? updateRooster(editingRooster, payload) : createRooster(payload), editingRooster ? 'Gallo actualizado correctamente.' : 'Gallo registrado correctamente.');
    setEditingRooster(null);
    setRoosterForm((current) => ({ galponId: current.galponId, ficha: '', color: '', peso: '', estado: 'disponible' }));
  }

  if (!data) return null;

  const sections = [
    { id: 'galpones' as const, label: 'Galpones', count: data.galpones.length, icon: Building2 },
    { id: 'gallos' as const, label: 'Gallos', count: data.gallos.length, icon: Bird },
  ];

  return (
    <>
      <PageShell>
        <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(320px,430px)_1fr] gap-5 items-stretch">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800">
              {sections.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => { setSection(item.id); setListPage(1); }} className={`p-3 flex flex-col items-center gap-1 text-xs font-bold transition ${section === item.id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5 flex-1 flex flex-col min-h-0">
              {section === 'galpones' && (
                <form onSubmit={submitEstablishment} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 grid place-items-center"><Building2 className="w-5 h-5" /></div>
                    <div className="flex-1"><h2 className="font-extrabold text-slate-900 dark:text-white">{editingEstablishment ? 'Editar galpón' : 'Nuevo galpón'}</h2><p className="text-xs text-slate-500">Datos básicos del participante</p></div>{editingEstablishment && <button type="button" onClick={() => { setEditingEstablishment(null); setEstablishmentForm({ nombre: '', propietario: '', telefono: '', estado: 'activo' }); }} className="icon-close p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar edición"><X className="w-4 h-4" /></button>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                      Nombre del galpón <span className="text-red-400">*</span>
                      <input required maxLength={20} value={establishmentForm.nombre} onChange={(event) => setEstablishmentForm({ ...establishmentForm, nombre: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="Nombre del galpón" />
                    </label>
                    {establishmentForm.nombre.length >= 15 && (
                      <span className={`block text-[11px] font-semibold mt-0.5 ${establishmentForm.nombre.length >= 20 ? 'text-red-500' : 'text-amber-500'}`}>
                        {establishmentForm.nombre.length}/20 caracteres
                      </span>
                    )}
                    {duplicateGalponWarning && (
                      <span className="block text-[11px] text-amber-500 font-semibold mt-1">{duplicateGalponWarning}</span>
                    )}
                  </div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Propietario<div className="relative mt-1.5"><User className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input value={establishmentForm.propietario} onChange={(event) => setEstablishmentForm({ ...establishmentForm, propietario: event.target.value })} className={`${fieldClass} pl-9`} placeholder="Nombre del propietario" /></div></label>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Teléfono<div className="relative mt-1.5"><Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input value={establishmentForm.telefono} onChange={(event) => setEstablishmentForm({ ...establishmentForm, telefono: event.target.value })} className={`${fieldClass} pl-9`} placeholder="Número de contacto" /></div></label>
                  {editingEstablishment && <Combobox
                    label="Estado"
                    value={establishmentForm.estado}
                    onChange={(val) => setEstablishmentForm({ ...establishmentForm, estado: val as 'activo' | 'inactivo' })}
                    options={[
                      { value: 'activo', label: 'Activo', badge: '●' },
                      { value: 'inactivo', label: 'Inactivo' },
                    ]}
                  />}
                  <button disabled={saving} className={`${editingEstablishment ? 'icon-edit' : 'icon-plus'} w-full rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2`}>{editingEstablishment ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editingEstablishment ? 'Guardar cambios' : 'Registrar galpón'}</button>
                </form>
              )}

              {section === 'gallos' && (
                <form onSubmit={submitRooster} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 grid place-items-center"><Bird className="w-5 h-5" /></div>
                    <div className="flex-1"><h2 className="font-extrabold text-slate-900 dark:text-white">{editingRooster ? 'Editar gallo' : 'Nuevo gallo'}</h2><p className="text-xs text-slate-500">Identificación y peso</p></div>{editingRooster && <button type="button" onClick={() => { setEditingRooster(null); setRoosterForm({ galponId: '', ficha: '', color: '', peso: '', estado: 'disponible' }); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar edición"><X className="w-4 h-4" /></button>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Galpón <span className="text-red-400">*</span></label>
                      <button
                        type="button"
                        onClick={() => setRoosterSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        title={roosterSortDir === 'asc' ? 'Mostrando primeros primero' : 'Mostrando últimos primero'}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-brand-500 transition-colors"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {roosterSortDir === 'asc' ? 'Primeros' : 'Últimos'}
                      </button>
                    </div>
                    <Combobox
                      required
                      searchable
                      placeholder="Seleccione un galpón"
                      emptyText="No hay galpones activos"
                      value={roosterForm.galponId}
                      onChange={(val) => setRoosterForm({ ...roosterForm, galponId: val })}
                      options={data.galpones.filter((item) => item.estado === 'activo').sort((a, b) => roosterSortDir === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)).map((item) => {
                        const roostersCount = data.gallos.filter((r) => r.galponId === item.id).length;
                        return {
                          value: item.id,
                          label: item.nombre,
                          sub: `${item.propietario || 'Sin propietario'} · ${roostersCount} gallo(s)`,
                          badge: roostersCount > 0 ? `${roostersCount} gallos` : undefined,
                        };
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Ficha / Anillo <span className="text-red-400">*</span>
                        </label>
                        {nextNumericFicha !== null && !roosterForm.ficha && (
                          <button
                            type="button"
                            onClick={() => setRoosterForm({ ...roosterForm, ficha: String(nextNumericFicha) })}
                            className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
                          >
                            <Hash className="w-3 h-3" />
                            Sugerir: {nextNumericFicha}
                          </button>
                        )}
                      </div>
                      <input
                        required
                        maxLength={30}
                        value={roosterForm.ficha}
                        onChange={(event) => setRoosterForm({ ...roosterForm, ficha: event.target.value })}
                        className={fieldClass}
                        placeholder="Ej: 101, A-12"
                      />
                      {duplicateFichaWarning && (
                        <p className="text-[11px] text-amber-500 font-semibold mt-1">{duplicateFichaWarning}</p>
                      )}
                    </div>

                    <SuggestInput
                      label="Color"
                      required
                      uppercase
                      maxLength={50}
                      value={roosterForm.color}
                      onChange={(val) => setRoosterForm({ ...roosterForm, color: val })}
                      suggestions={colorStats.suggestions}
                      placeholder="Ej: AJI, CENIZO, GIRO"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>
                        Peso ({data.configuracion.unidadPeso === 'onzas' ? 'onzas totales' : 'libras.onzas'}) <span className="text-red-400">*</span>
                      </span>
                      {weightPreview?.text && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {weightPreview.text}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Scale className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="number"
                        step={data.configuracion.unidadPeso === 'onzas' ? '1' : '0.01'}
                        min="0.01"
                        value={roosterForm.peso}
                        onChange={(event) => setRoosterForm({ ...roosterForm, peso: event.target.value })}
                        className={`${fieldClass} pl-9`}
                        placeholder={data.configuracion.unidadPeso === 'onzas' ? '59' : '3.11'}
                      />
                    </div>
                    {weightPreview?.error ? (
                      <span className="mt-1 block text-[11px] font-bold text-red-500">{weightPreview.error}</span>
                    ) : (
                      <span className="mt-1 block text-[11px] font-normal text-slate-400">
                        {data.configuracion.unidadPeso === 'onzas' ? 'Ingrese el total de onzas.' : 'Los dígitos después del punto son onzas, de 00 a 15 (ej: 3.11 = 3 lb 11 oz).'}
                      </span>
                    )}
                  </div>

                  {editingRooster && <Combobox
                    label="Estado"
                    value={roosterForm.estado}
                    onChange={(val) => setRoosterForm({ ...roosterForm, estado: val as 'disponible' | 'asignado' | 'retirado' })}
                    options={[
                      { value: 'disponible', label: 'Disponible', badge: '✓' },
                      { value: 'asignado', label: 'Asignado' },
                      { value: 'retirado', label: 'Retirado' },
                    ]}
                  />}
                  <button disabled={saving || data.galpones.length === 0} className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2">{editingRooster ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editingRooster ? 'Guardar cambios' : 'Registrar gallo'}</button>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Últimos {section === 'galpones' ? 'galpones' : 'gallos'} registrados
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {section === 'galpones' ? data.galpones.length : data.gallos.length} en total
                  </span>
                </div>

                <div ref={recentListRef} className="flex-1 min-h-0">

                  <div className="space-y-1.5">
                    {section === 'galpones' && recentEstablishments.slice(0, visibleCount).map((item) => {
                      const gallosCount = data.gallos.filter((g) => g.galponId === item.id).length;
                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.nombre}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.propietario || 'Sin propietario'} {item.telefono ? `· ${item.telefono}` : ''}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex-shrink-0">{gallosCount} gallos</span>
                        </div>
                      );
                    })}
                    {section === 'gallos' && recentRoosters.slice(0, visibleCount).map((item) => {
                      const galpon = data.galpones.find((g) => g.id === item.galponId);
                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">Ficha {item.ficha} · {item.color}</p>
                            <p className="text-[11px] text-slate-400 truncate">{galpon?.nombre || 'Sin galpón'} · {formatWeight(item.peso, data.configuracion.unidadPeso)}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.estado === 'disponible' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{item.estado}</span>
                        </div>
                      );
                    })}
                    {section === 'galpones' && recentEstablishments.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-2">No hay galpones registrados aún.</p>
                    )}
                    {section === 'gallos' && recentRoosters.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-2">No hay gallos registrados aún.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><h2 className="font-extrabold text-slate-900 dark:text-white">{section === 'galpones' ? 'Galpones registrados' : 'Gallos registrados'}</h2><p className="text-xs text-slate-500 mt-0.5">Información disponible para el torneo</p></div>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setListPage(1); }} className={`${fieldClass} pl-9 sm:w-64`} placeholder="Buscar..." /></div>
            </div>


            <div className="flex-1 min-h-0 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
              {section === 'galpones' && paginatedEstablishments.map((item) => (
                <GalponRow
                  key={item.id}
                  item={item}
                  gallosCount={data.gallos.filter((r) => r.galponId === item.id).length}
                  onDataChange={onDataChange}
                  onEdit={(est) => {
                    setSection('galpones');
                    setEditingEstablishment(est.id);
                    setEstablishmentForm({ nombre: est.nombre, propietario: est.propietario, telefono: est.telefono, estado: est.estado });
                  }}
                  onClick={() => setSelectedEstablishment(item.id)}
                />
              ))}

              {section === 'gallos' && paginatedRoosters.map((item) => {
                const establishment = data.galpones.find((value) => value.id === item.galponId);
                return (
                  <div key={item.id} onClick={() => setSelectedRooster(item.id)} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 grid place-items-center flex-shrink-0"><Bird className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1"><div className="font-bold text-sm text-slate-900 dark:text-white truncate">Ficha {item.ficha} · {item.color}</div><div className="text-xs text-slate-500 truncate">{establishment?.nombre || 'Sin galpón'} · {formatWeight(item.peso, data.configuracion.unidadPeso)}</div></div>
                    <span className={`text-[11px] font-bold rounded-full px-2 py-1 ${item.estado === 'disponible' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{item.estado}</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <EditButton onClick={() => { setSection('gallos'); setEditingRooster(item.id); setRoosterForm({ galponId: item.galponId, ficha: item.ficha, color: item.color, peso: weightForInput(item.peso, data.configuracion.unidadPeso), estado: item.estado }); }} aria-label="Editar gallo" title="Editar gallo" />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrashButton onClick={async () => {
                        const ok = await confirm({ title: `Eliminar gallo ${item.ficha}`, description: `Se eliminará permanentemente del registro.`, confirmLabel: 'Eliminar', variant: 'danger' });
                        if (ok) execute(() => deleteRooster(item.id), 'Gallo eliminado.');
                      }} aria-label="Eliminar gallo" />
                    </div>
                  </div>
                );
              })}

              {((section === 'galpones' && establishments.length === 0) || (section === 'gallos' && roosters.length === 0)) && (
                <div className="p-12 text-center text-sm text-slate-400">
                  {search ? 'No se encontraron resultados con la búsqueda.' : `No hay ${section === 'galpones' ? 'galpones' : 'gallos'} registrados.`}
                </div>
              )}
            </div>

            <Pagination
              page={listPage}
              pageSize={listPageSize}
              totalItems={section === 'galpones' ? establishments.length : roosters.length}
              onPageChange={setListPage}
              onPageSizeChange={(newSize) => {
                setListPageSize(newSize);
                setListPage(1);
              }}
              pageSizeOptions={[10, 15, 25, 50]}
              itemLabel={section === 'galpones' ? 'galpones' : 'gallos'}
            />
          </section>
        </div>
      </PageShell>

      {(() => {
        const est = data.galpones.find((g) => g.id === selectedEstablishment);
        if (!est) return null;
        const roostersOfEst = data.gallos.filter((r) => r.galponId === est.id);
        const disponibles = roostersOfEst.filter((r) => r.estado === 'disponible').length;
        const asignados = roostersOfEst.filter((r) => r.estado === 'asignado').length;
        const retirados = roostersOfEst.filter((r) => r.estado === 'retirado').length;
        const peleasCount = Object.values(data.hojas).flat().filter((f) => f.gallo1.galpon === est.nombre || f.gallo2.galpon === est.nombre).length;
        const ranking = data.frentes.find((fr) => fr.galpon === est.nombre);
        const premio = data.premios.find((pr) => pr.galpon === est.nombre);
        return (
          <DetailDrawer
            open={!!selectedEstablishment}
            onClose={() => setSelectedEstablishment(null)}
            title={est.nombre}
            subtitle="Detalle del galpón"
            icon={<Building2 className="w-5 h-5" />}
            iconBg="bg-brand-500/10 text-brand-600 dark:text-brand-400"
            footer={
              <div className="flex gap-2">
                <button onClick={() => { setSection('galpones'); setEditingEstablishment(est.id); setEstablishmentForm({ nombre: est.nombre, propietario: est.propietario, telefono: est.telefono, estado: est.estado }); setSelectedEstablishment(null); }} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold py-2.5 text-slate-600 dark:text-slate-300 transition">Editar</button>
                <button onClick={async () => {
                  const ok = await confirm({ title: `Eliminar galpón ${est.nombre}`, description: 'Se eliminará el galpón y todos sus gallos del registro.', confirmLabel: 'Eliminar', variant: 'danger' });
                  if (ok) { execute(() => deleteEstablishment(est.id), 'Galpón eliminado.'); setSelectedEstablishment(null); }
                }} className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold py-2.5 text-red-600 dark:text-red-400 transition">Eliminar</button>
              </div>
            }
          >
            <div className="border-b border-slate-100 dark:border-slate-800">
              {est.propietario && <DrawerRow label="Propietario" value={est.propietario} />}
              {est.telefono && <DrawerRow label="Teléfono" value={est.telefono} />}
              <DrawerRow
                label="Estado"
                value={<span className={`text-xs font-bold px-2.5 py-1 rounded-full ${est.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{est.estado}</span>}
              />
              <DrawerRow label="Registrado" value={new Date(est.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} />
            </div>

            <div className="px-5 pt-4 pb-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Gallos registrados</p>
            </div>
            <DrawerStatGrid stats={[
              { label: 'Disponibles', value: disponibles, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: 'Asignados', value: asignados, color: 'text-amber-600 bg-amber-500/10' },
              { label: 'Retirados', value: retirados, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
            ]} />

            {peleasCount > 0 && (
              <div className="mx-5 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Peleas disputadas</span>
                <span className="text-base font-black text-brand-600 dark:text-brand-400">{peleasCount}</span>
              </div>
            )}

            {ranking && (
              <div className="px-5 mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Frente en torneo</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  <DrawerRow label="Peleas" value={ranking.peleas} />
                  <DrawerRow label="Resultado" value={ranking.resultado} />
                </div>
              </div>
            )}

            {premio && (
              <div className="mx-5 mb-3 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Premio obtenido</span>
                <span className="text-base font-black text-amber-700 dark:text-amber-300">S/. {premio.premio.toLocaleString('es-PE')}</span>
              </div>
            )}

            {roostersOfEst.length > 0 && (
              <div className="px-5 pb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lista de gallos ({roostersOfEst.length})</p>
                <div className="space-y-1.5">
                  {roostersOfEst.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center flex-shrink-0"><Bird className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Ficha {r.ficha} · {r.color}</p>
                        <p className="text-[11px] text-slate-400">{formatWeight(r.peso, data.configuracion.unidadPeso)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${r.estado === 'disponible' ? 'bg-emerald-500/10 text-emerald-600' : r.estado === 'asignado' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{r.estado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DetailDrawer>
        );
      })()}

      {(() => {
        const rooster = data.gallos.find((r) => r.id === selectedRooster);
        if (!rooster) return null;
        const galpon = data.galpones.find((g) => g.id === rooster.galponId);
        const fightsFlatten = Object.values(data.hojas).flat();
        const roosterFights = fightsFlatten.filter((f) => f.gallo1.ficha === rooster.ficha || f.gallo2.ficha === rooster.ficha);
        const wins = roosterFights.filter((f) => (f.gallo1.ficha === rooster.ficha && f.gallo1.resultado === 'GANÓ') || (f.gallo2.ficha === rooster.ficha && f.gallo2.resultado === 'GANÓ')).length;
        const losses = roosterFights.filter((f) => (f.gallo1.ficha === rooster.ficha && f.gallo1.resultado === 'PERDIÓ') || (f.gallo2.ficha === rooster.ficha && f.gallo2.resultado === 'PERDIÓ')).length;
        const draws = roosterFights.filter((f) => (f.gallo1.ficha === rooster.ficha && f.gallo1.resultado === 'TABLAS') || (f.gallo2.ficha === rooster.ficha && f.gallo2.resultado === 'TABLAS')).length;
        return (
          <DetailDrawer
            open={!!selectedRooster}
            onClose={() => setSelectedRooster(null)}
            title={`Ficha ${rooster.ficha}`}
            subtitle={galpon?.nombre || 'Sin galpón'}
            icon={<Bird className="w-5 h-5" />}
            iconBg="bg-amber-500/10 text-amber-600"
            footer={
              <div className="flex gap-2">
                <button onClick={() => { setSection('gallos'); setEditingRooster(rooster.id); setRoosterForm({ galponId: rooster.galponId, ficha: rooster.ficha, color: rooster.color, peso: weightForInput(rooster.peso, data.configuracion.unidadPeso), estado: rooster.estado }); setSelectedRooster(null); }} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold py-2.5 text-slate-600 dark:text-slate-300 transition">Editar</button>
                <button onClick={async () => {
                  const ok = await confirm({ title: `Eliminar gallo ${rooster.ficha}`, description: 'Se eliminará permanentemente del registro.', confirmLabel: 'Eliminar', variant: 'danger' });
                  if (ok) { execute(() => deleteRooster(rooster.id), 'Gallo eliminado.'); setSelectedRooster(null); }
                }} className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold py-2.5 text-red-600 dark:text-red-400 transition">Eliminar</button>
              </div>
            }
          >
            <div className="border-b border-slate-100 dark:border-slate-800">
              <DrawerRow label="Color" value={rooster.color} />
              <DrawerRow label="Peso" value={formatWeight(rooster.peso, data.configuracion.unidadPeso)} />
              {galpon && <DrawerRow label="Galpón" value={galpon.nombre} />}
              <DrawerRow
                label="Estado"
                value={<span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rooster.estado === 'disponible' ? 'bg-emerald-500/10 text-emerald-600' : rooster.estado === 'asignado' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{rooster.estado}</span>}
              />
              <DrawerRow label="Registrado" value={new Date(rooster.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} />
            </div>

            {roosterFights.length > 0 ? (
              <div>
                <div className="px-5 pt-4 pb-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Historial de peleas</p>
                </div>
                <DrawerStatGrid stats={[
                  { label: 'Ganó', value: wins, color: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'Perdió', value: losses, color: 'text-red-500 bg-red-500/10' },
                  { label: 'Tablas', value: draws, color: 'text-amber-600 bg-amber-500/10' },
                ]} />
                <div className="px-5 pb-5 space-y-1.5">
                  {roosterFights.slice(0, 15).map((f, i) => {
                    const isGallo1 = f.gallo1.ficha === rooster.ficha;
                    const myResult = isGallo1 ? f.gallo1.resultado : f.gallo2.resultado;
                    const rival = isGallo1 ? f.gallo2 : f.gallo1;
                    const resultColor = myResult === 'GANÓ' ? 'bg-emerald-500/10 text-emerald-600' : myResult === 'PERDIÓ' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-600';
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400 w-14 flex-shrink-0">Pelea {f.numero}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">vs {rival.color} · {rival.galpon}</p>
                          {f.tiempo && <p className="text-[10px] text-slate-400">{f.tiempo}</p>}
                        </div>
                        {myResult && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${resultColor}`}>{myResult}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-400">Este gallo aún no ha participado en peleas.</p>
              </div>
            )}
          </DetailDrawer>
        );
      })()}
      {confirmDialog}
    </>
  );
}