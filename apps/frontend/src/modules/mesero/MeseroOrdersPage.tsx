import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import {
  listWaiterOrdersMock,
  requestBillForTableMock,
  updateOrderStatusForTableMock,
} from '../../shared/mocks/table-orders.mock';
import { listTablesMock, updateTableStatusMock } from '../../shared/mocks/tables.mock';
import type { AuthUser } from '../auth/types/auth.types';
import type { RestaurantTable } from '../tables/types/table.types';
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getOrderStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'Registrado';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo para entregar';
    case 'EN_CAMINO':
      return 'En camino';
    case 'ENTREGADO':
      return 'Pedido completado';
    case 'PAGADO':
      return 'Pagado';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

function getStatusBadgeClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'bg-process/10 text-process';
    case 'EN_PREPARACION':
      return 'bg-alert/10 text-alert';
    case 'LISTO':
    case 'EN_CAMINO':
      return 'bg-info/10 text-info';
    case 'ENTREGADO':
    case 'PAGADO':
      return 'bg-success/10 text-success';
    case 'CANCELADO':
      return 'bg-gray-200 text-gray-600';
  }
}

function isCompletedOrder(order: TableOrder) {
  return order.estado === 'ENTREGADO' || order.estado === 'PAGADO';
}

export default function MeseroOrdersPage({
  user,
  onBack,
  onOpenOrder,
}: MeseroOrdersPageProps) {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
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

  const visibleOrders = useMemo(() => {
    return orders.filter((order) =>
      activeTab === 'activos' ? !isCompletedOrder(order) : isCompletedOrder(order)
    );
  }, [activeTab, orders]);

  const readyCount = orders.filter((order) => order.estado === 'LISTO').length;
  const completedCount = orders.filter(isCompletedOrder).length;

  const loadOrders = async () => {
    setIsLoading(true);

    try {
      const [ordersData, tablesData] = await Promise.all([
        listWaiterOrdersMock(),
        listTablesMock(),
      ]);
      setOrders(ordersData);
      setTables(tablesData);
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudieron cargar pedidos',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const handleChangeOrderStatus = async (tableId: number, status: TableOrderStatus) => {
    setBusyTableId(tableId);

    try {
      await updateOrderStatusForTableMock(tableId, status);
      await updateTableStatusMock(tableId, 'OCUPADA');
      await loadOrders();
      setFeedback({
        type: 'success',
        title: 'Estado actualizado',
        message: `El pedido quedó ${getOrderStatusLabel(status).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo actualizar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setBusyTableId(null);
    }
  };

  const handleRequestBill = async (tableId: number) => {
    setBusyTableId(tableId);

    try {
      await requestBillForTableMock(tableId);
      await updateTableStatusMock(tableId, 'CUENTA_SOLICITADA');
      await loadOrders();
      setFeedback({
        type: 'success',
        title: 'Cuenta solicitada',
        message: 'La mesa quedó lista para caja.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo solicitar cuenta',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setBusyTableId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-[28px] leading-none text-text"
          aria-label="Volver al menú del mesero"
        >
          ☰
        </button>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Mis pedidos</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            {user.nombre}, aquí ves los pedidos tomados, listos para entregar y completados.
          </p>
        </header>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-primary">{orders.length}</p>
            <p className="text-[11px] font-bold text-gray-500">Pedidos</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-info">{readyCount}</p>
            <p className="text-[11px] font-bold text-gray-500">Listos</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-success">{completedCount}</p>
            <p className="text-[11px] font-bold text-gray-500">Entregados</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-white/60 p-1 shadow-sm md:w-max">
          <div className="grid grid-cols-2 gap-1 md:flex md:gap-2">
            {(['activos', 'completados'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 md:px-6 text-[12px] font-bold capitalize transition-colors ${activeTab === tab ? 'bg-white text-text shadow-sm' : 'text-gray-500 hover:bg-white/40'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white p-5 text-[14px] text-gray-500 shadow-sm">
            Cargando pedidos...
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm">
            <p className="text-[15px] font-bold text-text">No hay pedidos en esta lista</p>
            <p className="mt-2 text-[13px] leading-5 text-gray-500">
              Cuando tomes pedidos desde mesas aparecerán aquí para darles seguimiento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleOrders.map((order) => {
              const table = tableById[order.tableId];
              const billRequested = table?.estado === 'CUENTA_SOLICITADA';
              const isBusy = busyTableId === order.tableId;

              return (
                <article key={order.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold text-text">Mesa {table?.numero ?? order.tableId}</h2>
                      <p className="mt-1 text-[12px] font-medium text-gray-500">
                        #{order.id} · {order.customer.nombre} · {formatTime(order.fechaCreacion)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${billRequested ? 'bg-info/10 text-info' : getStatusBadgeClass(order.estado)}`}>
                      {billRequested ? 'Cuenta solicitada' : getOrderStatusLabel(order.estado)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background p-2">
                      <p className="text-[13px] font-bold text-text">{order.items.length}</p>
                      <p className="text-[10px] font-bold text-gray-500">Items</p>
                    </div>
                    <div className="rounded-xl bg-background p-2">
                      <p className="text-[13px] font-bold text-text">{order.tiempoEstimadoMinutos} min</p>
                      <p className="text-[10px] font-bold text-gray-500">Tiempo</p>
                    </div>
                    <div className="rounded-xl bg-background p-2">
                      <p className="text-[13px] font-bold text-primary">{formatCurrency(order.total)}</p>
                      <p className="text-[10px] font-bold text-gray-500">Total</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => onOpenOrder(order.tableId)}
                      className="w-full rounded-xl border border-primary px-4 py-3 text-[13px] font-bold text-primary"
                    >
                      Gestionar pedido
                    </button>

                    {order.estado === 'REGISTRADO' && (
                      <button
                        type="button"
                        onClick={() => void handleChangeOrderStatus(order.tableId, 'EN_PREPARACION')}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                      >
                        Enviar a cocina
                      </button>
                    )}

                    {order.estado === 'EN_PREPARACION' && (
                      <button
                        type="button"
                        onClick={() => void handleChangeOrderStatus(order.tableId, 'LISTO')}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-info px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                      >
                        Simular cocina: listo para entregar
                      </button>
                    )}

                    {(order.estado === 'LISTO' || order.estado === 'EN_CAMINO') && (
                      <button
                        type="button"
                        onClick={() => void handleChangeOrderStatus(order.tableId, 'ENTREGADO')}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-success px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                      >
                        Marcar entregado en mesa
                      </button>
                    )}

                    {order.estado === 'ENTREGADO' && !billRequested && (
                      <button
                        type="button"
                        onClick={() => void handleRequestBill(order.tableId)}
                        disabled={isBusy}
                        className="w-full rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
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
