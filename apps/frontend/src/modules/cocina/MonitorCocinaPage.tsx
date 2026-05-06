import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../../shared/api/orders.api';
import { cocinaApi } from './api/cocina.api';
import { pusherClient } from '../../shared/utils/pusher';
import {
  RESTAURANT_STATE_CHANGED_EVENT,
  RESTAURANT_STATE_CHANGED_STORAGE_KEY,
} from '../../shared/utils/events';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  checked: boolean;
  notes: string | null;
}

interface Order {
  id: number;
  orderNumber: number;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready';
  isToggled: boolean;
  source?: 'mesa' | 'reserva';
  tableNumber?: number;
  customerName?: string;
  reservationTime?: string;
  prepareFrom?: string;
}

interface MonitorCocinaPageProps {
  onBack: () => void;
  user?: { id?: number; id_usuario?: number; nombre: string; rol: string };
}

export default function MonitorCocinaPage({ onBack, user }: MonitorCocinaPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
  );

  // Reloj en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await ordersApi.listKitchenOrders();

      // Recuperar estados de check de localStorage
      const checkedData = JSON.parse(
        localStorage.getItem('gestionysabor_kitchen_checked_items') || '{}'
      );

      setOrders((prevOrders) =>
        data.map((backendOrder) => {
          const existingOrder = prevOrders.find((o) => o.id === backendOrder.id);
          return {
            ...backendOrder,
            isToggled: existingOrder ? existingOrder.isToggled : false,
            items: backendOrder.items.map((item) => ({
              ...item,
              checked: checkedData[`${backendOrder.id}-${item.name}`] ?? false,
            })),
          };
        })
      );
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial + eventos de cambio de estado del restaurante
  useEffect(() => {
    void loadOrders();

    const handleStateChange = () => void loadOrders();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESTAURANT_STATE_CHANGED_STORAGE_KEY) {
        handleStateChange();
      }
    };

    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadOrders]);

  // Pusher: tiempo real
  useEffect(() => {
    const channel = pusherClient.subscribe('cocina-channel');
    channel.bind('nuevo-pedido', () => void loadOrders());
    channel.bind('pedido-actualizado', () => void loadOrders());
    channel.bind('detalle-actualizado', () => void loadOrders());
    channel.bind('pedido-armado', () => void loadOrders());

    return () => {
      pusherClient.unsubscribe('cocina-channel');
    };
  }, [loadOrders]);

  // Actualizar estado en BD
  const updateBackendStatus = async (id: number, nuevoEstado: string) => {
    try {
      await ordersApi.updateOrderStatus(id, nuevoEstado, user?.id_usuario ?? user?.id ?? 0);
    } catch (error) {
      console.error('Error actualizando estado en BD:', error);
    }
  };

  // Toggle del botón de armado (toggle/switch)
  const toggleOrder = async (id: number) => {
    const orderToToggle = orders.find((o) => o.id === id);
    const newToggledState = orderToToggle ? !orderToToggle.isToggled : false;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, isToggled: !order.isToggled } : order
      )
    );

    if (orderToToggle) {
      try {
        await cocinaApi.actualizarEstadoArmado(id, newToggledState);
      } catch (error) {
        console.error('Error al actualizar armado en BD:', error);
      }
    }
  };

  // Toggle de ítem individual
  const toggleItemChecked = async (orderId: number, itemIndex: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === 'ready') return;

    const item = order.items[itemIndex];
    const newChecked = !item.checked;

    // Persistir en localStorage
    const checkedData = JSON.parse(
      localStorage.getItem('gestionysabor_kitchen_checked_items') || '{}'
    );
    if (newChecked) {
      checkedData[`${orderId}-${item.name}`] = true;
    } else {
      delete checkedData[`${orderId}-${item.name}`];
    }
    localStorage.setItem('gestionysabor_kitchen_checked_items', JSON.stringify(checkedData));

    // Notificar al backend sobre el detalle
    try {
      await cocinaApi.marcarPlatoPreparado(item.id, newChecked);
    } catch (error) {
      console.error('Error al actualizar el detalle del plato en BD:', error);
    }

    // Actualizar estado local y status del pedido
    setOrders((prevOrders) => {
      let needsStatusUpdate = false;
      let newStatus: Order['status'] = order.status;

      const newOrders = prevOrders.map((o) => {
        if (o.id !== orderId || o.status === 'ready') return o;

        const updatedItems = o.items.map((it, idx) =>
          idx === itemIndex ? { ...it, checked: newChecked } : it
        );

        const hasCheckedItem = updatedItems.some((it) => it.checked);

        if (hasCheckedItem && o.status === 'pending') {
          newStatus = 'preparing';
          needsStatusUpdate = true;
        } else if (!hasCheckedItem && o.status === 'preparing') {
          newStatus = 'pending';
          needsStatusUpdate = true;
        } else {
          newStatus = o.status;
        }

        return { ...o, items: updatedItems, status: newStatus };
      });

      if (needsStatusUpdate) {
        void updateBackendStatus(
          orderId,
          newStatus === 'preparing' ? 'EN_PREPARACION' : 'REGISTRADO'
        );
      }

      return newOrders;
    });
  };

  // Marcar pedido como listo
  const setReady = async (id: number) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status: 'ready' } : order))
    );
    await updateBackendStatus(id, 'LISTO');
  };

  // Contadores
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const reservationCount = orders.filter((o) => o.source === 'reserva').length;

  if (isLoading) {
    return (
      <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC] flex items-center justify-center">
        <p className="text-xl font-bold">Cargando monitor de cocina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC]">
      {/* Header */}
      <div className="mb-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-xl hover:bg-black/5 transition-colors text-[#1c1c1c]"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">
                Monitor de Cocina
              </h1>
            </div>
            <p className="text-[#8c8c8c] text-sm sm:text-[15px] font-medium sm:ml-12">
              Pedidos pendientes ordenados por antigüedad
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-[24px] p-4 sm:p-5 shadow-sm mb-8 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-4 sm:gap-5 text-[11px] font-black tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#ef4444]" />
            <span>{pendingCount} PENDIENTES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#eab308]" />
            <span>{preparingCount} EN PREPARACIÓN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#22c55e]" />
            <span>{readyCount} LISTOS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#4A7DA8]" />
            <span>{reservationCount} DE RESERVA</span>
          </div>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-[#9ca3af] text-sm font-medium">
          <span className="hidden sm:inline">{currentTime}</span>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border-2 border-black bg-[#F2E9DC] rounded-[20px] p-5 flex flex-col justify-between min-h-[240px] shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black w-14 leading-[1.1] tracking-wide text-[#1c1c1c]">
                  NÚMERO DE ORDEN
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-black px-2 py-1 rounded-[6px] text-white uppercase tracking-widest ${
                      order.status === 'ready'
                        ? 'bg-[#22c55e]'
                        : order.status === 'preparing'
                        ? 'bg-[#eab308]'
                        : 'bg-[#ef4444]'
                    }`}
                  >
                    {order.status === 'ready'
                      ? 'Listo'
                      : order.status === 'preparing'
                      ? 'Preparando'
                      : 'Pendiente'}
                  </span>
                  <span className="text-[22px] font-bold border-2 border-black rounded-[12px] w-12 h-10 flex items-center justify-center text-[#1c1c1c] bg-[#F2E9DC]">
                    {order.orderNumber}
                  </span>
                </div>
              </div>

              {order.source === 'reserva' && (
                <div className="mb-4 rounded-[12px] border-2 border-[#4A7DA8] bg-white p-3 text-[11px] font-bold leading-4 text-[#1c1c1c]">
                  <p>PEDIDO DE RESERVA</p>
                  <p>Mesa: {order.tableNumber} · Cliente: {order.customerName}</p>
                  <p>Hora reserva: {order.reservationTime} · Preparar desde: {order.prepareFrom}</p>
                </div>
              )}

              <ul className="space-y-3 mb-6">
                {order.items.map((item, idx) => (
                  <li
                    key={idx}
                    className={`flex justify-between items-start group ${
                      order.status === 'ready' ? 'cursor-default' : 'cursor-pointer'
                    }`}
                    onClick={() => order.status !== 'ready' && void toggleItemChecked(order.id, idx)}
                  >
                    <div className="flex flex-col pr-2">
                      <span
                        className={`text-[15px] font-bold transition-colors ${
                          item.checked ? 'text-[#8c8c8c] line-through' : 'text-[#1c1c1c]'
                        }`}
                      >
                        {item.quantity} {item.name}
                      </span>
                      {item.notes && (
                        <span
                          className={`text-[12px] italic mt-0.5 ${
                            item.checked ? 'text-[#8c8c8c] line-through' : 'text-[#ef4444]'
                          }`}
                        >
                          * {item.notes}
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-[18px] h-[18px] mt-1 rounded-full border-2 border-black flex shrink-0 items-center justify-center transition-colors ${
                        item.checked ? 'bg-transparent text-[#1c1c1c]' : 'bg-transparent text-transparent'
                      }`}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3 text-[#1c1c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center mt-auto pt-2">
              <button
                onClick={() => void toggleOrder(order.id)}
                disabled={order.status === 'ready' || !order.items.every((item) => item.checked)}
                className={`w-[46px] h-[24px] rounded-full flex items-center p-1 transition-colors ${
                  order.isToggled ? 'bg-[#182033]' : 'bg-[#a3aab8]'
                } ${
                  order.status === 'ready' || !order.items.every((item) => item.checked)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full bg-[#f2e9dc] shadow-sm transition-transform ${
                    order.isToggled ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>

              <button
                onClick={() => void setReady(order.id)}
                disabled={
                  order.status === 'ready' ||
                  !order.items.every((item) => item.checked) ||
                  !order.isToggled
                }
                className={`text-[11px] font-bold px-4 py-1.5 rounded-[8px] transition-colors border-2 ${
                  order.isToggled
                    ? 'bg-[#c25134] border-[#c25134] text-white shadow-sm'
                    : 'bg-white border-white text-[#c25134] shadow-sm'
                } ${
                  order.status === 'ready' ||
                  !order.items.every((item) => item.checked) ||
                  !order.isToggled
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                LISTO
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}