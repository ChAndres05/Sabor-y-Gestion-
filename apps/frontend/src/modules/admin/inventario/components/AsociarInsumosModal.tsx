import React, { useState } from 'react';
import BaseModal from '../../../../shared/components/BaseModal';
import BaseButton from '../../../../shared/components/BaseButton';
import { formatUnidad, type Insumo } from '../../../../shared/mocks/inventario';

export interface MockProductoReceta {
  id_producto: string;
  nombre: string;
  ingredientes: Array<{
    id_insumo: string;
    nombre_insumo: string;
    cantidad: number;
    unidad: string;
  }>;
}

interface AsociarInsumosModalProps {
  open: boolean;
  onClose: () => void;
  insumos: Insumo[];
  productosRecetas: MockProductoReceta[];
  onUpdateRecetas: (recetas: MockProductoReceta[]) => void;
}

export default function AsociarInsumosModal({
  open,
  onClose,
  insumos,
  productosRecetas,
  onUpdateRecetas,
}: AsociarInsumosModalProps) {
  // Activa el primer producto disponible por defecto
  const [selectedProductId, setSelectedProductId] = useState<string>(
    productosRecetas[0]?.id_producto || ''
  );

  // Formulario local para agregar ingrediente
  const [nuevoInsumoId, setNuevoInsumoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<string>('');
  const [errorAgregar, setErrorAgregar] = useState<string>('');

  const activeProduct = productosRecetas.find((p) => p.id_producto === selectedProductId);

  const handleKeyDownDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '-', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setCantidad(val);
    }
  };

  const handleAgregarIngrediente = () => {
    setErrorAgregar('');
    if (!selectedProductId) {
      setErrorAgregar('Selecciona un producto primero');
      return;
    }
    if (!nuevoInsumoId) {
      setErrorAgregar('Selecciona un insumo');
      return;
    }
    const cantNum = Number(cantidad);
    if (!cantidad || isNaN(cantNum) || cantNum <= 0) {
      setErrorAgregar('Ingresa una cantidad mayor a 0');
      return;
    }

    const insumoSeleccionado = insumos.find((i) => i.id_insumo === nuevoInsumoId);
    if (!insumoSeleccionado) return;

    if (activeProduct) {
      // Verificar si ya existe en la receta
      const yaExiste = activeProduct.ingredientes.some((i) => i.id_insumo === nuevoInsumoId);
      if (yaExiste) {
        setErrorAgregar('Este insumo ya está asociado al producto');
        return;
      }

      const nuevosIngredientes = [
        ...activeProduct.ingredientes,
        {
          id_insumo: nuevoInsumoId,
          nombre_insumo: insumoSeleccionado.nombre,
          cantidad: cantNum,
          unidad: formatUnidad(insumoSeleccionado.unidad_medida),
        },
      ];

      const nuevasRecetas = productosRecetas.map((p) => {
        if (p.id_producto === selectedProductId) {
          return { ...p, ingredientes: nuevosIngredientes };
        }
        return p;
      });

      onUpdateRecetas(nuevasRecetas);
      setNuevoInsumoId('');
      setCantidad('');
    }
  };

  const handleEliminarIngrediente = (idInsumo: string) => {
    if (activeProduct) {
      const nuevosIngredientes = activeProduct.ingredientes.filter((i) => i.id_insumo !== idInsumo);
      const nuevasRecetas = productosRecetas.map((p) => {
        if (p.id_producto === selectedProductId) {
          return { ...p, ingredientes: nuevosIngredientes };
        }
        return p;
      });
      onUpdateRecetas(nuevasRecetas);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Asociar Insumos con Productos"
      onClose={onClose}
      maxWidthClassName="max-w-[550px]"
    >
      <div className="flex flex-col gap-4">
        {/* Selector de Producto */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-bold uppercase tracking-wider text-gray-400">
            Producto a configurar receta:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setErrorAgregar('');
            }}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none transition-all focus:border-primary font-medium"
          >
            {productosRecetas.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Listado de Insumos Asociados actualmente */}
        <div className="mt-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
          <h4 className="mb-3 text-[11px] font-black uppercase tracking-wider text-gray-400">
            Insumos requeridos para este producto:
          </h4>

          {activeProduct && activeProduct.ingredientes.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
              {activeProduct.ingredientes.map((ing) => (
                <div
                  key={ing.id_insumo}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-gray-100 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{ing.nombre_insumo}</span>
                    <span className="text-xs text-gray-500 font-medium">
                      Cantidad requerida: {ing.cantidad} {ing.unidad}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEliminarIngrediente(ing.id_insumo)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-alert hover:bg-red-50 transition-colors font-bold text-base"
                    title="Eliminar asociación"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-gray-500">
              No hay insumos asociados a este producto todavía.
            </p>
          )}
        </div>

        {/* Formulario para agregar asociación */}
        <div className="rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
          <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-400">
            Agregar Insumo a la receta:
          </h5>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_auto] items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500">Insumo</label>
              <select
                value={nuevoInsumoId}
                onChange={(e) => setNuevoInsumoId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Seleccionar insumo...</option>
                {insumos.map((i) => (
                  <option key={i.id_insumo} value={i.id_insumo}>
                    {i.nombre} ({formatUnidad(i.unidad_medida)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500">Cantidad</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 0.5"
                value={cantidad}
                onChange={handleCantidadChange}
                onKeyDown={handleKeyDownDecimal}
                className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <BaseButton
              type="button"
              variant="primary"
              onClick={handleAgregarIngrediente}
              className="h-[38px] px-4 font-bold"
            >
              Agregar
            </BaseButton>
          </div>
          {errorAgregar && (
            <span className="text-xs italic text-alert mt-1">{errorAgregar}</span>
          )}
        </div>

        {/* Botón de cierre */}
        <div className="mt-4 flex justify-end">
          <BaseButton variant="outline" onClick={onClose} className="px-6">
            Cerrar
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  );
}
