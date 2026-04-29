import { useState } from 'react';
import type {
  MenuCategory,
  MenuProduct,
  MenuProductFormValues,
} from '../types/menu.types';

interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  categories: MenuCategory[];
  initialProduct?: MenuProduct | null;
  selectedCategoryId?: number | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: MenuProductFormValues) => Promise<void>;
}

function getInitialValues(
  categories: MenuCategory[],
  initialProduct?: MenuProduct | null,
  selectedCategoryId?: number | null
): MenuProductFormValues {
  if (initialProduct) {
    return {
      categoryId: initialProduct.categoryId,
      nombre: initialProduct.nombre,
      descripcion: initialProduct.descripcion,
      precio: initialProduct.precio,
      tiempoPreparacion: initialProduct.tiempoPreparacion,
      imagen: initialProduct.imagen,
      activo: initialProduct.activo,
    };
  }

  return {
    categoryId: selectedCategoryId ?? categories[0]?.id ?? 0,
    nombre: '',
    descripcion: '',
    precio: 0,
    tiempoPreparacion: 0,
    imagen: null,
    activo: true,
  };
}

export function ProductFormModal({
  open,
  mode,
  categories,
  initialProduct,
  selectedCategoryId = null,
  isSubmitting,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const initialValues = getInitialValues(
    categories,
    initialProduct,
    selectedCategoryId
  );

  const [categoryId, setCategoryId] = useState<number>(initialValues.categoryId);
  const [nombre, setNombre] = useState(initialValues.nombre);
  const [descripcion, setDescripcion] = useState(initialValues.descripcion);
  const [precio, setPrecio] = useState(
    initialValues.precio ? String(initialValues.precio) : ''
  );
  const [tiempoPreparacion, setTiempoPreparacion] = useState(
    initialValues.tiempoPreparacion ? String(initialValues.tiempoPreparacion) : ''
  );
  const [imagen, setImagen] = useState(initialValues.imagen ?? '');
  const [activo, setActivo] = useState(initialValues.activo);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!categoryId) {
      setError('Debes seleccionar una categoría');
      return;
    }

    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    if (!precio || Number(precio) <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    if (!tiempoPreparacion || Number(tiempoPreparacion) <= 0) {
      setError('El tiempo de preparación debe ser mayor a 0');
      return;
    }

    setError('');

    await onSubmit({
      categoryId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: Number(precio),
      tiempoPreparacion: Number(tiempoPreparacion),
      imagen: imagen.trim() ? imagen.trim() : null,
      activo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[420px] rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-text">
              {mode === 'create' ? 'Nuevo producto' : 'Editar producto'}
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-gray-500">
              {mode === 'create'
                ? 'Agrega un nuevo producto al menú'
                : 'Actualiza la información del producto'}
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
              Categoría
            </label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(Number(event.target.value))}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Pique macho especial"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Describe el producto"
              rows={3}
              className="resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">
                Precio (Bs)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={precio}
                onChange={(event) => setPrecio(event.target.value)}
                placeholder="0.00"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">
                Tiempo (min)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={tiempoPreparacion}
                onChange={(event) => setTiempoPreparacion(event.target.value)}
                placeholder="15"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">
              Imagen (URL opcional)
            </label>
            <input
              type="text"
              value={imagen}
              onChange={(event) => setImagen(event.target.value)}
              placeholder="https://..."
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
              Disponible para la venta
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
              disabled={isSubmitting || categories.length === 0}
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