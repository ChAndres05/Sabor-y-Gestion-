import { useState } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  checked: boolean;
}

interface Order {
  id: number;
  orderNumber: number;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready';
  isToggled: boolean;
}

const initialOrders: Order[] = [
  {
    id: 1,
    orderNumber: 1,
    items: [
      { name: 'piques', quantity: 2, checked: true },
      { name: 'mojito', quantity: 1, checked: true },
    ],
    status: 'pending',
    isToggled: false,
  },
  {
    id: 2,
    orderNumber: 16,
    items: [
      { name: 'piques', quantity: 2, checked: true },
      { name: 'mojito', quantity: 1, checked: true },
    ],
    status: 'pending',
    isToggled: false,
  },
  {
    id: 3,
    orderNumber: 3,
    items: [
      { name: 'piques', quantity: 2, checked: true },
      { name: 'mojito', quantity: 1, checked: true },
    ],
    status: 'preparing',
    isToggled: true,
  },
  {
    id: 4,
    orderNumber: 4,
    items: [
      { name: 'piques', quantity: 2, checked: true },
      { name: 'mojito', quantity: 1, checked: true },
    ],
    status: 'preparing',
    isToggled: true,
  },
  {
    id: 5,
    orderNumber: 5,
    items: [
      { name: 'piques', quantity: 2, checked: false },
      { name: 'mojito', quantity: 1, checked: false },
    ],
    status: 'pending',
    isToggled: false,
  },
  {
    id: 6,
    orderNumber: 2,
    items: [
      { name: 'piques', quantity: 2, checked: false },
      { name: 'mojito', quantity: 1, checked: false },
    ],
    status: 'pending',
    isToggled: false,
  },
];

interface MonitorCocinaPageProps {
  onBack: () => void;
}

export default function MonitorCocinaPage({ onBack }: MonitorCocinaPageProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const toggleOrder = (id: number) => {
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, isToggled: !order.isToggled } : order
      )
    );
  };

  const toggleItemChecked = (orderId: number, itemIndex: number) => {
    setOrders(
      orders.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item, idx) =>
          idx === itemIndex ? { ...item, checked: !item.checked } : item
        );

        const hasCheckedItem = updatedItems.some((item) => item.checked);
        let newStatus = order.status;
        
        if (hasCheckedItem && order.status === 'pending') {
          newStatus = 'preparing';
        } else if (!hasCheckedItem && order.status === 'preparing') {
          newStatus = 'pending';
        }

        return {
          ...order,
          items: updatedItems,
          status: newStatus,
        };
      })
    );
  };

  const setReady = (id: number) => {
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, status: 'ready' } : order
      )
    );
  };

  const pendingCount = 3;
  const preparingCount = 2;
  const readyCount = 4;

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC]">
      {/* Header */}
      <div className="mb-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-black/5 transition-colors text-[#1c1c1c]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
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
            <div className="w-[6px] h-[6px] rounded-full bg-[#ef4444]"></div>
            <span>{pendingCount} PENDIENTES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#eab308]"></div>
            <span>{preparingCount} EN PREPARACIÓN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-[#22c55e]"></div>
            <span>{readyCount} LISTOS</span>
          </div>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-[#9ca3af] text-sm font-medium">
          <span className="hidden sm:inline">09:44 p. m.</span>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border-2 border-black bg-[#F2E9DC] rounded-[20px] p-5 flex flex-col justify-between min-h-[240px] shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black w-14 leading-[1.1] tracking-wide text-[#1c1c1c]">
                  NUMERO DE ORDEN
                </span>
                
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-[6px] text-white uppercase tracking-widest ${
                    order.status === 'ready' ? 'bg-[#22c55e]' : 
                    order.status === 'preparing' ? 'bg-[#eab308]' : 
                    'bg-[#ef4444]'
                  }`}>
                    {order.status === 'ready' ? 'Listo' : order.status === 'preparing' ? 'Preparando' : 'Pendiente'}
                  </span>
                  <span className="text-[22px] font-bold border-2 border-black rounded-[12px] w-12 h-10 flex items-center justify-center text-[#1c1c1c] bg-[#F2E9DC]">
                    {order.orderNumber}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {order.items.map((item, idx) => (
                  <li 
                    key={idx} 
                    className="flex justify-between items-center cursor-pointer group"
                    onClick={() => toggleItemChecked(order.id, idx)}
                  >
                    <span className={`text-[15px] font-bold transition-colors ${item.checked ? 'text-[#8c8c8c] line-through' : 'text-[#1c1c1c]'}`}>
                      {item.quantity} {item.name}
                    </span>
                    <div className={`w-[18px] h-[18px] rounded-full border-2 border-black flex items-center justify-center transition-colors ${item.checked ? 'bg-transparent text-[#1c1c1c]' : 'bg-transparent text-transparent'
                      }`}>
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
                onClick={() => toggleOrder(order.id)}
                disabled={order.status === 'ready' || !order.items.every((item) => item.checked)}
                className={`w-[46px] h-[24px] rounded-full flex items-center p-1 transition-colors ${
                  order.isToggled ? 'bg-[#182033]' : 'bg-[#a3aab8]'
                } ${(order.status === 'ready' || !order.items.every((item) => item.checked)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full bg-[#f2e9dc] shadow-sm transition-transform ${
                    order.isToggled ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                ></div>
              </button>

              <button
                onClick={() => setReady(order.id)}
                disabled={order.status === 'ready' || !order.items.every((item) => item.checked)}
                className={`text-[11px] font-bold px-4 py-1.5 rounded-[8px] transition-colors border-2 ${
                  order.isToggled
                    ? 'bg-[#c25134] border-[#c25134] text-white shadow-sm'
                    : 'bg-white border-white text-[#c25134] shadow-sm'
                } ${(order.status === 'ready' || !order.items.every((item) => item.checked)) ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit' : ''}`}
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
