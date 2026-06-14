import { useEffect, useRef, useState } from 'react';

interface OrderTrackingMapProps {
  orderId: number;
  status: string;
}

export default function OrderTrackingMap({ orderId, status }: OrderTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const motoMarkerRef = useRef<any>(null);

  // Load Leaflet resources dynamically from CDN
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
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

  // Initialize and update the map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const startLat = -17.391537153336852;
    const startLng = -66.15233613739282;

    // Calculate a stable/deterministic end coordinate based on orderId
    const angle = (orderId * 97) % 360;
    const radius = 0.007 + ((orderId % 5) * 0.0015); // ~1 to 1.5 km
    const endLat = startLat + radius * Math.sin((angle * Math.PI) / 180);
    const endLng = startLng + radius * Math.cos((angle * Math.PI) / 180);

    const start: [number, number] = [startLat, startLng];
    const end: [number, number] = [endLat, endLng];

    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView(start, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Custom house/restaurant icon
      const restaurantIcon = L.divIcon({
        html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">🍕</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Custom client address icon
      const clientIcon = L.divIcon({
        html: `<div style="background-color: #10b981; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">📍</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker(start, { icon: restaurantIcon }).addTo(map).bindPopup('<b>Sabor y Gestión</b><br/>Origen del Pedido');
      L.marker(end, { icon: clientIcon }).addTo(map).bindPopup('<b>Cliente</b><br/>Destino de Entrega');

      // Create a grid-styled route representing city blocks
      const midLat = startLat + (endLat - startLat) * 0.5;
      const pathPoints = [
        start,
        [midLat, startLng] as [number, number],
        [midLat, endLng] as [number, number],
        end,
      ];

      L.polyline(pathPoints, {
        color: '#3b82f6',
        weight: 4.5,
        opacity: 0.75,
        dashArray: '5, 8',
      }).addTo(map);

      map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] });

      mapRef.current = map;
      mapRef.current.pathPoints = pathPoints;
    }

    const map = mapRef.current;
    const pathPoints = map.pathPoints;

    const motoIcon = L.divIcon({
      html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); animation: pulse 1.5s infinite">🛵</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (status === 'EN_CAMINO') {
      if (motoMarkerRef.current) {
        map.removeLayer(motoMarkerRef.current);
      }

      let segmentIdx = 0;
      let ratio = 0;

      const getInterpolatedPoint = (seg: number, rat: number) => {
        const p1 = pathPoints[seg];
        const p2 = pathPoints[seg + 1];
        return [
          p1[0] + (p2[0] - p1[0]) * rat,
          p1[1] + (p2[1] - p1[1]) * rat,
        ] as [number, number];
      };

      const marker = L.marker(getInterpolatedPoint(0, 0), { icon: motoIcon })
        .addTo(map)
        .bindPopup('<b>Repartidor en Camino</b><br/>Siga la ubicación en tiempo real.')
        .openPopup();

      motoMarkerRef.current = marker;

      const timer = setInterval(() => {
        ratio += 0.04;
        if (ratio >= 1) {
          ratio = 0;
          segmentIdx += 1;
        }
        if (segmentIdx >= pathPoints.length - 1) {
          clearInterval(timer);
          marker.setLatLng(end);
          return;
        }
        const currentCoord = getInterpolatedPoint(segmentIdx, ratio);
        marker.setLatLng(currentCoord);
      }, 250);

      return () => {
        clearInterval(timer);
      };
    } else {
      let finalCoord = start;
      if (['ENTREGADO', 'PAGADO'].includes(status)) {
        finalCoord = end;
      }

      if (motoMarkerRef.current) {
        motoMarkerRef.current.setLatLng(finalCoord);
      } else {
        motoMarkerRef.current = L.marker(finalCoord, { icon: motoIcon }).addTo(map);
      }
    }
  }, [leafletLoaded, orderId, status]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 h-[240px] w-full mt-4">
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-bold gap-2">
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
