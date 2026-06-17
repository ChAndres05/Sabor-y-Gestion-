// frontend/src/modules/cliente/ClientOrdersPage.tsx
// Refactorización: Se añade escucha de tables-channel para no perder eventos de estado de cocina o mesero.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import type { AuthUser } from '../auth/types/auth.types';
import type { TableOrderStatus } from '../tables/types/table-order.types';
import ClientLayout from '../../components/client/ClientLayout';
import OrderTrackingMap from '../../components/client/OrderTrackingMap';
import { ordersApi } from '../../shared/api/orders.api';
import { orderFlow, deliveryFlow } from '../../shared/mocks/delivery.mock';
import { pusherClient } from '../../shared/utils/pusher';
import type { ClientNavigationKey, ClientOrder, ClientOrderStep, ClientOrderItem } from '../../shared/types/client-flow.types';

interface ClientOrdersPageProps {
  user: AuthUser;
  onLogout: () => void;
  onNavigate: (screen: ClientNavigationKey) => void;
  onBack?: () => void;
  onManageOrder?: (tableId: number) => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type OrdersTab = 'active' | 'history';



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
    timeZone: 'UTC', // Mostrar la hora de Bolivia tal como se guardó en UTC
  }).format(new Date(value));
}



function buildSteps(status: TableOrderStatus, isDelivery: boolean): ClientOrderStep[] {
  const flow = isDelivery ? deliveryFlow : orderFlow;
  const activeIndex = flow.findIndex((step) => step.key === status);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  return flow.map((step, index) => ({
    ...step,
    completed: status === 'CANCELADO' ? false : index <= safeActiveIndex,
  }));
}

