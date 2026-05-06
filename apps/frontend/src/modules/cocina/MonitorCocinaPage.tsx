import { useEffect, useState } from 'react';
import { ordersApi } from '../../shared/api/orders.api';
import {
  RESTAURANT_STATE_CHANGED_EVENT,
  RESTAURANT_STATE_CHANGED_STORAGE_KEY,
} from '../../shared/utils/events';
import type { KitchenOrder } from '../../shared/types/kitchen.types';

interface MonitorCocinaPageProps {
  onBack: () => void;
}

type KitchenOrderItemUI = KitchenOrder['items'][number] & {
  checked: boolean;
};

type KitchenOrderUI = Omit<KitchenOrder, 'items'> & {
  items: KitchenOrderItemUI[];
  isToggled: boolean;
};

type ApiOrderStatus = Parameters<typeof ordersApi.updateOrderStatus>[1];

const STATUS_EN_PREPARACION = 'EN_PREPARACION' as ApiOrderStatus;
const STATUS_LISTO = 'LISTO' as ApiOrderStatus;

const getTableNumber = (tableNumber: KitchenOrder['tableNumber']) => {
  return Number(tableNumber ?? 0);
};

export default function MonitorCocinaPage({ onBack }: MonitorCocinaPageProps) {
  const [orders, setOrders] = useState<KitchenOrderUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  const loadOrders = async () => {
    try {
      const data = await ordersApi.listKitchenOrders();

      const checkedData: Record<string, boolean> = JSON.parse(
        localStorage.getItem('gestionysabor_kitchen_checked_items') || '{}'
      );

      const hydrated: KitchenOrderUI[] = data.map((order) => ({
        ...order,
        isToggled: false,
        items: order.items.map((item) => ({
          ...item,
          checked: Boolean(checkedData[`${order.id}-${item.name}`]),
        })),
      }));

      setOrders(hydrated);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();

    const handleStateChange = () => {
      void loadOrders();
    };

    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 60000);

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
      clearInterval(timer);
    };
  }, []);

  const toggleOrder = (id: number) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === id
          ? {
              ...order,
              isToggled: !order.isToggled,
            }
          : order
      )
    );
  };

  const toggleItemChecked = async (orderId: number, itemIndex: number) => {
    const updatedOrders: KitchenOrderUI[] = orders.map((order) => {
      if (order.id !== orderId) {
        return order;
      }

      const newItems = order.items.map((item, index) => {
        if (index !== itemIndex) {
          return item;
        }

        const newChecked = !item.checked;

        const checkedData: Record<string, boolean> = JSON.parse(
          localStorage.getItem('gestionysabor_kitchen_checked_items') || '{}'
        );

        if (newChecked) {
          checkedData[`${orderId}-${item.name}`] = true;
        } else {
          delete checkedData[`${orderId}-${item.name}`];
        }

        localStorage.setItem(
          'gestionysabor_kitchen_checked_items',
          JSON.stringify(checkedData)
        );

        return {
          ...item,
          checked: newChecked,
        };
      });

      const isAnyChecked = newItems.some((item) => item.checked);
      const newStatus: KitchenOrderUI['status'] = isAnyChecked
        ? 'preparing'
        : 'pending';

      return {
        ...order,
        items: newItems,
        status: newStatus,
      };
    });

    setOrders(updatedOrders);

    try {
      const order = updatedOrders.find((item) => item.id === orderId);

      if (order && order.status === 'preparing') {
        await ordersApi.updateOrderStatus(
          orderId,
          STATUS_EN_PREPARACION,
          getTableNumber(order.tableNumber)
        );
      }
    } catch (error) {
      console.error('Error updating status from kitchen:', error);
    }
  };

  const setReady = async (id: number) => {
    try {
      const order = orders.find((item) => item.id === id);

      await ordersApi.updateOrderStatus(
        id,
        STATUS_LISTO,
        getTableNumber(order?.tableNumber)
      );

      await loadOrders();
    } catch (error) {
      console.error('Error setting order ready:', error);
    }
  };

  const pendingCount = orders.filter((order) => order.status === 'pending').length;
  const preparingCount = orders.filter(
    (order) => order.status === 'preparing'
  ).length;
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const reservationCount = orders.filter(
    (order) => order.source === 'reserva'
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC] flex items-center justify-center">
        <p className="text-xl font-bold">Cargando monitor de cocina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC]">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border-2 border-black bg-[#F2E9DC] rounded-[20px] p-5 flex flex-col justify-between min-h-[240px] shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black w-14 leading-[1.1] tracking-wide text-[#1c1c1c]">
                  NUMERO DE ORDEN
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
                  <p>
                    Mesa: {order.tableNumber} · Cliente: {order.customerName}
                  </p>
                  <p>
                    Hora reserva: {order.reservationTime} · Preparar desde:{' '}
                    {order.prepareFrom}
                  </p>
                </div>
              )}

              <ul className="space-y-3 mb-6">
                {order.items.map((item, index) => (
                  <li
                    key={item.id ?? `${order.id}-${index}`}
                    className={`flex justify-between items-center group ${
                      order.status === 'ready' ? 'cursor-default' : 'cursor-pointer'
                    }`}
                    onClick={() => {
                      if (order.status !== 'ready') {
                        void toggleItemChecked(order.id, index);
                      }
                    }}
                  >
                    <span
                      className={`text-[15px] font-bold transition-colors ${
                        item.checked
                          ? 'text-[#8c8c8c] line-through'
                          : 'text-[#1c1c1c]'
                      }`}
                    >
                      {item.quantity} {item.name}
                    </span>

                    <div
                      className={`w-[18px] h-[18px] rounded-full border-2 border-black flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-transparent text-[#1c1c1c]'
                          : 'bg-transparent text-transparent'
                      }`}
                    >
                      {item.checked && (
                        <svg
                          className="w-3 h-3 text-[#1c1c1c]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center mt-auto pt-2">
              <button
                onClick={() => toggleOrder(order.id)}
                disabled={
                  order.status === 'ready' ||
                  !order.items.every((item) => item.checked)
                }
                className={`w-[46px] h-[24px] rounded-full flex items-center p-1 transition-colors ${
                  order.isToggled ? 'bg-[#182033]' : 'bg-[#a3aab8]'
                } ${
                  order.status === 'ready' ||
                  !order.items.every((item) => item.checked)
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
                    ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit'
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
