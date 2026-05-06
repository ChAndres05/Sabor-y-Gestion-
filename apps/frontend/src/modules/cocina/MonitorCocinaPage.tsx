import { useState, useEffect, useCallback } from 'react';
import { pusherClient } from '../../shared/utils/pusher'; // Asegúrate de que esta ruta coincida con tu proyecto
import { cocinaApi } from './api/cocina.api';

// Interfaces adaptadas para el Front
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
}

interface MonitorCocinaPageProps {
  onBack: () => void;
  user?: { id?: number; id_usuario?: number; nombre: string; rol: string }; // Por si quieres guardar quién lo preparó
}

export default function MonitorCocinaPage({ onBack, user }: MonitorCocinaPageProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState('');

  // 1. Reloj en tiempo real
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Cargar datos del Backend y mantener el estado local (checkboxes)
  const fetchPedidos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/cocina/pedidos`);
      if (!response.ok) return;

      const data = await response.json();

      setOrders((prevOrders) => {
        return data.map((backendOrder: any) => {
          // Buscamos si el pedido ya existía en pantalla para no borrar sus checkboxes marcados
          const existingOrder = prevOrders.find((o) => o.id === backendOrder.id_pedido);
          const mappedStatus = backendOrder.estado === 'REGISTRADO' ? 'pending' : 'preparing';

          return {
            id: backendOrder.id_pedido,
            orderNumber: backendOrder.id_pedido, // Usamos el ID del pedido como número de orden
            status: mappedStatus,
            isToggled: existingOrder ? existingOrder.isToggled : false,
            items: backendOrder.detalles_pedido.map((detalle: any) => {
              const existingItem = existingOrder?.items.find((i) => i.id === detalle.id_detalle_pedido);
              return {
                id: detalle.id_detalle_pedido,
                name: detalle.presentacion_producto.producto.nombre,
                quantity: detalle.cantidad,
                notes: detalle.observaciones, // Capturamos las notas por si las necesitas
                checked: existingItem ? existingItem.checked : false,
              };
            }),
          };
        });
      });
    } catch (error) {
      console.error("Error cargando pedidos:", error);
    }
  }, [API_URL]);

  // 3. Conectar a Pusher y cargar datos iniciales
  useEffect(() => {
    fetchPedidos();

    const channel = pusherClient.subscribe('cocina-channel');
    channel.bind('nuevo-pedido', fetchPedidos);
    channel.bind('pedido-actualizado', fetchPedidos);

    // --- AQUÍ AUMENTAMOS LOS NUEVOS EVENTOS ---
    // Cuando otro cocinero marque un plato:
    channel.bind('detalle-actualizado', fetchPedidos);
    // Cuando otro cocinero marque el botón desplegable (armado):
    channel.bind('pedido-armado', fetchPedidos);

    return () => {
      pusherClient.unsubscribe('cocina-channel');
    };
  }, [fetchPedidos]);

  // 4. Actualizar Base de Datos
  const updateBackendStatus = async (id: number, nuevoEstado: string) => {
    try {
      await fetch(`${API_URL}/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          id_usuario: user?.id_usuario || user?.id,
        }),
      });
    } catch (error) {
      console.error("Error actualizando estado en BD:", error);
    }
  };

  // --- LÓGICA DE LA INTERFAZ ---

  // AUMENTO: Se hizo la función async para poder hacer la petición al backend
  const toggleOrder = async (id: number) => {
    // AUMENTO: Obtenemos el estado actual del pedido para saber qué enviar a la BD
    const orderToToggle = orders.find((o) => o.id === id);
    const newToggledState = orderToToggle ? !orderToToggle.isToggled : false;

    // Lógica local original intacta
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, isToggled: !order.isToggled } : order
      )
    );

    // AUMENTO: Llamada a la API para actualizar el botón desplegable (armado)
    if (orderToToggle) {
      try {
        await cocinaApi.actualizarEstadoArmado(id, newToggledState);
      } catch (error) {
        console.error("Error al actualizar armado en BD:", error);
      }
    }
  };

  // AUMENTO: Se hizo la función async para poder hacer la petición al backend
  const toggleItemChecked = async (orderId: number, itemIndex: number) => {
    // AUMENTO: Obtener el plato específico para mandarlo a actualizar en BD
    const order = orders.find((o) => o.id === orderId);
    if (order && order.status !== 'ready') {
      const item = order.items[itemIndex];
      try {
        await cocinaApi.marcarPlatoPreparado(item.id, !item.checked);
      } catch (error) {
        console.error("Error al actualizar el detalle del plato en BD:", error);
      }
    }

    // Lógica local original intacta
    setOrders((prevOrders) => {
      let needsBackendUpdate = false;

      const newOrders = prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.status === 'ready') return order;

        const updatedItems = order.items.map((item, idx) =>
          idx === itemIndex ? { ...item, checked: !item.checked } : item
        );

        const hasCheckedItem = updatedItems.some((item) => item.checked);
        let newStatus = order.status;

        // Si marcamos el primer item y estaba pendiente, pasa a preparando en BD
        if (hasCheckedItem && order.status === 'pending') {
          newStatus = 'preparing';
          needsBackendUpdate = true;
        } else if (!hasCheckedItem && order.status === 'preparing') {
          newStatus = 'pending';
        }

        return {
          ...order,
          items: updatedItems,
          status: newStatus,
        };
      });

      if (needsBackendUpdate) {
        updateBackendStatus(orderId, 'EN_PREPARACION');
      }

      return newOrders;
    });
  };

  const setReady = async (id: number) => {
    // 1. Actualizamos estado local rápido para dar feedback al usuario
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, status: 'ready' } : order
      )
    );
    // 2. Avisamos al backend
    await updateBackendStatus(id, 'LISTO');
    // Al marcar LISTO, el próximo evento de Pusher hará que desaparezca del Monitor.
  };

  // Contadores dinámicos
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

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
          <span className="hidden sm:inline">{currentTime}</span>
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
                  NÚMERO DE ORDEN
                </span>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-[6px] text-white uppercase tracking-widest ${order.status === 'ready' ? 'bg-[#22c55e]' :
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
                    className={`flex justify-between items-start group ${order.status === 'ready' ? 'cursor-default' : 'cursor-pointer'}`}
                    onClick={() => order.status !== 'ready' && toggleItemChecked(order.id, idx)}
                  >
                    <div className="flex flex-col pr-2">
                      <span className={`text-[15px] font-bold transition-colors ${item.checked ? 'text-[#8c8c8c] line-through' : 'text-[#1c1c1c]'}`}>
                        {item.quantity} {item.name}
                      </span>
                      {/* Aquí mostramos notas extras si el pedido las tiene (Ej: Sin cebolla) */}
                      {item.notes && (
                        <span className={`text-[12px] italic mt-0.5 ${item.checked ? 'text-[#8c8c8c] line-through' : 'text-[#ef4444]'}`}>
                          * {item.notes}
                        </span>
                      )}
                    </div>
                    <div className={`w-[18px] h-[18px] mt-1 rounded-full border-2 border-black flex shrink-0 items-center justify-center transition-colors ${item.checked ? 'bg-transparent text-[#1c1c1c]' : 'bg-transparent text-transparent'
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
                className={`w-[46px] h-[24px] rounded-full flex items-center p-1 transition-colors ${order.isToggled ? 'bg-[#182033]' : 'bg-[#a3aab8]'
                  } ${(order.status === 'ready' || !order.items.every((item) => item.checked)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full bg-[#f2e9dc] shadow-sm transition-transform ${order.isToggled ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                ></div>
              </button>

              <button
                onClick={() => setReady(order.id)}
                disabled={order.status === 'ready' || !order.items.every((item) => item.checked) || !order.isToggled}
                className={`text-[11px] font-bold px-4 py-1.5 rounded-[8px] transition-colors border-2 ${order.isToggled
                  ? 'bg-[#c25134] border-[#c25134] text-white shadow-sm'
                  : 'bg-white border-white text-[#c25134] shadow-sm'
                  } ${(order.status === 'ready' || !order.items.every((item) => item.checked) || !order.isToggled) ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit' : ''}`}
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