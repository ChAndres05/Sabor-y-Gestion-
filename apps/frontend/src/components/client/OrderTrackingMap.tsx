import { useEffect, useRef, useState } from 'react';
import { deliveryApi } from '../../shared/api/delivery.api';
import { pusherClient } from '../../shared/utils/pusher';

interface OrderTrackingMapProps {
  orderId: number;
  status: string;
}

interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  invalidateSize: () => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  removeLayer: (layer: unknown) => void;
  pathPoints?: [number, number][];
}

interface LeafletMarker {
  setLatLng: (latlng: [number, number]) => void;
  openPopup: () => void;
}

interface LeafletGlobal {
  map: (element: HTMLDivElement | null, options?: unknown) => LeafletMap;
  tileLayer: (url: string, options?: unknown) => { addTo: (map: LeafletMap) => void };
  divIcon: (options: unknown) => unknown;
  marker: (latlng: unknown, options?: unknown) => {
    addTo: (map: LeafletMap) => {
      bindPopup: (content: string) => LeafletMarker;
    };
  };
  polyline: (points: [number, number][], options?: unknown) => { addTo: (map: LeafletMap) => unknown };
  latLngBounds: (points: [number, number][]) => unknown;
}


export default function OrderTrackingMap({ orderId, status }: OrderTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const motoMarkerRef = useRef<LeafletMarker | null>(null);
  const routePolylineRef = useRef<unknown | null>(null);

  const [restaurantLoc, setRestaurantLoc] = useState({ lat: -17.391537153336852, lng: -66.15233613739282 });
  const [clientLoc, setClientLoc] = useState({ lat: -17.391537153336852, lng: -66.15233613739282 });
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Load Leaflet resources dynamically from CDN
  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).L) {
      setTimeout(() => {
        setLeafletLoaded(true);
      }, 0);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Fetch coordinates: Restaurant config and Client delivery destination coordinates
  useEffect(() => {
    let active = true;
    setLoadingDetails(true);

    async function loadData() {
      try {
        const config = await deliveryApi.getRestaurantConfig();
        const orders = await deliveryApi.listAllDeliveryOrders();
        const currentOrder = orders.find(o => o.id === orderId);

        if (active) {
          setRestaurantLoc({ lat: config.restaurantLat, lng: config.restaurantLng });
          if (currentOrder && typeof currentOrder.deliveryLat === 'number' && typeof currentOrder.deliveryLng === 'number') {
            setClientLoc({ lat: currentOrder.deliveryLat, lng: currentOrder.deliveryLng });
          } else {
            // deterministic mockup location fallback if coordinates are missing in DB
            const angle = (orderId * 97) % 360;
            const radius = 0.007 + ((orderId % 5) * 0.0015);
            setClientLoc({
              lat: config.restaurantLat + radius * Math.sin((angle * Math.PI) / 180),
              lng: config.restaurantLng + radius * Math.cos((angle * Math.PI) / 180),
            });
          }
        }
      } catch (err) {
        console.error('Error loading order coordinates:', err);
      } finally {
        if (active) setLoadingDetails(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [orderId]);

  // Fetch exact street routing
  useEffect(() => {
    if (loadingDetails) return;

    let active = true;

    async function calculateRoute() {
      // Default Manhattan path fallback
      const midLat = restaurantLoc.lat + (clientLoc.lat - restaurantLoc.lat) * 0.5;
      const fallbackPoints: [number, number][] = [
        [restaurantLoc.lat, restaurantLoc.lng],
        [midLat, restaurantLoc.lng],
        [midLat, clientLoc.lng],
        [clientLoc.lat, clientLoc.lng],
      ];
      let points = fallbackPoints;

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restaurantLoc.lng},${restaurantLoc.lat};${clientLoc.lng},${clientLoc.lat}?overview=full&geometries=geojson&alternatives=true`;
        const res = await fetch(osrmUrl);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.length > 0) {
          interface RouteGeometry {
            coordinates: [number, number][];
          }
          interface OSRMRoute {
            distance: number;
            geometry: RouteGeometry;
          }
          const shortestRoute = data.routes.reduce((prev: OSRMRoute, curr: OSRMRoute) =>
            curr.distance < prev.distance ? curr : prev
            , data.routes[0] as OSRMRoute);

          points = shortestRoute.geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]);
        }
      } catch (err) {
        console.warn('OSRM routing failed in tracking map, using fallback grid:', err);
      }

      if (active) {
        setRoutePoints(points);
      }
    }

    calculateRoute();
    return () => {
      active = false;
    };
  }, [loadingDetails, restaurantLoc, clientLoc]);

  // Subscribe to real-time WebSockets (Pusher) location tracking channel
  useEffect(() => {
    const channel = pusherClient.subscribe(`delivery-tracking-${orderId}`);

    const handleLocationUpdate = (data: { lat: number; lng: number }) => {
      setDriverLoc({ lat: data.lat, lng: data.lng });
    };

    channel.bind('location-updated', handleLocationUpdate);

    return () => {
      channel.unbind('location-updated', handleLocationUpdate);
      pusherClient.unsubscribe(`delivery-tracking-${orderId}`);
    };
  }, [orderId]);

  // Initialize and render Leaflet map
  useEffect(() => {
    if (!leafletLoaded || loadingDetails || routePoints.length === 0 || !mapContainerRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as LeafletGlobal | undefined;
    if (!L) return;

    const start: [number, number] = [restaurantLoc.lat, restaurantLoc.lng];
    const end: [number, number] = [clientLoc.lat, clientLoc.lng];

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView(start, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Ensure map is rendered correctly after modal transition completes
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      // Custom house/restaurant icon
      const restaurantIcon = L.divIcon({
        html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">🍕</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }) as unknown;

      // Custom client address icon
      const clientIcon = L.divIcon({
        html: `<div style="background-color: #10b981; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">📍</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }) as unknown;

      L.marker(start, { icon: restaurantIcon }).addTo(map).bindPopup('<b>Sabor y Gestión</b><br/>Origen del Pedido');
      L.marker(end, { icon: clientIcon }).addTo(map).bindPopup('<b>Cliente</b><br/>Destino de Entrega');

      // Draw route path
      const polyline = L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 4.5,
        opacity: 0.75,
        dashArray: '5, 8',
      }).addTo(map);
      routePolylineRef.current = polyline;

      map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] });
      mapRef.current = map;
    } else {
      // If map is already initialized, fit bounds for new coordinates
      mapRef.current.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] });
      if (routePolylineRef.current) {
        mapRef.current.removeLayer(routePolylineRef.current);
      }
      const polyline = L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 4.5,
        opacity: 0.75,
        dashArray: '5, 8',
      }).addTo(mapRef.current);
      routePolylineRef.current = polyline;
    }
  }, [leafletLoaded, loadingDetails, routePoints, restaurantLoc, clientLoc]);

  // Handle repartidor (moto 🛵) location updates dynamically
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as LeafletGlobal | undefined;
    if (!L) return;

    const start: [number, number] = [restaurantLoc.lat, restaurantLoc.lng];
    const end: [number, number] = [clientLoc.lat, clientLoc.lng];

    const motoIcon = L.divIcon({
      html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); animation: pulse 1.5s infinite">🛵</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    }) as unknown;

    // Determine current position
    let finalCoord = start;
    if (status === 'EN_CAMINO') {
      finalCoord = driverLoc ? [driverLoc.lat, driverLoc.lng] : start;
    } else if (['ENTREGADO', 'PAGADO'].includes(status)) {
      finalCoord = end;
    }

    if (motoMarkerRef.current) {
      motoMarkerRef.current.setLatLng(finalCoord);
    } else {
      motoMarkerRef.current = L.marker(finalCoord, { icon: motoIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Ubicación del Repartidor</b><br/>Seguimiento en tiempo real.');

      if (status === 'EN_CAMINO') {
        motoMarkerRef.current.openPopup();
      }
    }
  }, [leafletLoaded, driverLoc, status, restaurantLoc, clientLoc]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        // We will let the container dispose, but reset refs
        mapRef.current = null;
        motoMarkerRef.current = null;
        routePolylineRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 h-[240px] w-full mt-4">
      {(!leafletLoaded || loadingDetails) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-bold gap-2 bg-gray-50 z-20">
          <span className="animate-spin text-[24px]">🗺️</span>
          <span className="text-[12px] font-sans">Cargando mapa de seguimiento...</span>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full z-10" />
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.12); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6); }
        }
      `}</style>
    </div>
  );
}
