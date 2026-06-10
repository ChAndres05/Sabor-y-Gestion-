import { useState, useMemo, useEffect } from 'react';
import { formatUnidad, type Insumo, type MockProductoReceta } from '../../../shared/mocks/inventario';
import BaseButton from '../../../shared/components/BaseButton';
import { Input } from '../../../shared/components/Input';
import CrearInsumoModal, { type CrearInsumoFormData } from './components/CrearInsumoModal';
import AsociarInsumosModal from './components/AsociarInsumosModal';
import { inventarioApi } from '../../../shared/api/inventario.api';

export default function CatalogoInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productosRecetas, setProductosRecetas] = useState<MockProductoReceta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAsociarOpen, setIsAsociarOpen] = useState<boolean>(false);

  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [dataInsumos, dataRecetas] = await Promise.all([
        inventarioApi.getInsumos(),
        inventarioApi.getProductosRecetas()
      ]);
      setInsumos(dataInsumos);
      setProductosRecetas(dataRecetas);
    } catch (error) {
      console.error('Error cargando catálogo de insumos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const determinarEstado = (actual: number, minimo: number) => {
    if (actual === 0 || actual <= minimo * 0.2) return { label: 'Crítico', color: 'bg-alert text-white' };
    if (actual <= minimo) return { label: 'Bajo', color: 'bg-process text-white' };
    return { label: 'Óptimo', color: 'bg-success text-white' };
  };

  const insumosFiltrados = useMemo(() => {
    return insumos.filter((insumo) => {
      const matchBusqueda = insumo.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                            insumo.id_insumo.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = filtroCategoria ? insumo.categoria === filtroCategoria : true;
      let matchEstado = true;
      if (filtroEstado) {
        const estadoLabel = determinarEstado(insumo.stock_actual, insumo.stock_minimo).label.toLowerCase();
        matchEstado = estadoLabel === filtroEstado.toLowerCase();
      }
      return matchBusqueda && matchCategoria && matchEstado;
    });
  }, [insumos, busqueda, filtroCategoria, filtroEstado]);

  const handleGuardarInsumo = async (nuevoDato: CrearInsumoFormData) => {
    try {
      setLoading(true);
      await inventarioApi.crearInsumo({
        nombre: nuevoDato.nombre,
        categoria: nuevoDato.categoria,
        unidad_medida: nuevoDato.unidad_medida,
        stock_inicial: nuevoDato.stock_inicial,
        stock_minimo: nuevoDato.stock_minimo
      });
      await cargarDatos();
    } catch (error: any) {
      console.error('Error al guardar el insumo:', error);
      alert(error.message || 'No se pudo crear el insumo.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecetas = async (nuevasRecetas: MockProductoReceta[]) => {
    // Identificar qué producto cambió en sus ingredientes
    const changedProduct = nuevasRecetas.find((newRec) => {
      const oldRec = productosRecetas.find((oldRec) => oldRec.id_producto === newRec.id_producto);
      return JSON.stringify(oldRec?.ingredientes) !== JSON.stringify(newRec.ingredientes);
    });

    if (changedProduct) {
      try {
        setLoading(true);
        await inventarioApi.guardarReceta(
          changedProduct.id_producto,
          changedProduct.ingredientes.map((ing) => ({
            id_insumo: ing.id_insumo,
            cantidad: ing.cantidad
          }))
        );
        const dataRecetas = await inventarioApi.getProductosRecetas();
        setProductosRecetas(dataRecetas);
      } catch (error) {
        console.error('Error al guardar la receta:', error);
        alert('No se pudo guardar la receta en la base de datos.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 pb-10 md:px-8">
      
      {/* Barra de Filtros y Acción */}
      <div className="grid items-end gap-3 rounded-[1.5rem] border border-gray-50 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto]">
        
        <label className="block w-full">
          <span className="text-[11px] font-black uppercase text-gray-400">Buscar Insumo</span>
          <Input 
            label=""
            type="text"
            placeholder="Ej. Queso, Tomate..."
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="mt-2"
          />
        </label>

        <label className="block w-full md:w-48">
          <span className="text-[11px] font-black uppercase text-gray-400">Categoría</span>
          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-100 bg-background p-3 text-[14px] outline-none focus:border-primary"
          >
            <option value="">Todas</option>
            <option value="Carnes y Aves">Carnes y Aves</option>
            <option value="Verduras">Verduras</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Lácteos">Lácteos</option>
            <option value="Abarrotes / Secos">Abarrotes / Secos</option>
          </select>
        </label>

        <label className="block w-full md:w-40">
          <span className="text-[11px] font-black uppercase text-gray-400">Estado</span>
          <select 
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-100 bg-background p-3 text-[14px] outline-none focus:border-primary"
          >
            <option value="">Todos</option>
            <option value="Crítico">Crítico</option>
            <option value="Bajo">Bajo</option>
            <option value="Óptimo">Óptimo</option>
          </select>
        </label>

        <div className="mt-2 flex gap-2 w-full md:w-auto flex-col sm:flex-row">
          <BaseButton 
            variant="outline" 
            onClick={() => setIsAsociarOpen(true)}
            className="h-[46px] w-full md:w-auto"
            disabled={loading || insumos.length === 0 || productosRecetas.length === 0}
          >
            Asociar con Productos
          </BaseButton>
          <BaseButton 
            variant="primary" 
            onClick={() => setIsModalOpen(true)}
            className="h-[46px] w-full md:w-auto"
            disabled={loading}
          >
            + Nuevo insumo
          </BaseButton>
        </div>
      </div>

      {/* Tabla Responsiva */}
      <div className="overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-sm">
        {loading && insumos.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Cargando insumos...</div>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="min-w-[800px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Código</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Insumo</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Categoría</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Productos</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Unidad</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Stock Actual</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-400">Min.</th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-wider text-gray-400">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {insumosFiltrados.length > 0 ? (
                  insumosFiltrados.map((insumo) => {
                    const estado = determinarEstado(insumo.stock_actual, insumo.stock_minimo);
                    const filaClase = estado.label === 'Crítico' ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-gray-50';

                    return (
                      <tr key={insumo.id_insumo} className={`${filaClase} transition-colors`}>
                        <td className="px-6 py-4 text-sm text-gray-500">{`INS-${String(insumo.id_insumo).padStart(3, '0')}`}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{insumo.nombre}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{insumo.categoria}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(() => {
                              const asociados = productosRecetas.filter((p) =>
                                p.ingredientes.some((ing) => ing.id_insumo === insumo.id_insumo)
                              );
                              return asociados.length > 0 ? (
                                asociados.map((p) => (
                                  <span
                                    key={p.id_producto}
                                    className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                                  >
                                    {p.nombre}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs italic">Ninguno</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatUnidad(insumo.unidad_medida)}</td>
                        <td className={`px-6 py-4 text-sm font-bold ${estado.label === 'Crítico' ? 'text-alert' : 'text-gray-900'}`}>
                          {insumo.stock_actual}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{insumo.stock_minimo}</td>
                        <td className="px-6 py-4 text-center text-sm">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${estado.color} bg-opacity-90`}>
                            {estado.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No se encontraron insumos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CrearInsumoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleGuardarInsumo} />
      {isAsociarOpen && (
        <AsociarInsumosModal
          open={isAsociarOpen}
          onClose={() => setIsAsociarOpen(false)}
          insumos={insumos}
          productosRecetas={productosRecetas}
          onUpdateRecetas={handleUpdateRecetas}
        />
      )}
    </div>
  );
}