export default function ClientOrdersPage({ user, onLogout, onNavigate, onBack, onManageOrder }: ClientOrdersPageProps) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrdersTab>('active');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [invoiceModalOrder, setInvoiceModalOrder] = useState<ClientOrder | null>(null);
  const [nit, setNit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [email, setEmail] = useState('');

  const [requestedInvoices, setRequestedInvoices] = useState<Record<number, { nit: string; razonSocial: string; email?: string }>>(() => {
    try {
      const saved = localStorage.getItem('client_requested_invoices');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('client_requested_invoices', JSON.stringify(requestedInvoices));
  }, [requestedInvoices]);

  const handleOpenInvoiceModal = useCallback((order: ClientOrder) => {
    setInvoiceModalOrder(order);
    setNit(user.ci ? String(user.ci) : '');
    setRazonSocial(`${user.nombre} ${user.apellido}`.trim());
    setEmail(user.correo || '');
  }, [user]);

  const handleRequestInvoiceSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalOrder) return;

    try {
      await ordersApi.requestInvoice(invoiceModalOrder.id, {
        nit,
        razonSocial,
        email: email || undefined,
        userId: user.id,
      });

      setRequestedInvoices((prev) => ({
        ...prev,
        [invoiceModalOrder.id]: {
          nit,
          razonSocial,
          email,
        },
      }));

      setInvoiceModalOrder(null);
      setFeedback({
        type: 'success',
        title: 'Factura Solicitada',
        message: `La factura para el pedido ${invoiceModalOrder.orderNumber} ha sido solicitada con éxito a nombre de "${razonSocial}".`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Error al solicitar factura',
        message: err instanceof Error ? err.message : 'No se pudo procesar la solicitud en el servidor.',
      });
    }
  }, [invoiceModalOrder, nit, razonSocial, email, user.id]);

  const loadOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const data = await ordersApi.listOrdersByClient(user.id);
      setOrders(data);

      // Sincronizar facturas solicitadas desde la base de datos
      const syncRequests: Record<number, { nit: string; razonSocial: string; email?: string }> = {};
      data.forEach((order) => {
        const requested = order.facturas?.find(f => f.estado_documento === 'SOLICITADA' || f.estado_documento === 'EMITIDA');
        if (requested) {
          const obs = requested.observaciones || '';
          const nameMatch = obs.match(/Facturado a:\s*(.*?)(?:, CI\/NIT:|$)/);
          const nitMatch = obs.match(/CI\/NIT:\s*([^\s-]*)/);
          const emailMatch = obs.match(/Correo:\s*([^\s-]*)/);

          syncRequests[order.id] = {
            nit: nitMatch ? nitMatch[1].trim() : '',
            razonSocial: nameMatch ? nameMatch[1].trim() : '',
            email: emailMatch ? emailMatch[1].trim() : '',
          };
        }
      });

      if (Object.keys(syncRequests).length > 0) {
        setRequestedInvoices((prev) => ({
          ...prev,
          ...syncRequests
        }));
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudieron cargar pedidos',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void loadOrders();

    const ordersChannel = pusherClient.subscribe('orders-channel');
    const tablesChannel = pusherClient.subscribe('tables-channel');
    const cocinaChannel = pusherClient.subscribe('cocina-channel');

    const handleUpdate = () => {
      void loadOrders(true);
    };

    ordersChannel.bind('order-updated', handleUpdate);
    tablesChannel.bind('table-order-updated', handleUpdate);
    cocinaChannel.bind('pedido-actualizado', handleUpdate);
    cocinaChannel.bind('detalle-actualizado', handleUpdate);
    cocinaChannel.bind('pedido-armado', handleUpdate);
    window.addEventListener('restaurant-state-changed', handleUpdate);

    return () => {
      ordersChannel.unbind_all();
      tablesChannel.unbind_all();
      cocinaChannel.unbind_all();
      pusherClient.unsubscribe('orders-channel');
      pusherClient.unsubscribe('tables-channel');
      pusherClient.unsubscribe('cocina-channel');
      window.removeEventListener('restaurant-state-changed', handleUpdate);
    };
  }, [loadOrders]);

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
      <div className="flex flex-col">
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

        <div className="mt-4">
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
                const steps = buildSteps(order.status, order.source === 'DELIVERY');

                return (
                  <article key={order.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[20px] font-bold text-text">Pedido {order.orderNumber}</p>
                        <p className="mt-1 text-[13px] font-medium text-gray-500">
                          {order.source === 'DELIVERY'
                            ? '🛵 Pedido a domicilio (Delivery)'
                            : order.source === 'MESA_MESERO'
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
                      {order.source === 'DELIVERY' && (
                        <>
                          <p className="text-[12px] truncate">📍 Dirección: {order.deliveryAddress}</p>
                          <p className="text-[12px]">📞 Teléfono: {order.deliveryPhone}</p>
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 min-w-[120px] rounded-2xl bg-white border border-primary px-4 py-2 text-[13px] font-bold text-primary transition-colors hover:bg-black/5"
                      >
                        Ver detalle
                      </button>

                      {order.status !== 'CANCELADO' && (
                        requestedInvoices[order.id] ? (
                          <button
                            type="button"
                            disabled
                            className="flex-1 min-w-[120px] rounded-2xl bg-gray-100 border border-gray-300 px-4 py-2 text-[13px] font-bold text-gray-400 cursor-not-allowed"
                          >
                            Factura Solicitada
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenInvoiceModal(order)}
                            className="flex-1 min-w-[120px] rounded-2xl bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
                          >
                            Solicitar factura
                          </button>
                        )
                      )}
                      
                      {onManageOrder && order.tableNumber && ['REGISTRADO', 'EN_PREPARACION', 'LISTO'].includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => onManageOrder(Number(order.tableNumber))}
                          className="flex-1 min-w-[120px] rounded-2xl bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
                        >
                          {order.status === 'REGISTRADO' ? 'Añadir platos' : '+ Nuevo pedido'}
                        </button>
                      )}
                    </div>
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
              {selectedOrder.items.map((item: ClientOrderItem) => (
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

            {selectedOrder.source === 'DELIVERY' ? (
              <>
                <OrderTrackingMap orderId={selectedOrder.id} status={selectedOrder.status} />
                <div className="mt-4 rounded-2xl bg-primary/10 p-4 text-[13px] leading-5 text-primary">
                  <p className="font-bold mb-1">Detalles de Entrega (Delivery)</p>
                  <p><strong>Dirección:</strong> {selectedOrder.deliveryAddress}</p>
                  <p className="mt-1"><strong>Teléfono:</strong> {selectedOrder.deliveryPhone}</p>
                  {selectedOrder.paymentMethod && (
                    <p className="mt-1">
                      <strong>Pago:</strong> {selectedOrder.paymentMethod === 'QR' ? '📱 QR / Transferencia' : '💵 Efectivo'}
                      {selectedOrder.paymentReference && ` (Ref: ${selectedOrder.paymentReference})`}
                    </p>
                  )}
                  {selectedOrder.notes && (
                    <p className="mt-1"><strong>Notas:</strong> {selectedOrder.notes}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-info/10 p-4 text-[13px] leading-5 text-info">
                {selectedOrder.source === 'MESA_MESERO'
                  ? 'Este pedido representa el flujo real esperado: mesero registra, cocina cambia estado y cliente visualiza el avance.'
                  : 'Este pedido representa el flujo futuro de pedido asociado a reserva, con preparación sugerida antes de la hora reservada.'}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-[16px] font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(selectedOrder.total)}</span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 rounded-2xl bg-white border border-gray-300 px-4 py-3 text-[14px] font-bold text-text transition-colors hover:bg-black/5"
              >
                Cerrar
              </button>

              {selectedOrder.status !== 'CANCELADO' && (
                requestedInvoices[selectedOrder.id] ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 rounded-2xl bg-gray-100 border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-400 cursor-not-allowed"
                  >
                    Factura Solicitada
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenInvoiceModal(selectedOrder);
                    }}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
                  >
                    Solicitar factura
                  </button>
                )
              )}

              {!['ENTREGADO', 'PAGADO', 'CANCELADO'].includes(selectedOrder.status) && onManageOrder && selectedOrder.tableNumber && (
                <button
                  type="button"
                  onClick={() => {
                    onManageOrder(Number(selectedOrder.tableNumber));
                    setSelectedOrder(null);
                  }}
                  className="flex-1 rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Añadir platos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {invoiceModalOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-xl">
            <h2 className="text-[20px] font-bold text-text">Solicitar Factura</h2>
            <p className="mt-1 text-[13px] text-gray-500">
              Pedido {invoiceModalOrder.orderNumber} · Total: {formatCurrency(invoiceModalOrder.total)}
            </p>

            <form onSubmit={handleRequestInvoiceSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1">NIT / CI *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1234567"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1">Correo Electrónico (opcional)</label>
                <input
                  type="email"
                  placeholder="Ej. correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceModalOrder(null)}
                  className="w-full rounded-2xl bg-white border border-gray-300 px-4 py-3 text-[14px] font-bold text-text transition-colors hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Confirmar Solicitud
                </button>
              </div>
            </form>
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
