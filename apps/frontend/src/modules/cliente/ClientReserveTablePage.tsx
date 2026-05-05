import { useEffect, useMemo, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { listTablesMock, listZonesMock } from '../../shared/mocks/tables.mock';
import type { AuthUser } from '../auth/types/auth.types';
import type { RestaurantTable, TableStatus, Zone, ZoneFilter } from '../tables/types/table.types';
import ClientLayout from './components/ClientLayout';
import { clientFlowApi } from './api/client-flow.api';
import type { ClientNavigationKey } from './types/client-flow.types';

interface ClientReserveTablePageProps {
  user: AuthUser;
  onLogout: () => void;
  onNavigate: (screen: ClientNavigationKey) => void;
  onBack?: () => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type BackendZone = {
  id_zona: number;
  nombre: string;
  activo?: boolean;
  activa?: boolean;
};

type BackendTable = {
  id_mesa: number;
  numero: number;
  capacidad: number;
  id_zona?: number | null;
  estado: TableStatus;
  activa?: boolean;
  activo?: boolean;
};

function mapBackendZone(zone: BackendZone): Zone {
  return {
    id: zone.id_zona,
    nombre: zone.nombre,
    activo: zone.activo ?? zone.activa ?? true,
  };
}

function mapBackendTable(table: BackendTable): RestaurantTable {
  return {
    id: table.id_mesa,
    numero: table.numero,
    capacidad: table.capacidad,
    zoneId: table.id_zona ?? 0,
    estado: table.estado,
    activo: table.activa ?? table.activo ?? true,
  };
}

function getStatusLabel(status: TableStatus) {
  switch (status) {
    case 'LIBRE':
      return 'Libre';
    case 'OCUPADA':
      return 'Ocupada';
    case 'RESERVADA':
      return 'Reservada';
    case 'CUENTA_SOLICITADA':
      return 'Cuenta solicitada';
    case 'FUERA_DE_SERVICIO':
      return 'Fuera de servicio';
  }
}

function getStatusStyles(status: TableStatus) {
  switch (status) {
    case 'LIBRE':
      return 'bg-success text-white';
    case 'OCUPADA':
      return 'bg-alert text-white';
    case 'RESERVADA':
      return 'bg-process text-white';
    case 'CUENTA_SOLICITADA':
      return 'bg-info text-white';
    case 'FUERA_DE_SERVICIO':
      return 'bg-gray-500 text-white';
  }
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClientReserveTablePage({
  user,
  onLogout,
  onNavigate,
  onBack,
}: ClientReserveTablePageProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneFilter>('ALL');
  const [people, setPeople] = useState(2);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [selectedInfoTable, setSelectedInfoTable] = useState<RestaurantTable | null>(null);
  const [reservingTable, setReservingTable] = useState<RestaurantTable | null>(null);
  const [reservationDate, setReservationDate] = useState(getTodayDate());
  const [reservationTime, setReservationTime] = useState('20:00');
  const [reservationNotes, setReservationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [zonesResponse, tablesResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/zonas`),
        fetch(`${API_URL}/api/admin/mesas`),
      ]);

      if (!zonesResponse.ok || !tablesResponse.ok) {
        throw new Error('Backend de mesas no disponible');
      }

      const [zonesData, tablesData] = await Promise.all([
        zonesResponse.json(),
        tablesResponse.json(),
      ]);

      setZones((zonesData as BackendZone[]).map(mapBackendZone).filter((zone) => zone.activo));
      setTables((tablesData as BackendTable[]).map(mapBackendTable).filter((table) => table.activo));
    } catch {
      const [mockZones, mockTables] = await Promise.all([listZonesMock(), listTablesMock()]);
      setZones(mockZones.filter((zone) => zone.activo));
      setTables(mockTables.filter((table) => table.activo));
      setFeedback({
        type: 'info',
        title: 'Modo visual con mocks',
        message: 'No se pudo cargar backend de mesas. Se muestran datos mock separados para defender el flujo del cliente.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesZone = selectedZoneId === 'ALL' || table.zoneId === selectedZoneId;
      const matchesCapacity = table.capacidad >= people;
      const matchesAvailability = !onlyAvailable || table.estado === 'LIBRE';
      return matchesZone && matchesCapacity && matchesAvailability;
    });
  }, [tables, selectedZoneId, people, onlyAvailable]);

  const zoneById = (zoneId: number) => zones.find((zone) => zone.id === zoneId);

  const handleReserve = async () => {
    if (!reservingTable) return;

    setIsSubmitting(true);
    try {
      await clientFlowApi.createReservation({
        userId: user.id,
        table: reservingTable,
        zone: zoneById(reservingTable.zoneId),
        people,
        date: reservationDate,
        time: reservationTime,
        observations: reservationNotes,
      });

      setFeedback({
        type: 'success',
        title: 'Reserva preparada',
        message: `La mesa ${reservingTable.numero} quedó reservada visualmente. Si backend responde, se guarda por API; si no, queda en mock/localStorage.`,
      });
      setReservingTable(null);
      setOpenActionMenuId(null);
      onNavigate('reservations');
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo reservar',
        message: error instanceof Error ? error.message : 'Ocurrió un error al registrar la reserva',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientLayout
      user={user}
      active="reserve-table"
      title="Reservar mesa"
      subtitle="Vista adaptada para cliente: solo información y acción de reserva, sin editar ni eliminar mesas."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 rounded-[1.5rem] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Cantidad de personas
              </span>
              <input
                type="number"
                min={1}
                value={people}
                onChange={(event) => setPeople(Math.max(1, Number(event.target.value) || 1))}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Zona
              </span>
              <select
                value={selectedZoneId}
                onChange={(event) =>
                  setSelectedZoneId(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
              >
                <option value="ALL">Todas las zonas</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-background px-4 py-3 text-[13px] font-semibold text-text">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(event) => setOnlyAvailable(event.target.checked)}
                className="h-4 w-4"
              />
              Solo disponibles
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-subtitle font-bold text-text">Mesas disponibles</h2>
          <span className="text-[13px] font-medium text-gray-500">
            {filteredTables.length} resultados
          </span>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando mesas...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">No hay mesas para ese filtro</p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">
                Cambia la capacidad, la zona o desactiva el filtro de disponibilidad.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTables.map((table) => {
                const zone = zoneById(table.zoneId);
                const canReserve = table.estado === 'LIBRE';

                return (
                  <article key={table.id} className={`relative rounded-[1.5rem] p-4 shadow-sm ${getStatusStyles(table.estado)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[20px] font-bold">Mesa {table.numero}</p>
                        <p className="mt-1 text-[13px] font-medium opacity-90">
                          {zone?.nombre ?? 'Sin zona'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenActionMenuId((currentId) => (currentId === table.id ? null : table.id))
                        }
                        className="rounded-full px-2 py-1 text-[20px] leading-none transition-colors hover:bg-white/15"
                        aria-label="Abrir opciones de mesa"
                      >
                        ⋮
                      </button>
                    </div>

                    <div className="mt-5 space-y-1">
                      <p className="text-[13px] font-medium opacity-90">
                        Capacidad: {table.capacidad} personas
                      </p>
                      <p className="text-[13px] font-semibold">
                        Estado: {getStatusLabel(table.estado)}
                      </p>
                    </div>

                    {openActionMenuId === table.id && (
                      <div className="absolute right-3 top-12 z-20 min-w-[190px] overflow-hidden rounded-2xl bg-white text-text shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInfoTable(table);
                            setOpenActionMenuId(null);
                          }}
                          className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
                        >
                          Ver información
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReservingTable(table);
                            setOpenActionMenuId(null);
                          }}
                          disabled={!canReserve}
                          className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reservar mesa
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedInfoTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-xl">
            <h2 className="text-[22px] font-bold text-text">Mesa {selectedInfoTable.numero}</h2>
            <div className="mt-4 space-y-2 text-[14px] text-gray-600">
              <p>Zona: {zoneById(selectedInfoTable.zoneId)?.nombre ?? 'Sin zona'}</p>
              <p>Capacidad: {selectedInfoTable.capacidad} personas</p>
              <p>Estado: {getStatusLabel(selectedInfoTable.estado)}</p>
              <p className="rounded-2xl bg-background p-3 text-[13px] leading-5">
                El cliente no tiene acciones administrativas. Desde esta vista solo puede consultar y reservar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInfoTable(null)}
              className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {reservingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-xl">
            <h2 className="text-[22px] font-bold text-text">Reservar mesa {reservingTable.numero}</h2>
            <p className="mt-1 text-[14px] text-gray-500">
              {zoneById(reservingTable.zoneId)?.nombre ?? 'Sin zona'} · capacidad {reservingTable.capacidad}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Fecha</span>
                <input
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Hora</span>
                <input
                  type="time"
                  value={reservationTime}
                  onChange={(event) => setReservationTime(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Observaciones
              </span>
              <textarea
                value={reservationNotes}
                onChange={(event) => setReservationNotes(event.target.value)}
                placeholder="Ej. Cerca de ventana, silla para niño, etc."
                className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setReservingTable(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-background px-4 py-3 text-[14px] font-bold text-text transition-colors hover:bg-black/5 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReserve}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                Confirmar reserva
              </button>
            </div>
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
