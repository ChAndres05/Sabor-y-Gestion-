import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import type { AuthUser } from '../auth/types/auth.types';
import type { TableOrderStatus } from '../tables/types/table-order.types';
import ClientLayout from './components/ClientLayout';
import { clientFlowApi } from './api/client-flow.api';
import type { ClientNavigationKey, ClientOrder, ClientOrderStep } from './types/client-flow.types';

interface ClientOrdersPageProps {
  user: AuthUser;
  onLogout: () => void;
  onNavigate: (screen: ClientNavigationKey) => void;
  onBack?: () => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type OrdersTab = 'active' | 'history';

const orderFlow: Array<{ key: TableOrderStatus; label: string }> = [
  { key: 'REGISTRADO', label: 'Recibido' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO', label: 'Listo' },
  { key: 'ENTREGADO', label: 'Entregado' },
  { key: 'PAGADO', label: 'Finalizado' },
];

function getStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'Recibido';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo';
    case 'EN_CAMINO':
      return 'En camino';
    case 'ENTREGADO':
      return 'Entregado';
    case 'PAGADO':
      return 'Pagado / Finalizado';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

function getStatusClass(status: TableOrderStatus) {
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

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildSteps(status: TableOrderStatus): ClientOrderStep[] {
  const activeIndex = orderFlow.findIndex((step) => step.key === status);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  return orderFlow.map((step, index) => ({
    ...step,
    completed: status === 'CANCELADO' ? false : index <= safeActiveIndex,
  }));
}

export default function ClientOrdersPage({ user, onLogout, onNavigate, onBack }: ClientOrdersPageProps) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrdersTab>('active');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await clientFlowApi.listOrders(user.id);
      setOrders(data);
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
  }, [user.id]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !['PAGADO', 'CANCELADO'].includes(order.status)),
    [orders]
  );

  const historyOrders = useMemo(
    () => orders.filter((order) => ['PAGADO', 'CANCELADO'].includes(order.status)),
    [orders]
  );

  const visibleOrders = activeTab === 'active' ? activeOrders : historyOrders;

  return (
    <ClientLayout
      user={user}
      active="orders"
      title="Mis pedidos"
      subtitle="Seguimiento de pedidos asociados al cliente registrado. Los pedidos de cliente no registrado no se muestran aquí."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 rounded-[1.5rem] bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors ${
                activeTab === 'active' ? 'bg-primary text-white' : 'text-text hover:bg-black/5'
              }`}
            >
              Activos ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors ${
                activeTab === 'history' ? 'bg-primary text-white' : 'text-text hover:bg-black/5'
              }`}
            >
              Historial ({historyOrders.length})
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando pedidos...
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">
                {activeTab === 'active' ? 'No tienes pedidos activos' : 'No hay historial de pedidos'}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">
                Cuando un mesero registre un pedido con tu usuario cliente, aparecerá en esta vista.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('menu')}
                className="mt-4 rounded-2xl bg-primary px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Ver menú
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleOrders.map((order) => {
                const steps = buildSteps(order.status);

                return (
                  <article key={order.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[20px] font-bold text-text">Pedido {order.orderNumber}</p>
                        <p className="mt-1 text-[13px] font-medium text-gray-500">
                          {order.source === 'MESA_MESERO'
                            ? `Mesa ${order.tableNumber ?? '-'}`
                            : `Pedido de reserva · Mesa ${order.tableNumber ?? '-'}`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[12px] font-bold ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-background p-3">
                      <div className="grid grid-cols-5 gap-1">
                        {steps.map((step) => (
                          <div key={step.key} className="text-center">
                            <div
                              className={`mx-auto h-3 w-3 rounded-full ${
                                step.completed ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            />
                            <p className="mt-2 text-[10px] font-bold leading-3 text-gray-600">
                              {step.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-[14px] text-gray-600">
                      <p>Productos: {order.items.length}</p>
                      <p>Tiempo aproximado: {order.estimatedMinutes} min</p>
                      <p>Total: <strong>{formatCurrency(order.total)}</strong></p>
                      {order.reservationTime && <p>Hora de reserva: {order.reservationTime}</p>}
                      {order.prepareFrom && <p>Preparar desde: {order.prepareFrom}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="mt-4 rounded-2xl bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
                    >
                      Ver detalle
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-bold text-text">Pedido {selectedOrder.orderNumber}</h2>
                <p className="mt-1 text-[14px] text-gray-500">
                  Creado: {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[12px] font-bold ${getStatusClass(
                  selectedOrder.status
                )}`}
              >
                {getStatusLabel(selectedOrder.status)}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-text">
                        {item.quantity} x {item.name}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-[12px] leading-4 text-gray-500">Notas: {item.notes}</p>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-primary">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-info/10 p-4 text-[13px] leading-5 text-info">
              {selectedOrder.source === 'MESA_MESERO'
                ? 'Este pedido representa el flujo real esperado: mesero registra, cocina cambia estado y cliente visualiza el avance.'
                : 'Este pedido representa el flujo futuro de pedido asociado a reserva, con preparación sugerida antes de la hora reservada.'}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-[16px] font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(selectedOrder.total)}</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <FeedbackModal
        open={Boolean(feedback)}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        type={feedback?.type ?? 'info'}
        onClose={() => setFeedback(null)}
      />
    </ClientLayout>
  );
}
