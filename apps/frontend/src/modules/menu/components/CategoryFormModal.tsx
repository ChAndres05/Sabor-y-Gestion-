import { useState } from 'react';
import type {
  MenuCategory,
  MenuCategoryFormValues,
} from '../types/menu.types';

interface CategoryFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialCategory?: MenuCategory | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: MenuCategoryFormValues) => Promise<void>;
}

export function CategoryFormModal({
  open,
  mode,
  initialCategory,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [nombre, setNombre] = useState(initialCategory?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(
    initialCategory?.descripcion ?? ''
  );
  const [activo, setActivo] = useState(initialCategory?.activo ?? true);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    setError('');

    await onSubmit({
      nombre,
      descripcion,
      activo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="relative w-full max-w-[380px] rounded-[1.75rem] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[18px] font-bold text-text transition-colors hover:text-primary"
        >
          ✕
        </button>

        <h3 className="text-[22px] font-bold text-text">
          {mode === 'create' ? 'Nueva categoría' : 'Editar categoría'}
        </h3>

        <p className="mt-2 text-[14px] leading-6 text-gray-500">
          {mode === 'create'
            ? 'Agrega una nueva categoría al menú'
            : 'Actualiza la información de la categoría'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold text-text">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Entradas"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold text-text">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Descripción de la categoría"
              rows={3}
              className="resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-colors focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-[14px] font-medium text-text">
              Categoría activa
            </span>
          </label>

          {error && (
            <p className="text-[13px] font-medium text-alert">{error}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
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