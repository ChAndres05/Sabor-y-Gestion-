import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '../../store/cartStore';
import type { AuthUser } from '../auth/types/auth.types';
import type { ClientNavigationKey } from '../../shared/types/client-flow.types';
import { deliveryApi } from '../../shared/api/delivery.api';
import { emitRestaurantStateChanged } from '../../shared/utils/events';
import ClientLayout from '../../components/client/ClientLayout';
import qrImage from '../../assets/qr.png';

interface ClientCartPageProps {
  user: AuthUser;
  onLogout: () => void;
  onNavigate: (screen: ClientNavigationKey) => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
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
  polyline: (points: [number, number][], options?: unknown) => { addTo: (map: LeafletMap) => any };
}


export default function ClientCartPage({ user, onLogout, onNavigate }: ClientCartPageProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user.telefono || '');
  const [observations, setObservations] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'QR'>('EFECTIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const selectionMarkerRef = useRef<LeafletMarker | null>(null);
  const polylineRef = useRef<any>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [restaurantLoc, setRestaurantLoc] = useState({ lat: -17.391537153336852, lng: -66.15233613739282 });
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(5);

  // Fetch restaurant coordinates on mount
  useEffect(() => {
    deliveryApi.getRestaurantConfig()
      .then((config) => {
        setRestaurantLoc({ lat: config.restaurantLat, lng: config.restaurantLng });
      })
      .catch((err) => console.error('Error fetching restaurant config:', err));
  }, []);

  // Load Leaflet resources dynamically from CDN when map modal is requested
  useEffect(() => {
    if (!isMapModalOpen) return;

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
  }, [isMapModalOpen]);

  // Initialize and update selection Map
  useEffect(() => {
    if (!isMapModalOpen || !leafletLoaded || !mapContainerRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as LeafletGlobal | undefined;
    if (!L) return;

    const center: [number, number] = [restaurantLoc.lat, restaurantLoc.lng];

    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
      return;
    }

    const map = L.map(mapContainerRef.current, {
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
      html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">🍕</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }) as unknown;

    L.marker(center, { icon: restaurantIcon }).addTo(map).bindPopup('<b>Sabor y Gestión</b><br/>Restaurante');

    const clientIcon = L.divIcon({
      html: `<div style="background-color: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">📍</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }) as unknown;

    const handleMapClick = async (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;

      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setLatLng(e.latlng);
      } else {
        const marker = L.marker(e.latlng, { icon: clientIcon }).addTo(map) as unknown as LeafletMarker;
        selectionMarkerRef.current = marker;
      }

      // Remove previous polyline
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      // Default Manhattan path fallback
      const rawDistance = getHaversineDistance(restaurantLoc.lat, restaurantLoc.lng, lat, lng);
      const fallbackDistance = rawDistance * 1.25; // Estimate real path distance
      const fallbackPoints: [number, number][] = [
        [restaurantLoc.lat, restaurantLoc.lng],
        [restaurantLoc.lat + (lat - restaurantLoc.lat) * 0.5, restaurantLoc.lng],
        [restaurantLoc.lat + (lat - restaurantLoc.lat) * 0.5, lng],
        [lat, lng],
      ];

      let routeDistance = fallbackDistance;
      let pathPoints = fallbackPoints;

      // Try fetching exact street routing path from OSRM
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restaurantLoc.lng},${restaurantLoc.lat};${lng},${lat}?overview=full&geometries=geojson&alternatives=true`;
        const res = await fetch(osrmUrl);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.length > 0) {
          // Find the route with the shortest distance among alternatives
          const shortestRoute = data.routes.reduce((prev: any, curr: any) =>
            curr.distance < prev.distance ? curr : prev
            , data.routes[0]);

          routeDistance = shortestRoute.distance / 1000;
          pathPoints = shortestRoute.geometry.coordinates.map(([lon, l]: number[]) => [l, lon]);
        }
      } catch (err) {
        console.warn('OSRM routing failed, using Manhattan path fallback:', err);
      }

      // Draw route on map
      const polyline = L.polyline(pathPoints, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 8',
      }).addTo(map);
      polylineRef.current = polyline;

      const roundedDistance = Number(routeDistance.toFixed(2));
      // Calculate cost: 5 Bs for first 2 km, and 2 Bs per additional km
      const fee = roundedDistance <= 2 ? 5 : 5 + 2 * (roundedDistance - 2);

      setCalculatedDeliveryFee(Number(fee.toFixed(2)));
      setDeliveryDistance(roundedDistance);
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      setAddress(`📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} (${routeDistance.toFixed(2)} km)`);
    };

    map.on('click', handleMapClick);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
        mapRef.current.remove();
        mapRef.current = null;
        selectionMarkerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, [leafletLoaded, isMapModalOpen, restaurantLoc]);

  const subtotal = items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
  const deliveryFee = calculatedDeliveryFee;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setErrorMsg('');
    if (items.length === 0) {
      setErrorMsg('Tu carrito está vacío.');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Por favor ingresa la dirección de entrega o selecciónala en el mapa.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor ingresa un teléfono de contacto.');
      return;
    }

    setIsSubmitting(true);

    try {
      await deliveryApi.createDeliveryOrder({
        userId: user.id,
        customerName: `${user.nombre} ${user.apellido}`,
        phone,
        address,
        observations: observations.trim(),
        items: items.map((item) => ({
          productoId: item.productoId,
          presentacionId: item.presentacionId,
          nombre: item.nombre,
          precioUnitario: item.precioUnitario,
          cantidad: item.cantidad,
          observacion: item.observacion,
          ingredientes: item.ingredientes,
        })),
        subtotal,
        deliveryFee,
        total,
        deliveryLat: deliveryLat !== null ? deliveryLat : restaurantLoc.lat,
        deliveryLng: deliveryLng !== null ? deliveryLng : restaurantLoc.lng,
        paymentMethod,
      });

      // Clear variables and cart
      clearCart();
      setAddress('');
      setObservations('');
      setPaymentMethod('EFECTIVO');

      // Notify state changed so tables list or order history reloads
      emitRestaurantStateChanged();

      setIsSubmitting(false);
      onNavigate('orders');
    } catch (e: any) {
      setIsSubmitting(false);
      setErrorMsg(e.message || 'Error al procesar el pedido. Intente nuevamente.');
      console.error(e);
    }
  };


  return (
    <ClientLayout
      user={user}
      active="cart"
      title="Tu Pedido (Delivery)"
      subtitle="Ingresa tus datos de envío y confirma tu orden."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={() => onNavigate('menu')}
    >
      <div className="mx-auto w-full max-w-6xl mt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-[72px] mb-4">🍽️</span>
            <h2 className="text-[20px] font-bold text-text">Tu carrito está vacío</h2>
            <p className="text-[14px] text-gray-500 mt-2 max-w-[280px]">
              Explora el menú y agrega tus platos preferidos aquí.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="mt-6 rounded-2xl bg-primary px-6 py-3 text-[14px] font-bold text-white shadow-md hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Explorar Menú
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start pb-16">

            {/* Left Column - Delivery Form details */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">

              {/* Delivery info form parameters */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">
                  Datos de Entrega
                </h3>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Dirección de entrega *
                    </label>
                    <input
                      type="text"
                      value={address}
                      readOnly
                      placeholder="Usa el botón de abajo para seleccionar tu ubicación de entraga"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none font-bold cursor-not-allowed select-none"
                    />

                    <button
                      type="button"
                      onClick={() => setIsMapModalOpen(true)}
                      className="mt-3 w-full rounded-2xl bg-primary/10 border border-primary/20 py-3 px-4 text-[14px] font-bold text-primary flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors cursor-pointer"
                    >
                      📍 Seleccionar en el mapa
                    </button>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Teléfono de contacto *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Número de celular o teléfono..."
                      className="w-full rounded-xl border border-gray-200 bg-background px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Instrucciones o comentarios adicionales
                    </label>
                    <textarea
                      rows={4}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Ej. Llevar cubiertos, tocar timbre fuerte, salsa extra..."
                      className="w-full rounded-xl border border-gray-200 bg-background px-4 py-3 text-[14px] outline-none focus:border-primary focus:bg-white transition-all font-semibold resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Método de Pago *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('EFECTIVO')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'EFECTIVO'
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                          : 'border-gray-100 hover:border-gray-200 opacity-70'
                          }`}
                      >
                        <span className="text-2xl">💵</span>
                        <span className="font-extrabold text-[12px] uppercase tracking-wider text-text">Efectivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QR')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === 'QR'
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                          : 'border-gray-100 hover:border-gray-200 opacity-70'
                          }`}
                      >
                        <span className="text-2xl">📱</span>
                        <span className="font-extrabold text-[12px] uppercase tracking-wider text-text">QR / Transferencia</span>
                      </button>
                    </div>

                    {paymentMethod === 'QR' && (
                      <div className="mt-4 p-5 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center text-center animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                          Escanea el código QR para realizar el pago
                        </p>
                        <div className="w-44 h-44 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2 border border-gray-100 overflow-hidden">
                          <img src={qrImage} alt="Código QR para Pago" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Cart Items and Summary */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[15px] font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">
                  Resumen de Compra
                </h3>

                {/* Items List */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-background p-3.5 shadow-sm flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-[14px] font-bold text-text leading-snug">{item.nombre}</h4>
                          <p className="text-[12px] font-semibold text-primary mt-0.5">
                            {formatPrice(item.precioUnitario)} c/u
                          </p>
                          {item.ingredientes && item.ingredientes.some(i => !i.incluido) && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              Sin: {item.ingredientes.filter(i => !i.incluido).map(i => i.nombre).join(', ')}
                            </p>
                          )}
                          {item.observacion && (
                            <p className="text-[11px] italic text-gray-500 mt-0.5">
                              Nota: "{item.observacion}"
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[18px] text-alert hover:bg-alert/10 h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Eliminar producto"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-200/50">
                        <div className="flex items-center rounded-xl bg-white p-0.5 border border-gray-200/70">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                            className="h-7 w-7 rounded-lg text-[14px] font-bold flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-[13px] font-bold text-text w-8 text-center">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                            className="h-7 w-7 rounded-lg text-[14px] font-bold flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[14px] font-bold text-text">
                          {formatPrice(item.precioUnitario * item.cantidad)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Fees */}
                <div className="border-t border-gray-100 pt-4 space-y-2 text-[14px] text-gray-600 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-text">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo de Delivery</span>
                    <span className="font-bold text-text">{formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-[16px] font-black text-text border-t border-gray-200/50 pt-3">
                    <span>Total a Pagar</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-[13px] text-alert font-bold bg-alert/5 p-3 rounded-xl border border-alert/10 text-center animate-shake">
                    ⚠️ {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="w-full rounded-2xl bg-primary py-4 text-[14px] font-bold text-white transition-all hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>Procesando pedido...</>
                  ) : (
                    <>Confirmar Pedido · {formatPrice(total)}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Address Selector Modal popup */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-gray-800 text-lg font-black uppercase tracking-tight">
                  Seleccionar Ubicación
                </h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Toca en el mapa para marcar tu dirección de entrega
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="text-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 h-[320px] w-full">
              {!leafletLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-bold gap-2">
                  <span className="animate-spin text-[24px]">🗺️</span>
                  <span className="text-[12px] font-sans">Cargando mapa de selección...</span>
                </div>
              )}
              <div ref={mapContainerRef} className="h-full w-full z-10" />
            </div>

            {address && (
              <div className="bg-background p-3.5 rounded-xl border border-gray-100 flex items-center gap-3">
                <span className="text-lg">📍</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-gray-400 uppercase">Coordenadas marcadas</p>
                  <p className="text-[13px] font-bold text-text truncate mt-0.5">{address}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition-all hover:scale-[1.01] cursor-pointer text-center"
              >
                Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
