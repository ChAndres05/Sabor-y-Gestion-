import { useEffect, useState, useRef } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import type { TableOrderStatus } from '../tables/types/table-order.types';
import OrderTrackingMap from '../../components/client/OrderTrackingMap';
import { deliveryApi } from '../../shared/api/delivery.api';
import type { ClientOrder } from '../../shared/types/client-flow.types';
import { pusherClient } from '../../shared/utils/pusher';

interface AdminDeliveryPageProps {
  user: AuthUser;
  onBack: () => void;
}

interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  invalidateSize: () => void;
  on: (event: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  off: (event: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  removeLayer: (layer: any) => void;
}

interface LeafletMarker {
  setLatLng: (latlng: { lat: number; lng: number }) => void;
}

interface LeafletGlobal {
  map: (element: HTMLDivElement | null, options?: unknown) => LeafletMap;
  tileLayer: (url: string, options?: unknown) => { addTo: (map: LeafletMap) => void };
  divIcon: (options: unknown) => unknown;
  marker: (latlng: unknown, options?: unknown) => {
    addTo: (map: LeafletMap) => {
      bindPopup: (content: string) => void;
    };
  };
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
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

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AdminDeliveryPage({ user, onBack }: AdminDeliveryPageProps) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [filter, setFilter] = useState<'ALL' | TableOrderStatus>('ALL');
  const [activeMapOrder, setActiveMapOrder] = useState<ClientOrder | null>(null);

  // Configuration Modal States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const configMapContainerRef = useRef<HTMLDivElement>(null);
  const configMapRef = useRef<LeafletMap | null>(null);
  const configMarkerRef = useRef<LeafletMarker | null>(null);
  const [restaurantCoordinates, setRestaurantCoordinates] = useState({ lat: -17.391537153336852, lng: -66.15233613739282 });
  const [tempCoordinates, setTempCoordinates] = useState({ lat: -17.391537153336852, lng: -66.15233613739282 });

  // Location Simulation States (Repartidor)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const simulationTimerRef = useRef<any>(null);
  const simulationPointsRef = useRef<[number, number][]>([]);

  // Load orders from API
  const loadApiOrders = async () => {
    try {
      const fetched = await deliveryApi.listAllDeliveryOrders();
      setOrders(fetched);
    } catch (e) {
      console.error('Error fetching orders from DB:', e);
    }
  };

  useEffect(() => {
    loadApiOrders();

    const ordersChannel = pusherClient.subscribe('orders-channel');
    const tablesChannel = pusherClient.subscribe('tables-channel');

    const handleRefresh = () => {
      loadApiOrders();
    };

    ordersChannel.bind('order-updated', handleRefresh);
    tablesChannel.bind('table-order-updated', handleRefresh);

    // Also keep local event listener
    window.addEventListener('restaurant-state-changed', handleRefresh);

    return () => {
      ordersChannel.unbind_all();
      tablesChannel.unbind_all();
      pusherClient.unsubscribe('orders-channel');
      pusherClient.unsubscribe('tables-channel');
      window.removeEventListener('restaurant-state-changed', handleRefresh);
    };
  }, []);

  const handleUpdateStatus = async (orderId: number, nextStatus: TableOrderStatus) => {
    try {
      await deliveryApi.updateDeliveryStatus(orderId, nextStatus, user.id);
      await loadApiOrders();
    } catch (e) {
      console.error('Error updating order status:', e);
      alert('No se pudo actualizar el estado del pedido.');
    }
  };

  // Load Leaflet dynamically when Config Modal opens
  useEffect(() => {
    if (!isConfigModalOpen) return;

    if ((window as unknown as Record<string, unknown>).L) {
      setTimeout(() => {
        setLeafletLoaded(true);
      }, 0);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, [isConfigModalOpen]);

  // Load restaurant coordinates from config API
  useEffect(() => {
    deliveryApi.getRestaurantConfig()
      .then(config => {
        setRestaurantCoordinates({ lat: config.restaurantLat, lng: config.restaurantLng });
        setTempCoordinates({ lat: config.restaurantLat, lng: config.restaurantLng });
      })
      .catch(err => console.error('Error loading restaurant config:', err));
  }, []);

  // Initialize Config Map
  useEffect(() => {
    if (!isConfigModalOpen || !leafletLoaded || !configMapContainerRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as LeafletGlobal | undefined;
    if (!L) return;

    const center: [number, number] = [restaurantCoordinates.lat, restaurantCoordinates.lng];

    if (configMapRef.current) {
      setTimeout(() => {
        if (configMapRef.current) {
          configMapRef.current.invalidateSize();
        }
      }, 100);
      return;
    }

    const map = L.map(configMapContainerRef.current, {
      zoomControl: true,
    }).setView(center, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Ensure map is rendered correctly after modal transition completes
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const restaurantIcon = L.divIcon({
      html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">🍕</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }) as unknown;

    const marker = L.marker(center, { icon: restaurantIcon }).addTo(map) as unknown as LeafletMarker;
    configMarkerRef.current = marker;

    const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng(e.latlng);
      setTempCoordinates({ lat, lng });
    };

    map.on('click', handleMapClick);
    configMapRef.current = map;

    return () => {
      if (configMapRef.current) {
        configMapRef.current.off('click', handleMapClick);
        configMapRef.current.remove();
        configMapRef.current = null;
        configMarkerRef.current = null;
      }
    };
  }, [isConfigModalOpen, leafletLoaded, restaurantCoordinates]);

  const handleSaveConfig = async () => {
    try {
      await deliveryApi.saveRestaurantConfig(tempCoordinates.lat, tempCoordinates.lng);
      setRestaurantCoordinates(tempCoordinates);
      setIsConfigModalOpen(false);
      alert('Ubicación del establecimiento guardada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la ubicación.');
    }
  };

  // Start/Stop WebSocket Simulation of delivery routing
  const handleSimulateDelivery = async (orderId: number) => {
    if (isSimulating) {
      // Stop simulation
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      setIsSimulating(false);
      setSimulationIndex(0);
      return;
    }

    // Start simulation
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const destLat = (typeof currentOrder.deliveryLat === 'number') ? currentOrder.deliveryLat : restaurantCoordinates.lat;
    const destLng = (typeof currentOrder.deliveryLng === 'number') ? currentOrder.deliveryLng : restaurantCoordinates.lng;

    // Fetch routing points from OSRM
    const rawDistance = getHaversineDistance(restaurantCoordinates.lat, restaurantCoordinates.lng, destLat, destLng);
    const fallbackDistance = rawDistance * 1.25; // Estimate real path distance
    const midLat = restaurantCoordinates.lat + (destLat - restaurantCoordinates.lat) * 0.5;
    const fallbackPoints: [number, number][] = [
      [restaurantCoordinates.lat, restaurantCoordinates.lng],
      [midLat, restaurantCoordinates.lng],
      [midLat, destLng],
      [destLat, destLng],
    ];
    let points: [number, number][] = fallbackPoints;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restaurantCoordinates.lng},${restaurantCoordinates.lat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(osrmUrl);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length > 0) {
        // Find the route with the shortest distance among alternatives
        const shortestRoute = data.routes.reduce((prev: any, curr: any) => 
          curr.distance < prev.distance ? curr : prev
        , data.routes[0]);
        
        points = shortestRoute.geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]);
      }
    } catch (err) {
      console.warn('OSRM routing failed in admin delivery simulation, using fallback grid:', err);
    }

    if (points.length === 0) return;

    simulationPointsRef.current = points;
    setIsSimulating(true);
    let idx = 0;

    // Send first point immediately
    await deliveryApi.sendRepartidorLocation(orderId, points[idx][0], points[idx][1]);

    const timer = setInterval(async () => {
      idx += 1;
      if (idx >= points.length) {
        clearInterval(timer);
        setIsSimulating(false);
        setSimulationIndex(0);
        simulationTimerRef.current = null;
        return;
      }
      setSimulationIndex(idx);
      try {
        await deliveryApi.sendRepartidorLocation(orderId, points[idx][0], points[idx][1]);
      } catch (err) {
        console.error('Error sending simulated location:', err);
      }
    }, 2000);

    simulationTimerRef.current = timer;
  };

  // Cleanup simulation timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const getNextStatusAction = (status: TableOrderStatus) => {
    switch (status) {
      case 'REGISTRADO':
        return { label: '👨‍🍳 Empezar Preparación', next: 'EN_PREPARACION' as TableOrderStatus };
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
            Gestión de los pedidos a domicilio en la BD y transmisión de geolocalización. Operado por {user.nombre}.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-bold text-text hover:bg-black/5 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            ⚙️ Configurar Restaurante
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto no-scrollbar">
        {(
          [
            { key: 'ALL', label: `Todos (${orders.length})` },
            { key: 'REGISTRADO', label: `Nuevos (${orders.filter((o) => o.status === 'REGISTRADO').length})` },
            { key: 'EN_PREPARACION', label: `En Cocina (${orders.filter((o) => o.status === 'EN_PREPARACION').length})` },
            { key: 'LISTO', label: `Listos (${orders.filter((o) => o.status === 'LISTO').length})` },
            { key: 'EN_CAMINO', label: `En Reparto (${orders.filter((o) => o.status === 'EN_CAMINO').length})` },
            { key: 'ENTREGADO', label: `Entregados (${orders.filter((o) => o.status === 'ENTREGADO').length})` },
            { key: 'PAGADO', label: `Finalizados (${orders.filter((o) => o.status === 'PAGADO').length})` },
            { key: 'CANCELADO', label: `Cancelados (${orders.filter((o) => o.status === 'CANCELADO').length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
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
            No hay registros de pedidos delivery en la base de datos para el estado seleccionado.
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
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-[13px] text-text flex flex-col">
                        <div className="flex justify-between font-bold">
                          <span>
                            {item.quantity} x {item.name}
                          </span>
                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                        {item.ingredients && item.ingredients.some((i) => !i.included) && (
                          <span className="text-[11px] text-gray-500 pl-3">
                            Sin: {item.ingredients.filter((i) => !i.included).map((i) => i.name).join(', ')}
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
                    {(order.deliveryFee ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Costo de Envío</span>
                        <span>{formatPrice(order.deliveryFee ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[15px] font-bold text-text border-t border-gray-200/50 pt-1.5">
                      <span>Total del Pedido</span>
                      <span className="text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  {/* Status Change Buttons */}
                  {order.status === 'EN_CAMINO' && !(order.facturas && order.facturas.some(
                    f => f.estado_documento === 'SOLICITADA' || f.estado_documento === 'EMITIDA'
                  )) && (
                    <div className="bg-alert/10 text-alert text-[12px] font-bold p-3 rounded-xl border border-alert/20 flex items-center gap-1.5 animate-pulse">
                      ⚠️ Esperando solicitud de factura del cliente
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {nextAction && (() => {
                      const isInvoiceRequested = order.facturas && order.facturas.some(
                        f => f.estado_documento === 'SOLICITADA' || f.estado_documento === 'EMITIDA'
                      );
                      const isDeliveryConfirm = nextAction.next === 'ENTREGADO';
                      const isDisabled = isDeliveryConfirm && !isInvoiceRequested;

                      return (
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleUpdateStatus(order.id, nextAction.next)}
                          className={`flex-1 min-w-[120px] rounded-2xl py-2.5 text-[13px] font-bold shadow-sm transition-colors ${
                            isDisabled
                              ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary-hover cursor-pointer'
                          }`}
                        >
                          {nextAction.label}
                        </button>
                      );
                    })()}
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
                onClick={() => {
                  setActiveMapOrder(null);
                  setIsSimulating(false);
                  if (simulationTimerRef.current) {
                    clearInterval(simulationTimerRef.current);
                    simulationTimerRef.current = null;
                  }
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <OrderTrackingMap orderId={activeMapOrder.id} status={activeMapOrder.status} />

            <div className="mt-5 flex items-center justify-between gap-3">
              {activeMapOrder.status === 'EN_CAMINO' ? (
                <button
                  type="button"
                  onClick={() => handleSimulateDelivery(activeMapOrder.id)}
                  className={`rounded-2xl px-5 py-2.5 text-[13px] font-bold text-white transition-colors flex items-center gap-2 cursor-pointer ${
                    isSimulating ? 'bg-alert hover:bg-alert-hover' : 'bg-success hover:bg-success-hover'
                  }`}
                >
                  {isSimulating
                    ? `🛑 Parar (Paso ${simulationIndex}/${simulationPointsRef.current.length - 1})`
                    : '🚀 Simular Ruta (WebSocket)'}
                </button>
              ) : (
                <div className="text-[12px] text-gray-400">
                  {activeMapOrder.status === 'LISTO' ? '🛵 Despacha el pedido para activar el simulador' : 'Simulador inactivo'}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveMapOrder(null);
                  setIsSimulating(false);
                  if (simulationTimerRef.current) {
                    clearInterval(simulationTimerRef.current);
                    simulationTimerRef.current = null;
                  }
                }}
                className="rounded-2xl bg-white border border-gray-300 px-6 py-2.5 text-[13px] font-bold text-text hover:bg-black/5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Configuration Map Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-xl flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-bold text-text">Ubicación del Establecimiento</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Haz clic en el mapa para marcar el local del restaurante.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 h-[300px] w-full">
              {!leafletLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-bold gap-2 bg-gray-50 z-20">
                  <span className="animate-spin text-[24px]">🗺️</span>
                  <span>Cargando mapa de configuración...</span>
                </div>
              )}
              <div ref={configMapContainerRef} className="h-full w-full z-10" />
            </div>

            <div className="mt-3 bg-background p-3 rounded-2xl border border-gray-200/40 text-[12px] text-text font-mono">
              📍 Latitud: {tempCoordinates.lat.toFixed(6)} <br/>
              📍 Longitud: {tempCoordinates.lng.toFixed(6)}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="rounded-2xl bg-white border border-gray-300 px-5 py-2.5 text-[13px] font-bold text-text hover:bg-black/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="rounded-2xl bg-primary px-6 py-2.5 text-[13px] font-bold text-white hover:bg-primary-hover cursor-pointer"
              >
                Guardar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
