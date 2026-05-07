import { useEffect, useState } from 'react';
import type {
  MenuCategory,
  MenuProduct,
  MenuProductFormValues,
} from '../types/menu.types';

const MAX_PRODUCT_NAME_LENGTH = 20;
const MAX_PRODUCT_DESCRIPTION_LENGTH = 255;
const MAX_PRODUCT_PRICE = 150;
const MAX_PRODUCT_TIME = 180;
const PRODUCT_NAME_PATTERN = /^[\p{L}\p{M} ]+$/u;
const PRICE_PATTERN = /^\d+(\.\d{0,2})?$/;
const TIME_PATTERN = /^\d+$/;

const normalizeProductName = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

const enforceSingleSpaces = (value: string) => {
  const collapsed = value.replace(/\s+/g, ' ');
  return collapsed.startsWith(' ') ? collapsed.slice(1) : collapsed;
};

const getProductRealtimeError = (params: {
  nombre: string;
  descripcion: string;
  precio: string;
  tiempoPreparacion: string;
}) => {
  const normalizedNombre = normalizeProductName(params.nombre);

  if (normalizedNombre && normalizedNombre.length > MAX_PRODUCT_NAME_LENGTH) {
    return `El nombre no puede superar ${MAX_PRODUCT_NAME_LENGTH} caracteres`;
  }

  if (normalizedNombre && !PRODUCT_NAME_PATTERN.test(normalizedNombre)) {
    return 'El nombre solo puede contener letras y espacios';
  }

  if (params.descripcion.length > MAX_PRODUCT_DESCRIPTION_LENGTH) {
    return `La descripción no puede superar ${MAX_PRODUCT_DESCRIPTION_LENGTH} caracteres`;
  }

  if (params.precio.trim()) {
    if (!PRICE_PATTERN.test(params.precio.trim())) {
      return 'El precio debe ser numérico';
    }

    const parsedPrice = Number(params.precio);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return 'El precio debe ser mayor a 0';
    }

    if (parsedPrice > MAX_PRODUCT_PRICE) {
      return `El precio no puede superar ${MAX_PRODUCT_PRICE}`;
    }
  }

  if (params.tiempoPreparacion.trim()) {
    if (!TIME_PATTERN.test(params.tiempoPreparacion.trim())) {
      return 'El tiempo debe ser un número entero';
    }

    const parsedTime = Number(params.tiempoPreparacion);

    if (!Number.isFinite(parsedTime) || parsedTime <= 0) {
      return 'El tiempo de preparación debe ser mayor a 0';
    }

    if (parsedTime > MAX_PRODUCT_TIME) {
      return `El tiempo no puede superar ${MAX_PRODUCT_TIME} min`;
    }
  }

  return '';
};

const getProductSubmitError = (params: {
  categoryId: number;
  nombre: string;
  descripcion: string;
  precio: string;
  tiempoPreparacion: string;
  imagen: string;
}) => {
  const normalizedNombre = normalizeProductName(params.nombre);

  if (!params.categoryId) {
    return 'Debes seleccionar una categoría';
  }

  if (!normalizedNombre) {
    return 'El nombre del producto es obligatorio';
  }

  if (!params.precio.trim()) {
    return 'El precio es obligatorio';
  }

  if (!params.tiempoPreparacion.trim()) {
    return 'El tiempo de preparación es obligatorio';
  }

  if (!params.imagen.trim()) {
    return 'La imagen es obligatoria';
  }

  return getProductRealtimeError(params);
};

interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  categories: MenuCategory[];
  initialProduct?: MenuProduct | null;
  selectedCategoryId?: number | null;
  isSubmitting: boolean;
  externalError?: string | null;
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
      disponible: initialProduct.disponible,
    };
  }

  return {
    categoryId: selectedCategoryId ?? categories[0]?.id ?? 0,
    nombre: '',
    descripcion: '',
    precio: 0,
    tiempoPreparacion: 0,
    imagen: null,
    disponible: true,
  };
}

export function ProductFormModal({
  open,
  mode,
  categories,
  initialProduct,
  selectedCategoryId = null,
  isSubmitting,
  externalError,
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
  const [disponible, setDisponible] = useState(initialValues.disponible);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const realtimeError = getProductRealtimeError({
    nombre,
    descripcion,
    precio,
    tiempoPreparacion,
  });
  const submitError = submitAttempted
    ? getProductSubmitError({
      categoryId,
      nombre,
      descripcion,
      precio,
      tiempoPreparacion,
      imagen,
    })
    : '';
  const validationError = realtimeError || submitError;

  const errorMessage = error || validationError;
  const isFormValidForSubmit = !validationError;
  const isFormBlocked = Boolean(realtimeError);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitAttempted(true);

    const submitValidationError = getProductSubmitError({
      categoryId,
      nombre,
      descripcion,
      precio,
      tiempoPreparacion,
      imagen,
    });

    if (submitValidationError) {
      setError(submitValidationError);
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
      disponible,
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
              onChange={(event) => {
                setNombre(enforceSingleSpaces(event.target.value));
                if (submitAttempted) setSubmitAttempted(false);
                if (error) setError('');
              }}
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
              onChange={(event) => {
                setDescripcion(enforceSingleSpaces(event.target.value));
                if (submitAttempted) setSubmitAttempted(false);
                if (error) setError('');
              }}
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
                max={MAX_PRODUCT_PRICE}
                step="0.01"
                value={precio}
                onChange={(event) => {
                  setPrecio(event.target.value);
                  if (submitAttempted) setSubmitAttempted(false);
                  if (error) setError('');
                }}
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
                max={MAX_PRODUCT_TIME}
                step="1"
                value={tiempoPreparacion}
                onChange={(event) => {
                  setTiempoPreparacion(event.target.value);
                  if (submitAttempted) setSubmitAttempted(false);
                  if (error) setError('');
                }}
                placeholder="15"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">
              Imagen
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
              checked={disponible}
              onChange={(event) => setDisponible(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-[14px] font-medium text-text">
              Disponible para la venta
            </span>
          </label>

          {errorMessage && (
            <div className="rounded-2xl bg-alert/10 px-4 py-3 text-[14px] font-medium text-alert">
              {errorMessage}
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
              disabled={isSubmitting || categories.length === 0 || isFormBlocked}
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