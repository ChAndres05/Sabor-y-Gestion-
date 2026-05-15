import { useEffect, useMemo, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { ordersApi } from '../../shared/api/orders.api';
import { tablesApi } from '../../shared/api/tables.api';
import { pusherClient } from '../../shared/utils/pusher';
import { RESTAURANT_STATE_CHANGED_EVENT } from '../../shared/utils/events';
import type { AuthUser } from '../auth/types/auth.types';
import type { Zone, RestaurantTable } from '../tables/types/table.types';
import type { TableOrder, TableOrderStatus } from '../tables/types/table-order.types';

type OrdersTab = 'activos' | 'completados';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

interface MeseroOrdersPageProps {
  user: AuthUser;
  onBack: () => void;
  onOpenOrder: (tableId: number) => void;
}

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

/**
 * Formatea la hora en formato de 24 horas (HH:mm) según requerimiento.
 */
function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Forzar formato 24 horas
    }).format(new Date(value));
  } catch {
    return '--:--';
  }
}

function getOrderStatusLabel(status: TableOrderStatus) {
  const labels: Record<string, string> = {
    'REGISTRADO': 'Registrado',
    'EN_PREPARACION': 'En preparación',
    'LISTO': 'Listo para entregar',
    'EN_CAMINO': 'En camino',
    'ENTREGADO': 'Pedido completado',
    'PAGADO': 'Pagado',
    'CANCELADO': 'Cancelado',
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO': return 'bg-process/10 text-process';
    case 'EN_PREPARACION': return 'bg-alert/10 text-alert';
    case 'LISTO':
    case 'EN_CAMINO': return 'bg-info/10 text-info';
    case 'ENTREGADO':
    case 'PAGADO': return 'bg-success/10 text-success';
    case 'CANCELADO': return 'bg-gray-200 text-gray-600';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function isCompletedOrder(order: TableOrder) {
  return order.estado === 'ENTREGADO' || order.estado === 'PAGADO';
}

export default function MeseroOrdersPage({ user, onBack, onOpenOrder }: MeseroOrdersPageProps) {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeTab, setActiveTab] = useState<OrdersTab>('activos');
  const [isLoading, setIsLoading] = useState(true);
  const [busyTableId, setBusyTableId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const tableById = useMemo(() => {
    return tables.reduce<Record<number, RestaurantTable>>((acc, table) => {
      acc[table.id] = table;
      return acc;
    }, {});
  }, [tables]);

  const loadData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsLoading(true);
    try {
      const [ordersData, tablesData, zonesData] = await Promise.all([
        ordersApi.listActiveOrders(),
        tablesApi.listTables(),
        tablesApi.listZones(),
      ]);
      setOrders(ordersData);
      setTables(tablesData);
      setZones(zonesData);
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error de sincronización',
        message: error instanceof Error ? error.message : 'No se pudo conectar con el servidor',
      });
    } finally {
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const ordersChannel = pusherClient.subscribe('orders-channel');
    const tablesChannel = pusherClient.subscribe('tables-channel');
    const handleRefresh = () => loadData(true);

    ordersChannel.bind('order-updated', handleRefresh);
    tablesChannel.bind('table-order-updated', handleRefresh);
    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleRefresh);

    return () => {
      ordersChannel.unbind_all();
      tablesChannel.unbind_all();
      pusherClient.unsubscribe('orders-channel');
      pusherClient.unsubscribe('tables-channel');
      window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleRefresh);
    };
  }, [loadData]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => 
      activeTab === 'activos' ? !isCompletedOrder(order) : isCompletedOrder(order)
    );
  }, [activeTab, orders]);

  const stats = useMemo(() => ({
    total: orders.length,
    ready: orders.filter(o => o.estado === 'LISTO').length,
    delivered: orders.filter(o => o.estado === 'ENTREGADO').length
  }), [orders]);

  const handleChangeOrderStatus = async (tableId: number, status: TableOrderStatus) => {
    setBusyTableId(tableId);
    try {
      const orderToUpdate = orders.find(o => o.tableId === tableId && !isCompletedOrder(o));
      if (orderToUpdate) {
        await ordersApi.updateOrderStatus(orderToUpdate.id, status, tableId, user.id);
      }
      await tablesApi.updateStatus(tableId, 'OCUPADA');
      await loadData(true);
      setFeedback({ type: 'success', title: 'Estado actualizado', message: `Pedido en estado: ${getOrderStatusLabel(status)}` });
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo actualizar el estado.' });
    } finally {
      setBusyTableId(null);
    }
  };

  const handleRequestBill = async (tableId: number) => {
    setBusyTableId(tableId);
    try {
      await tablesApi.updateStatus(tableId, 'CUENTA_SOLICITADA');
      await loadData(true);
      setFeedback({ type: 'success', title: 'Cuenta enviada', message: 'Mesa lista para facturación en caja.' });
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo solicitar la cuenta.' });
    } finally {
      setBusyTableId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8 font-sans">
      <div className="mx-auto w-full max-w-5xl">
        <button onClick={onBack} className="mb-4 text-[28px] text-text hover:opacity-70 transition-opacity">☰</button>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Mis pedidos</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            mesero {user.nombre}, aquí ves los pedidos tomados, listos para entregar y completados.
          </p>
        </header>

        {/* Resumen de estadísticas idéntico al deploy */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-primary">{stats.total}</p>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Pedidos</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-info">{stats.ready}</p>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Listos</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-success">{stats.delivered}</p>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Entregados</p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="mb-6 flex gap-2 rounded-2xl bg-white/60 p-1 shadow-sm w-fit">
          {(['activos', 'completados'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-6 py-2 text-[12px] font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-text shadow-sm' : 'text-gray-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 animate-pulse">Sincronizando con el servidor...</div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-gray-400">No hay pedidos registrados en esta sección.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleOrders.map((order) => {
              const table = tableById[order.tableId];
              const zoneName = zones.find(z => z.id === table?.zoneId)?.nombre || 'Sin zona';
              const isBillRequested = table?.estado === 'CUENTA_SOLICITADA';
              const isBusy = busyTableId === order.tableId;

              return (
                <article key={order.id} className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-50 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-[18px] font-bold">Mesa {table?.numero ?? order.tableId}</h2>
                      <p className="mt-1 text-[12px] font-medium text-gray-500 line-clamp-1">
                        #{order.id} · {order.customer.nombre} · {formatTime(order.fechaCreacion)}
                      </p>
                      {/* Distinción de origen: Si no hay mesero asignado o el ID coincide con el cliente, es un pedido de cliente */}
                      <p className="text-[10px] font-bold text-primary uppercase mt-0.5">
                        {order.waiterName ? `MESERO: ${order.waiterName}` : 'PEDIDO DE CLIENTE'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${isBillRequested ? 'bg-info/10 text-info' : getStatusBadgeClass(order.estado)}`}>
                      {isBillRequested ? 'CUENTA SOLICITADA' : getOrderStatusLabel(order.estado)}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-3">
                    {zoneName}
                  </div>

                  <div className="flex gap-2 mb-5">
                    <div className="flex-1 rounded-xl bg-background p-2 text-center">
                      <p className="text-[14px] font-bold">{order.items.length}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Elementos</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-background p-2 text-center">
                      <p className="text-[14px] font-bold">{order.tiempoEstimadoMinutos} min</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Tiempo</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-background p-2 text-center">
                      <p className="text-[14px] font-bold text-primary">{formatCurrency(order.total)}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Total</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <button 
                      onClick={() => onOpenOrder(order.tableId)} 
                      className="w-full rounded-xl border border-primary py-3 text-[13px] font-bold text-primary hover:bg-primary/5 transition-colors"
                    >
                      Gestionar pedido
                    </button>

                    {order.estado === 'REGISTRADO' && (
                      <button 
                        onClick={() => void handleChangeOrderStatus(order.tableId, 'EN_PREPARACION')}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-primary py-3 text-[13px] font-bold text-white shadow-md disabled:opacity-50"
                      >
                        Enviar a cocina
                      </button>
                    )}

                    {(order.estado === 'LISTO' || order.estado === 'EN_CAMINO') && (
                      <button 
                        onClick={() => void handleChangeOrderStatus(order.tableId, 'ENTREGADO')}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-success py-3 text-[13px] font-bold text-white shadow-md disabled:opacity-50"
                      >
                        Confirmar entrega
                      </button>
                    )}

                    {order.estado === 'ENTREGADO' && !isBillRequested && (
                      <button 
                        onClick={() => void handleRequestBill(order.tableId)}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-process py-3 text-[13px] font-bold text-white shadow-md"
                      >
                        Solicitar cuenta
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <FeedbackModal 
        open={Boolean(feedback)} 
        title={feedback?.title ?? ''} 
        message={feedback?.message ?? ''} 
        type={feedback?.type ?? 'info'} 
        onClose={() => setFeedback(null)} 
      />
    </main>
  );
}