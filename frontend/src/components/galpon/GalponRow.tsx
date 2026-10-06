import { useState } from 'react';
import { Building2, Check, ToggleLeft, ToggleRight, X } from '../../animated-icons';
import { sileo } from 'sileo';
import type { Establishment } from '../../types';
import { deleteEstablishment, updateEstablishment } from '../../services/api';
import { TrashButton } from '../ui/TrashButton';
import { EditButton } from '../ui/EditButton';

interface GalponRowProps {
  item: Establishment;
  gallosCount: number;
  onDataChange: () => void;
  onEdit: (item: Establishment) => void;
  onClick?: () => void;
}

export function GalponRow({ item, gallosCount, onDataChange, onEdit, onClick }: GalponRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEstablishment(item.id);
      onDataChange();
    } catch (err) {
      sileo.error({
        title: 'No se pudo eliminar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo.',
      });
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div onClick={onClick} className={`p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 grid place-items-center flex-shrink-0">
        <Building2 className="w-5 h-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.nombre}</div>
        <div className="text-xs text-slate-500 truncate">
          {item.propietario || 'Sin propietario'}{item.telefono ? ` · ${item.telefono}` : ''}
        </div>
      </div>

      <span className="text-xs font-bold rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 px-2 py-1 flex-shrink-0">
        {gallosCount} gallos
      </span>

      {confirming ? (
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">¿Eliminar?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> Sí
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> No
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateEstablishment(item.id, {
                nombre: item.nombre, propietario: item.propietario,
                telefono: item.telefono, estado: item.estado === 'activo' ? 'inactivo' : 'activo',
              }).then(onDataChange);
            }}
            className={`p-2 rounded-lg transition-colors ${item.estado === 'activo' ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-500/10'}`}
            title={item.estado === 'activo' ? 'Deshabilitar' : 'Habilitar'}
          >
            {item.estado === 'activo' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            <EditButton
              onClick={() => onEdit(item)}
              aria-label="Editar galpón"
              title="Editar galpón"
            />
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <TrashButton
              onClick={() => setConfirming(true)}
              aria-label="Eliminar galpón"
            />
          </div>
        </>
      )}
    </div>
  );
}