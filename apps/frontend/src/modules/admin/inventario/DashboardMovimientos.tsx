import { mockInsumos, mockMovimientos, formatUnidad, formatFecha } from '../../../shared/mocks/inventario';
export default function DashboardMovimientos() {
  // --- CÁLCULO AUTOMÁTICO DE KPIs ---
  const totalInsumos = mockInsumos.length;
  // Stock Crítico: Mayor que 0 pero menor o igual al 20% de su mínimo
  const stockCritico = mockInsumos.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo * 0.2).length;
  // Agotado: Exactamente 0
  const agotados = mockInsumos.filter(i => i.stock_actual === 0).length;

  // Lógica para pintar los badges de "Tipo"
  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
      case 'AJUSTE_POSITIVO':
        return 'bg-green-100 text-green-700';
      case 'SALIDA':
      case 'MERMA':
      case 'AJUSTE_NEGATIVO':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      {/* 2. Tarjetas de Resumen (KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Tarjeta 1: Total */}
        <div className="flex flex-col rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100">
          <span className="text-[14px] font-bold uppercase tracking-wider text-gray-500">Total de Insumos</span>
          <span className="mt-2 text-4xl font-bold text-gray-900">{totalInsumos}</span>
        </div>

        {/* Tarjeta 2: Crítico */}
        <div className="flex flex-col rounded-[2rem] bg-red-50 p-6 shadow-sm border border-red-100">
          <span className="text-[14px] font-bold uppercase tracking-wider text-alert opacity-80">Stock Crítico</span>
          <span className="mt-2 text-4xl font-bold text-alert">{stockCritico}</span>
        </div>

        {/* Tarjeta 3: Agotado */}
        <div className="flex flex-col rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100">
          <span className="text-[14px] font-bold uppercase tracking-wider text-gray-500">Agotado</span>
          <span className="mt-2 text-4xl font-bold text-[#C58B59]">{agotados}</span> {/* Color del diseño original */}
        </div>
      </div>

      {/* 3. Tabla de Últimos Movimientos */}
      <div className="mt-4 flex flex-col rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-subtitle font-bold text-text">Últimos Movimientos</h2>
        <p className="mb-6 text-[14px] text-gray-500">Administra los movimientos del restaurante</p>

        <div className="no-scrollbar overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Fecha/hora</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Insumo</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Tipo</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Cantidad</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Stock anterior</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500">Stock Actual</th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockMovimientos.map((mov) => (
                <tr key={mov.id_movimiento} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-600">{formatFecha(mov.fecha_hora)}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{mov.nombre_insumo}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${getBadgeColor(mov.tipo_movimiento)}`}>
                      {mov.tipo_movimiento}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {mov.cantidad} {formatUnidad(mov.unidad_medida)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {mov.stock_anterior} {formatUnidad(mov.unidad_medida)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {mov.stock_actual} {formatUnidad(mov.unidad_medida)}
                  </td>
            
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}