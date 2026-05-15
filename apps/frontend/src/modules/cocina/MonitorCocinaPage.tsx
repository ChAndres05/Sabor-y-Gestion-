import { useCallback, useEffect, useState, useRef } from 'react';
import { pusherClient } from '../../shared/utils/pusher';
import { RESTAURANT_STATE_CHANGED_EVENT, RESTAURANT_STATE_CHANGED_STORAGE_KEY } from '../../shared/utils/events';
import { cocinaApi } from './api/cocina.api';

interface OrderItem { id: number; name: string; quantity: number; checked: boolean; notes: string | null; }
type OrderStatus = 'pending' | 'preparing' | 'ready';
interface Order { id: number; orderNumber: number; items: OrderItem[]; status: OrderStatus; isToggled: boolean; source?: 'mesa' | 'reserva'; tableNumber?: number; customerName?: string; reservationTime?: string; prepareFrom?: string; }
interface MonitorCocinaPageProps { onBack: () => void; user?: { id?: number; id_usuario?: number; nombre: string; rol: string }; }

type BackendDetallePedido = { id_detalle_pedido: number; cantidad: number; observaciones?: string | null; preparado?: boolean; esta_preparado?: boolean; preparado_cocina?: boolean; presentacion_producto?: { producto?: { nombre?: string; }; }; };
type BackendPedido = { 
  id_pedido: number; 
  estado?: string; 
  detalles_pedido?: BackendDetallePedido[]; 
  armado?: boolean; 
  esta_armado?: boolean; 
  origen?: 'mesa' | 'reserva'; 
  source?: 'mesa' | 'reserva'; 
  mesa?: { numero?: number; nro_mesa?: number; }; 
  numero_mesa?: number; 
  cliente?: { nombre?: string; }; 
  cliente_nombre?: string; 
  hora_reserva?: string; 
  reservationTime?: string; 
  preparar_desde?: string; 
  prepareFrom?: string;
  fecha_pedido?: string;
};

function getCheckedItemsFromStorage(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('gestionysabor_kitchen_checked_items') || '{}'); } catch { return {}; }
}

function saveCheckedItemInStorage(orderId: number, itemId: number, itemName: string, checked: boolean) {
  const checkedData = getCheckedItemsFromStorage();
  const itemKey = `${orderId}-${itemId}-${itemName}`;
  if (checked) checkedData[itemKey] = true; else delete checkedData[itemKey];
  localStorage.setItem('gestionysabor_kitchen_checked_items', JSON.stringify(checkedData));
}

