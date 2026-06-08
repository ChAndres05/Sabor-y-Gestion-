import { useState, useMemo } from 'react';
import { mockInsumos, formatUnidad, type Insumo } from '../../../shared/mocks/inventario';

// Componentes Base
import BaseButton from '../../../shared/components/BaseButton';
import { Input } from '../../../shared/components/Input';

import CrearInsumoModal, { type CrearInsumoFormData } from './components/CrearInsumoModal';

export default function CatalogoInsumos() {
  // Estados de datos y UI
  const [insumos, setInsumos] = useState<Insumo[]>(mockInsumos);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Estados de filtros
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Lógica de semáforo para el stock
  const determinarEstado = (actual: number, minimo: number) => {
    if (actual === 0 || actual <= minimo * 0.2) return { label: 'Crítico', color: 'bg-alert text-white' };
    if (actual <= minimo) return { label: 'Bajo', color: 'bg-process text-white' };
    return { label: 'Óptimo', color: 'bg-success text-white' };
  };

  // Filtrado reactivo (useMemo evita renders innecesarios)
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

  // Manejador para simular la creación de un registro
  const handleGuardarInsumo = (nuevoDato: CrearInsumoFormData) => {
    const nuevoInsumo: Insumo = {
      id_insumo: `INS-00${insumos.length + 1}`, // ID simulado
      nombre: nuevoDato.nombre,
      categoria: nuevoDato.categoria,
      unidad_medida: nuevoDato.unidad_medida,
      stock_actual: 0, // Todo insumo nuevo nace con 0 stock
      stock_minimo: nuevoDato.stock_minimo === '' ? 0 : nuevoDato.stock_minimo,
      activo: true,
    };

    setInsumos([nuevoInsumo, ...insumos]);
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6 md:p-8 lg:max-w-7xl lg:mx-auto">
      
      {/* 1. Cabecera */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title font-bold text-text">Catálogo de Insumos</h1>
          <p className="text-content text-gray-600">Gestiona los productos base del restaurante</p>
        </div>
        <BaseButton 
          variant="primary" 
          onClick={() => setIsModalOpen(true)}
          className="whitespace-nowrap bg-gray-900 hover:bg-black"
        >
          + Nuevo Insumo
        </BaseButton>
      </div>

      {/* 2. Barra de Filtros */}
      <div className="flex flex-col items-end gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="w-full flex-1">
          <Input 
            label="Búsqueda"
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <div className="flex w-full flex-col gap-1 md:w-48">
            <label className="text-[14px] font-bold uppercase tracking-wider text-text">Categoría</label>
            <select 
              className="rounded-xl border border-gray-200 bg-white p-3 outline-none transition-all focus:border-primary"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Carnes y Aves">Carnes y Aves</option>
              <option value="Verduras">Verduras</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Lácteos">Lácteos</option>
              <option value="Abarrotes / Secos">Abarrotes / Secos</option>
            </select>
          </div>
          
          <div className="flex w-full flex-col gap-1 md:w-48">
            <label className="text-[14px] font-bold uppercase tracking-wider text-text">Estado</label>
            <select 
              className="rounded-xl border border-gray-200 bg-white p-3 outline-none transition-all focus:border-primary"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Crítico">Crítico</option>
              <option value="Bajo">Bajo</option>
              <option value="Óptimo">Óptimo</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Tabla Responsiva */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="no-scrollbar overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Código</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Insumo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Categoría</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Unidad</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Stock Actual</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Min.</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {insumosFiltrados.length > 0 ? (
                insumosFiltrados.map((insumo) => {
                  const estado = determinarEstado(insumo.stock_actual, insumo.stock_minimo);
                  const filaClase = estado.label === 'Crítico' ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-gray-50';

                  return (
                    <tr key={insumo.id_insumo} className={`${filaClase} transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-500">{insumo.id_insumo}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{insumo.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{insumo.categoria}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatUnidad(insumo.unidad_medida)}</td>
                      <td className={`px-6 py-4 text-sm font-semibold ${estado.label === 'Crítico' ? 'text-alert' : 'text-gray-900'}`}>
                        {insumo.stock_actual}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{insumo.stock_minimo}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${estado.color} bg-opacity-90`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="space-x-3 px-6 py-4 text-right text-sm">
                        <button type="button" className="text-gray-400 transition-colors hover:text-info" title="Editar">✏️</button>
                        <button type="button" className="text-gray-400 transition-colors hover:text-alert" title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No se encontraron insumos que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal de Creación */}
      <CrearInsumoModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleGuardarInsumo} 
      />
      
    </div>
  );
}