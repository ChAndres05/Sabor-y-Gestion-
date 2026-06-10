import { useState } from 'react';
import type {
  MenuCategory,
  MenuProduct,
  MenuProductFormValues,
} from '../types/menu.types';

import { validateName, validateDescription } from '../../../shared/utils/validation';

// Agregamos Insumos a las Props
interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  categories: MenuCategory[];
  insumos: Array<{ id_insumo: string; nombre: string; unidad_medida: string }>; // Viene del inventario
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
      disponible: initialProduct.disponible,
      ingredientes: initialProduct.ingredientes || [],
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
    ingredientes: [],
  };
}

export function ProductFormModal({
  open,
  mode,
  categories,
  insumos,
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
  const [precio, setPrecio] = useState(initialValues.precio ? String(initialValues.precio) : '');
  const [tiempoPreparacion, setTiempoPreparacion] = useState(initialValues.tiempoPreparacion ? String(initialValues.tiempoPreparacion) : '');
  const [imagen, setImagen] = useState(initialValues.imagen ?? '');
  const [disponible, setDisponible] = useState(initialValues.disponible);
  
  // Estado para la receta
  const [ingredientes, setIngredientes] = useState<MenuProductFormValues['ingredientes']>(initialValues.ingredientes);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');

  const [error, setError] = useState('');

  if (!open) return null;

  // Lógica para agregar ingrediente a la lista local
  const handleAddIngrediente = () => {
    if (!selectedInsumoId || !cantidadInsumo || Number(cantidadInsumo) <= 0) return;
    
    const insumoElegido = insumos.find(i => i.id_insumo === selectedInsumoId);
    if (!insumoElegido) return;

    // Evitar duplicados (actualiza si ya existe)
    const existe = ingredientes.find(i => i.id_insumo === selectedInsumoId);
    if (existe) {
      setIngredientes(ingredientes.map(i => i.id_insumo === selectedInsumoId ? { ...i, cantidad: Number(cantidadInsumo) } : i));
    } else {
      setIngredientes([...ingredientes, {
        id_insumo: insumoElegido.id_insumo,
        nombre: insumoElegido.nombre,
        cantidad: Number(cantidadInsumo),
        unidad: insumoElegido.unidad_medida,
        incluidoPorDefecto: true
      }]);
    }

    setSelectedInsumoId('');
    setCantidadInsumo('');
  };

  const handleRemoveIngrediente = (id_insumo: string) => {
    setIngredientes(ingredientes.filter(i => i.id_insumo !== id_insumo));
  };

  const handleToggleOpcional = (id_insumo: string) => {
    setIngredientes(ingredientes.map(i => i.id_insumo === id_insumo ? { ...i, incluidoPorDefecto: !i.incluidoPorDefecto } : i));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!categoryId) return setError('Debes seleccionar una categoría');
    if (validateName(nombre)) return setError(validateName(nombre) || '');
    if (validateDescription(descripcion)) return setError(validateDescription(descripcion) || '');
    if (!precio || Number(precio) <= 0) return setError('El precio debe ser mayor a 0');
    if (!tiempoPreparacion || Number(tiempoPreparacion) <= 0) return setError('El tiempo de preparación debe ser mayor a 0');

    setError('');

    await onSubmit({
      categoryId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: Number(precio),
      tiempoPreparacion: Number(tiempoPreparacion),
      imagen: imagen.trim() ? imagen.trim() : null,
      disponible,
      ingredientes, // Se envían los ingredientes al backend
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      {/* Aumentamos el ancho a max-w-[500px] para que la receta quepa bien */}
      <div className="w-full max-w-[500px] rounded-[2rem] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-text">
              {mode === 'create' ? 'Nuevo producto' : 'Editar producto'}
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-gray-500">
              {mode === 'create'
                ? 'Agrega un nuevo producto y su receta.'
                : 'Actualiza la información y receta del producto.'}
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
          {/* Categoría y Nombre en 2 columnas si hay espacio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">Categoría</label>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(Number(event.target.value))}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej. Pique macho especial"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Describe el producto"
              rows={2}
              className="resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">Precio (Bs)</label>
              <input
                type="number" min="1" step="0.01"
                value={precio}
                onChange={(event) => setPrecio(event.target.value)}
                placeholder="0.00"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-text">Tiempo (min)</label>
              <input
                type="number" min="1" step="1"
                value={tiempoPreparacion}
                onChange={(event) => setTiempoPreparacion(event.target.value)}
                placeholder="15"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text">Imagen URL</label>
            <input
              type="text"
              value={imagen}
              onChange={(event) => setImagen(event.target.value)}
              placeholder="https://..."
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* --- NUEVA SECCIÓN: RECETA / INGREDIENTES --- */}
          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-gray-500">
              Receta e Ingredientes
            </h3>
            
            {/* Controles para añadir */}
            <div className="flex gap-2 mb-3">
              <select
                value={selectedInsumoId}
                onChange={(e) => setSelectedInsumoId(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white p-2 text-[13px] outline-none focus:border-primary"
              >
                <option value="">Selecciona insumo...</option>
                {insumos.map((i) => (
                  <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.unidad_medida})</option>
                ))}
              </select>
              <input
                type="number" min="0.01" step="0.01"
                value={cantidadInsumo}
                onChange={(e) => setCantidadInsumo(e.target.value)}
                placeholder="Cant."
                className="w-20 rounded-xl border border-gray-200 bg-white p-2 text-[13px] outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddIngrediente}
                disabled={!selectedInsumoId || !cantidadInsumo}
                className="rounded-xl bg-gray-900 px-3 py-2 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
              >
                +
              </button>
            </div>

            {/* Lista de ingredientes añadidos */}
            {ingredientes.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto no-scrollbar">
                {ingredientes.map((ing) => (
                  <div key={ing.id_insumo} className="flex items-center justify-between rounded-xl bg-white p-2 border border-gray-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-gray-800">{ing.nombre}</span>
                      <span className="text-[11px] text-gray-400">Descuenta: {ing.cantidad} {ing.unidad}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer" title="Si lo desactivas, el cliente/mesero puede quitarlo del plato">
                        <input
                          type="checkbox"
                          checked={ing.incluidoPorDefecto}
                          onChange={() => handleToggleOpcional(ing.id_insumo!)}
                          className="h-3 w-3 accent-primary"
                        />
                        <span className="text-[10px] uppercase font-bold text-gray-400">Fijo</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngrediente(ing.id_insumo!)}
                        className="text-[12px] text-gray-400 hover:text-alert"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-center text-gray-400 italic">No hay ingredientes registrados. Este producto no descontará stock del inventario.</p>
            )}
          </div>
          {/* --- FIN SECCIÓN RECETA --- */}

          <label className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3">
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
              {isSubmitting ? (mode === 'create' ? 'Creando...' : 'Guardando...') : (mode === 'create' ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}