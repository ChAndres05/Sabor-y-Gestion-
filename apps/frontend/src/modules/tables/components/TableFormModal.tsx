import { useState } from 'react';
import type {
  RestaurantTable,
  TableFormValues,
  Zone,
} from '../types/table.types';

interface TableFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  zones: Zone[];
  initialTable?: RestaurantTable | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: TableFormValues) => Promise<void>;
}

function getInitialValues(
  zones: Zone[],
  initialTable?: RestaurantTable | null
): TableFormValues {
  if (initialTable) {
    return {
      numero: initialTable.numero,
      capacidad: initialTable.capacidad,
      zoneId: initialTable.zoneId,
      activo: initialTable.activo,
    };
  }

  return {
    numero: 0,
    capacidad: 0,
    zoneId: zones[0]?.id ?? 0,
    activo: true,
  };
}

export function TableFormModal({
  open,
  mode,
  zones,
  initialTable,
  isSubmitting,
  onClose,
  onSubmit,
}: TableFormModalProps) {
  const initialValues = getInitialValues(zones, initialTable);

  const [numero, setNumero] = useState(
    initialValues.numero ? String(initialValues.numero) : ''
  );
  const [capacidad, setCapacidad] = useState(
    initialValues.capacidad ? String(initialValues.capacidad) : ''
  );
  const [zoneId, setZoneId] = useState<number>(initialValues.zoneId);
  const [activo, setActivo] = useState(initialValues.activo);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!numero || Number(numero) <= 0) {
      setError('El número de mesa debe ser mayor a 0');
      return;
    }

    if (!capacidad || Number(capacidad) <= 0) {
      setError('La capacidad debe ser mayor a 0');
      return;
    }

    if (!zoneId) {
      setError('Debes seleccionar una zona');
      return;
    }

    setError('');

    await onSubmit({
      numero: Number(numero),
      capacidad: Number(capacidad),
      zoneId,
      activo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[400px] rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-text">
              {mode === 'create' ? 'Nueva mesa' : 'Editar mesa'}
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-gray-500">
              {mode === 'create'
                ? 'Registra una nueva mesa en el salón.'
                : 'Actualiza la información de la mesa.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[18px] text-text transition-colors hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">
                Número
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={numero}
                onChange={(event) => setNumero(event.target.value)}
                placeholder="1"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">
                Capacidad
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={capacidad}
                onChange={(event) => setCapacidad(event.target.value)}
                placeholder="4"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">Zona</label>
            <select
              value={zoneId}
              onChange={(event) => setZoneId(Number(event.target.value))}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.nombre}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-[14px] font-medium text-text">
              Mesa activa
            </span>
          </label>

          {error && (
            <div className="rounded-2xl bg-alert/10 px-4 py-3 text-[14px] font-medium text-alert">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || zones.length === 0}
              className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting
                ? mode === 'create'
                  ? 'Creando...'
                  : 'Guardando...'
                : mode === 'create'
                  ? 'Crear'
                  : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}