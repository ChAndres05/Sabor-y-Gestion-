import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import type { TableOrderStatus } from '../tables/types/table-order.types';
import OrderTrackingMap from '../../components/client/OrderTrackingMap';
import { listAllDeliveryOrdersMock, updateDeliveryOrderStatusMock } from '../../shared/mocks/delivery.mock';

interface AdminDeliveryPageProps {
  user: AuthUser;
  onBack: () => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function getStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'Recibido / Nuevo';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo para entrega';
    case 'EN_CAMINO':
      return 'En reparto / En camino';
    case 'ENTREGADO':
      return 'Entregado';
    case 'PAGADO':
      return 'Pagado / Finalizado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return status;
  }
}

function getStatusClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'bg-process/10 text-process border-process/30';
    case 'EN_PREPARACION':
      return 'bg-alert/10 text-alert border-alert/30';
    case 'LISTO':
    case 'EN_CAMINO':
      return 'bg-info/10 text-info border-info/30';
    case 'ENTREGADO':
    case 'PAGADO':
      return 'bg-success/10 text-success border-success/30';
    case 'CANCELADO':
      return 'bg-gray-200 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function AdminDeliveryPage({ user, onBack }: AdminDeliveryPageProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | TableOrderStatus>('ALL');
  const [activeMapOrder, setActiveMapOrder] = useState<any | null>(null);

  const loadLocalOrders = async () => {
    try {
      const parsed = await listAllDeliveryOrdersMock();
      setOrders(parsed);
    } catch (e) {
      console.error('Error parsing orders from mock', e);
    }
  };

  useEffect(() => {
    loadLocalOrders();

    // Listen to local changes
    window.addEventListener('restaurant-state-changed', loadLocalOrders);
    return () => {
      window.removeEventListener('restaurant-state-changed', loadLocalOrders);
    };
  }, []);

  const handleUpdateStatus = async (orderId: number, nextStatus: TableOrderStatus) => {
    try {
      await updateDeliveryOrderStatusMock(orderId, nextStatus);
      // loadLocalOrders will be triggered automatically via the window event,
      // but we can also load it directly for immediate UI updates
      await loadLocalOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const getNextStatusAction = (status: TableOrderStatus) => {
    switch (status) {
      case 'REGISTRADO':
        return { label: '👨‍🍳 Empezar Preparación', next: 'EN_PREPARACION' as TableOrderStatus };
      case 'EN_PREPARACION':
        return { label: '✅ Marcar como Listo', next: 'LISTO' as TableOrderStatus };
      case 'LISTO':
        return { label: '🛵 Despachar Delivery', next: 'EN_CAMINO' as TableOrderStatus };
      case 'EN_CAMINO':
        return { label: '📦 Confirmar Entrega', next: 'ENTREGADO' as TableOrderStatus };
      case 'ENTREGADO':
        return { label: '💰 Registrar Pago', next: 'PAGADO' as TableOrderStatus };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[28px] leading-none text-text hover:opacity-85 transition-opacity cursor-pointer"
          aria-label="Menú"
        >
          ☰
        </button>
        <div className="flex-1">
          <h1 className="text-title font-bold text-text m-0">Atención Delivery</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Gestión en tiempo real de los pedidos a domicilio recibidos desde la aplicación de clientes. Operado por {user.nombre}.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto no-scrollbar">
        {[
          { key: 'ALL', label: `Todos (${orders.length})` },
          { key: 'REGISTRADO', label: `Nuevos (${orders.filter((o) => o.status === 'REGISTRADO').length})` },
          { key: 'EN_PREPARACION', label: `En Cocina (${orders.filter((o) => o.status === 'EN_PREPARACION').length})` },
          { key: 'LISTO', label: `Listos (${orders.filter((o) => o.status === 'LISTO').length})` },
          { key: 'EN_CAMINO', label: `En Reparto (${orders.filter((o) => o.status === 'EN_CAMINO').length})` },
          { key: 'ENTREGADO', label: `Entregados (${orders.filter((o) => o.status === 'ENTREGADO').length})` },
          { key: 'PAGADO', label: `Finalizados (${orders.filter((o) => o.status === 'PAGADO').length})` },
          { key: 'CANCELADO', label: `Cancelados (${orders.filter((o) => o.status === 'CANCELADO').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all border ${
              filter === tab.key
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-text border-gray-200 hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-[1.75rem] bg-white p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
          <span className="text-[64px] mb-4">🛵</span>
          <h3 className="text-[18px] font-bold text-text">No se encontraron pedidos</h3>
          <p className="text-[14px] text-gray-500 mt-1 max-w-[320px]">
            No hay registros de pedidos delivery en esta sección para el estado seleccionado.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const nextAction = getNextStatusAction(order.status);

            return (
              <article
                key={order.id}
                className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Order ID & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[18px] font-bold text-text">Pedido {order.orderNumber}</h3>
                      <p className="text-[12px] text-gray-400 font-medium">{formatDate(order.createdAt)}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Customer Info Card */}
                  <div className="mt-4 rounded-2xl bg-background p-3.5 space-y-2 border border-gray-200/40">
                    <p className="text-[13px] text-text">
                      👤 <strong>Cliente:</strong> {order.customerName || 'Cliente de Aplicativo'}
                    </p>
                    <p className="text-[13px] text-text">
                      📞 <strong>Teléfono:</strong> {order.deliveryPhone || 'Sin teléfono'}
                    </p>
                    {order.deliveryAddress ? (
                      <p className="text-[13px] text-text">
                        📍 <strong>Dirección:</strong> {order.deliveryAddress}
                      </p>
                    ) : (
                      <p className="text-[13px] text-text">
                        🍽️ <strong>Consumo en local:</strong> Mesa {order.tableNumber ?? '-'}
                      </p>
                    )}
                  </div>

                  {/* Products Details List */}
                  <div className="mt-4 space-y-2.5">
                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Productos</h4>
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="text-[13px] text-text flex flex-col">
                        <div className="flex justify-between font-bold">
                          <span>
                            {item.quantity} x {item.name}
                          </span>
                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                        {/* Selected ingredient details */}
                        {item.ingredients && item.ingredients.some((i: any) => !i.incluido) && (
                          <span className="text-[11px] text-gray-500 pl-3">
                            Sin: {item.ingredients.filter((i: any) => !i.incluido).map((i: any) => i.nombre).join(', ')}
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-[11px] italic text-gray-400 pl-3">
                            "{item.notes}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Comments from user */}
                  {order.notes && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Comentarios / Referencias
                      </p>
                      <p className="text-[13px] text-gray-600 bg-background/50 p-2.5 rounded-xl border border-gray-100 italic">
                        "{order.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Totals & Buttons */}
                <div className="mt-5 border-t border-gray-100 pt-4 space-y-4">
                  <div className="space-y-1.5 text-[13px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Costo de Envío</span>
                        <span>{formatPrice(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[15px] font-bold text-text border-t border-gray-200/50 pt-1.5">
                      <span>Total del Pedido</span>
                      <span className="text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  {/* Status Change Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {nextAction && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, nextAction.next)}
                        className="flex-1 min-w-[120px] rounded-2xl bg-primary py-2.5 text-[13px] font-bold text-white hover:bg-primary-hover shadow-sm transition-colors cursor-pointer"
                      >
                        {nextAction.label}
                      </button>
                    )}
                    {order.deliveryAddress && (
                      <button
                        type="button"
                        onClick={() => setActiveMapOrder(order)}
                        className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        title="Ver Mapa de Seguimiento"
                      >
                        🗺️ Mapa
                      </button>
                    )}
                    {['REGISTRADO', 'EN_PREPARACION', 'LISTO', 'EN_CAMINO'].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'CANCELADO')}
                        className="rounded-2xl border border-alert bg-white px-3 py-2.5 text-[13px] font-bold text-alert hover:bg-alert/5 transition-colors cursor-pointer"
                        title="Cancelar Pedido"
                      >
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Map modal pop-up for admins */}
      {activeMapOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-xl flex flex-col animate-in zoom-in-95">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-[18px] font-bold text-text">Mapa del Pedido {activeMapOrder.orderNumber}</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Destino: {activeMapOrder.deliveryAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMapOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <OrderTrackingMap orderId={activeMapOrder.id} status={activeMapOrder.status} />

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveMapOrder(null)}
                className="rounded-2xl bg-white border border-gray-300 px-6 py-2.5 text-[13px] font-bold text-text hover:bg-black/5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
