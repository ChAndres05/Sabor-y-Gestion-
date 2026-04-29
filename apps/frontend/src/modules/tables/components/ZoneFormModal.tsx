import { useState } from 'react';
import type { ZoneFormValues } from '../types/table.types';

interface ZoneFormModalProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ZoneFormValues) => Promise<void>;
}

export function ZoneFormModal({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: ZoneFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setError('El nombre de la zona es obligatorio');
      return;
    }

    setError('');

    await onSubmit({
      nombre: nombre.trim(),
      activo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[380px] rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-text">Nueva zona</h2>
            <p className="mt-1 text-[14px] leading-6 text-gray-500">
              Crea una nueva zona o sector para las mesas.
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
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">
              Nombre de zona
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Terraza"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-[14px] font-medium text-text">
              Zona activa
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
              disabled={isSubmitting}
              className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}