export default function MonitorCocinaPage({ onBack, user }: MonitorCocinaPageProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  
  const lockedOrders = useRef<Set<number>>(new Set());

  const updateBackendStatus = useCallback(async (id: number, nuevoEstado: string) => {
    try {
      await fetch(`${API_URL}/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, id_usuario: user?.id_usuario || user?.id }),
      });
    } catch (error) { console.error('Error actualizando estado en BD:', error); }
  }, [API_URL, user?.id, user?.id_usuario]);

  const fetchPedidos = useCallback(async () => {
    try {
      // Sin headers de caché para no molestar a CORS
      const response = await fetch(`${API_URL}/api/cocina/pedidos?t=${Date.now()}`, { cache: 'no-store' });
      
      if (!response.ok) throw new Error('No se pudieron cargar los pedidos');
      const data = (await response.json()) as BackendPedido[];
      const checkedData = getCheckedItemsFromStorage();
      
      // 🛡️ Filtramos los pedidos que ya no pertenecen a cocina para evitar parpadeos
      const pedidosListosParaCocina = data.filter((o) => {
        const estadoActual = o.estado?.toUpperCase();
        return estadoActual && !['REGISTRADO', 'ENTREGADO', 'PAGADO', 'CANCELADO'].includes(estadoActual);
      });

      setOrders((prevOrders) =>
        pedidosListosParaCocina.map((backendOrder) => {
          const existingOrder = prevOrders.find((order) => order.id === backendOrder.id_pedido);
          
          if (existingOrder && lockedOrders.current.has(backendOrder.id_pedido)) {
            return existingOrder; 
          }

          const detalles = backendOrder.detalles_pedido ?? [];
          const mappedItems = detalles.map((detalle) => {
            const name = detalle.presentacion_producto?.producto?.nombre ?? 'Producto';
            const existingItem = existingOrder?.items.find((item) => item.id === detalle.id_detalle_pedido);
            const storageKey = `${backendOrder.id_pedido}-${detalle.id_detalle_pedido}-${name}`;
            const backendChecked = detalle.preparado ?? detalle.esta_preparado ?? detalle.preparado_cocina;
            return {
              id: detalle.id_detalle_pedido,
              name,
              quantity: detalle.cantidad,
              notes: detalle.observaciones ?? null,
              checked: typeof backendChecked === 'boolean' ? backendChecked : existingItem?.checked ?? checkedData[storageKey] ?? false,
            };
          }).sort((a, b) => a.id - b.id);

          const hasCheckedItem = mappedItems.some((item) => item.checked);
          let uiStatus: OrderStatus = 'pending';
          const backendState = backendOrder.estado?.toUpperCase();
          
          if (backendState === 'LISTO') uiStatus = 'ready';
          else if (backendState === 'EN_PREPARACION' || backendState === 'PREPARANDO') uiStatus = hasCheckedItem ? 'preparing' : 'pending';

          if (existingOrder?.status === 'ready') {
            uiStatus = 'ready';
          }

          return {
            id: backendOrder.id_pedido, orderNumber: backendOrder.id_pedido, status: uiStatus,
            isToggled: existingOrder?.status === 'ready' ? true : (backendOrder.armado ?? backendOrder.esta_armado ?? existingOrder?.isToggled ?? false),
            source: backendOrder.origen ?? backendOrder.source,
            tableNumber: backendOrder.numero_mesa ?? backendOrder.mesa?.numero ?? backendOrder.mesa?.nro_mesa,
            customerName: backendOrder.cliente_nombre ?? backendOrder.cliente?.nombre,
            reservationTime: backendOrder.hora_reserva ?? backendOrder.reservationTime,
            // ⏱️ Leemos fecha_pedido limpiamente
            prepareFrom: backendOrder.fecha_pedido ?? backendOrder.preparar_desde ?? backendOrder.prepareFrom,
            items: mappedItems,
          };
        })
      );
    } catch (error) { console.error('Error cargando pedidos:', error); } finally { setIsLoading(false); }
  }, [API_URL]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }));
    updateTime(); const timer = setInterval(updateTime, 1000); return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetchPedidos();
    const handleStateChange = () => { void fetchPedidos(); };
    const handleStorageChange = (event: StorageEvent) => { if (event.key === RESTAURANT_STATE_CHANGED_STORAGE_KEY) void fetchPedidos(); };
    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
    window.addEventListener('storage', handleStorageChange);

    const channel = pusherClient.subscribe('cocina-channel');
    channel.bind('nuevo-pedido', fetchPedidos); channel.bind('pedido-actualizado', fetchPedidos);
    channel.bind('detalle-actualizado', fetchPedidos); channel.bind('pedido-armado', fetchPedidos);

    return () => {
      window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
      window.removeEventListener('storage', handleStorageChange);
      channel.unbind('nuevo-pedido', fetchPedidos); channel.unbind('pedido-actualizado', fetchPedidos);
      channel.unbind('detalle-actualizado', fetchPedidos); channel.unbind('pedido-armado', fetchPedidos);
      pusherClient.unsubscribe('cocina-channel');
    };
  }, [fetchPedidos]);

  const lockOrder = (id: number) => {
    lockedOrders.current.add(id);
    setTimeout(() => { lockedOrders.current.delete(id); }, 5000);
  };

  const toggleOrder = async (id: number) => {
    const orderToToggle = orders.find((order) => order.id === id);
    if (!orderToToggle || orderToToggle.status === 'ready') return;
    
    lockOrder(id);
    const newToggledState = !orderToToggle.isToggled;
    setOrders((prev) => prev.map((order) => order.id === id ? { ...order, isToggled: newToggledState } : order));
    
    try { await cocinaApi.actualizarEstadoArmado(id, newToggledState); } 
    catch (error) { console.error('Error al actualizar armado:', error); }
  };

  const toggleItemChecked = async (orderId: number, itemIndex: number) => {
    const order = orders.find((currentOrder) => currentOrder.id === orderId);
    if (!order || order.status === 'ready') return;
    const item = order.items[itemIndex];
    if (!item || item.checked) return;

    lockOrder(orderId);
    const newChecked = true;
    
    setOrders((prevOrders) =>
      prevOrders.map((currentOrder) => {
        if (currentOrder.id !== orderId) return currentOrder;
        const updatedItems = currentOrder.items.map((currentItem, index) => index === itemIndex ? { ...currentItem, checked: newChecked } : currentItem);
        let newStatus = currentOrder.status;
        if (currentOrder.status === 'pending') newStatus = 'preparing';
        saveCheckedItemInStorage(orderId, item.id, item.name, newChecked);
        return { ...currentOrder, items: updatedItems, status: newStatus };
      })
    );
    try { await cocinaApi.marcarPlatoPreparado(item.id, newChecked); } 
    catch (error) { console.error('Error BD:', error); }
  };

  const setReady = async (id: number) => {
    const order = orders.find((currentOrder) => currentOrder.id === id);
    if (!order || order.status === 'ready') return;
    
    lockOrder(id);
    setOrders((prev) => prev.map((currentOrder) => currentOrder.id === id ? { ...currentOrder, status: 'ready' } : currentOrder));
    
    try { await updateBackendStatus(id, 'LISTO'); } 
    catch (error) { console.error(error); }
  };

  const pendingCount = orders.filter((order) => order.status === 'pending').length;
  const preparingCount = orders.filter((order) => order.status === 'preparing').length;
  const readyCount = orders.filter((order) => order.status === 'ready').length;

  if (isLoading) {
    return (
      <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC] flex items-center justify-center">
        <p className="text-xl font-bold">Cargando monitor de cocina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 text-[#1c1c1c] bg-[#F2E9DC]">
      <div className="mb-6 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-black/5">
              <svg className="w-6 h-6 text-[#1c1c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Monitor de Cocina</h1>
          </div>
          <p className="text-[#8c8c8c] text-sm font-medium sm:ml-12">Pedidos pendientes</p>
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
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-[#9ca3af] text-sm font-medium">
          <span className="hidden sm:inline">{currentTime}</span>
        </div>
        <span className="text-[#9ca3af] text-sm font-medium">{currentTime}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border-2 border-black bg-[#F2E9DC] rounded-[20px] p-5 flex flex-col justify-between min-h-[240px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            {order.status !== 'ready' && order.prepareFrom && (
              <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black border-l-2 border-b-2 border-black 
                ${(() => {
                  const diff = Math.floor((new Date().getTime() - new Date(order.prepareFrom!).getTime()) / 60000);
                  if (diff >= 30) return 'bg-red-500 text-white animate-pulse';
                  if (diff >= 15) return 'bg-yellow-400 text-black';
                  return 'bg-white text-black';
                })()}`}>
                {Math.floor((new Date().getTime() - new Date(order.prepareFrom!).getTime()) / 60000)} MIN EN ESPERA
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black w-14 leading-[1.1] tracking-wide text-[#1c1c1c]">
                    NÚMERO DE ORDEN
                  </span>
                  {order.tableNumber && (
                    <span className="mt-1 bg-[#c25134] text-white text-[10px] font-black px-1.5 py-0.5 rounded-[4px] w-fit tracking-wider">
                      MESA {order.tableNumber}
                    </span>
                  )}
                </div>

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
              <ul className="space-y-3 mb-6">
                {order.items.map((item, index) => (
                  <li
                    key={item.id}
                    className={`flex justify-between items-start group ${
                      order.status === 'ready' || item.checked ? 'cursor-default' : 'cursor-pointer'
                    }`}
                    onClick={() =>
                      order.status !== 'ready' && !item.checked && void toggleItemChecked(order.id, index)
                    }
                  >
                    <div className="flex flex-col pr-2">
                      <span
                        className={`text-[15px] font-bold transition-colors ${
                          item.checked
                            ? 'text-[#8c8c8c] line-through'
                            : 'text-[#1c1c1c]'
                        }`}
                      >
                        {item.quantity} {item.name}
                      </span>

                      {item.notes && (
                        <span
                          className={`text-[12px] italic mt-0.5 ${
                            item.checked
                              ? 'text-[#8c8c8c] line-through'
                              : 'text-[#ef4444]'
                          }`}
                        >
                          * {item.notes}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-[18px] h-[18px] mt-1 rounded-full border-2 border-black flex shrink-0 items-center justify-center transition-colors ${
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
              <button onClick={() => void toggleOrder(order.id)} disabled={order.status === 'ready' || !order.items.every((i) => i.checked)} className={`w-[46px] h-[24px] rounded-full flex items-center p-1 ${order.isToggled ? 'bg-[#182033]' : 'bg-[#a3aab8]'} ${order.status === 'ready' || !order.items.every((i) => i.checked) ? 'opacity-50 cursor-not-allowed' : ''}`}><div className={`w-[18px] h-[18px] rounded-full bg-[#f2e9dc] shadow-sm transition-transform ${order.isToggled ? 'translate-x-[20px]' : 'translate-x-0'}`} /></button>
              <button onClick={() => void setReady(order.id)} disabled={order.status === 'ready' || !order.items.every((i) => i.checked) || !order.isToggled} className={`text-[11px] font-bold px-4 py-1.5 rounded-[8px] border-2 ${order.isToggled ? 'bg-[#c25134] border-[#c25134] text-white' : 'bg-white border-white text-[#c25134]'} ${order.status === 'ready' || !order.items.every((i) => i.checked) || !order.isToggled ? 'opacity-50 cursor-not-allowed' : ''}`}>LISTO</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
