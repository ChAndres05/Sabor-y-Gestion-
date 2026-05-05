import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import type { AuthUser } from '../auth/types/auth.types';
import ClientLayout from './components/ClientLayout';
import { clientFlowApi } from './api/client-flow.api';
import type {
  ClientNavigationKey,
  ClientOrderItem,
  ClientReservation,
  ClientReservationStatus,
} from './types/client-flow.types';

interface ClientReservationsPageProps {
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

type ReservationTab = 'active' | 'history';

const preparedOrderOptions: ClientOrderItem[] = [
  {
    id: 1,
    name: 'Pique macho especial',
    quantity: 1,
    unitPrice: 45,
    subtotal: 45,
  },
  {
    id: 2,
    name: 'Jugo natural',
    quantity: 2,
    unitPrice: 18,
    subtotal: 36,
  },
  {
    id: 3,
    name: 'Brownie con helado',
    quantity: 1,
    unitPrice: 22,
    subtotal: 22,
  },
];

function getStatusLabel(status: ClientReservationStatus) {
  switch (status) {
    case 'CONFIRMADA':
      return 'Confirmada';
    case 'CANCELADA':
      return 'Cancelada';
    case 'COMPLETADA':
      return 'Completada';
  }
}

function getStatusClass(status: ClientReservationStatus) {
  switch (status) {
    case 'CONFIRMADA':
      return 'bg-success/10 text-success';
    case 'CANCELADA':
      return 'bg-alert/10 text-alert';
    case 'COMPLETADA':
      return 'bg-info/10 text-info';
  }
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

export default function ClientReservationsPage({
  user,
  onLogout,
  onNavigate,
  onBack,
}: ClientReservationsPageProps) {
  const [reservations, setReservations] = useState<ClientReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReservationTab>('active');
  const [selectedReservation, setSelectedReservation] = useState<ClientReservation | null>(null);
  const [addingOrderToReservation, setAddingOrderToReservation] = useState<ClientReservation | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [orderNotes, setOrderNotes] = useState('Preparar cerca de la hora de reserva.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadReservations = async () => {
    setIsLoading(true);
    try {
      const data = await clientFlowApi.listReservations(user.id);
      setReservations(data);
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudieron cargar reservas',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [user.id]);

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'CONFIRMADA'),
    [reservations]
  );

  const historyReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status !== 'CONFIRMADA'),
    [reservations]
  );

  const visibleReservations = activeTab === 'active' ? activeReservations : historyReservations;

  const selectedPreparedItems = preparedOrderOptions.filter((item) => selectedItems[item.id]);
  const selectedPreparedTotal = selectedPreparedItems.reduce((total, item) => total + item.subtotal, 0);

  const handleCancelReservation = async (reservation: ClientReservation) => {
    setIsSubmitting(true);
    try {
      await clientFlowApi.cancelReservation(user.id, reservation.id);
      await loadReservations();
      setFeedback({
        type: 'success',
        title: 'Reserva cancelada',
        message: `La reserva de la mesa ${reservation.tableNumber} se marcó como cancelada.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo cancelar',
        message: error instanceof Error ? error.message : 'Ocurrió un error al cancelar la reserva',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePreparedOrder = async () => {
    if (!addingOrderToReservation) return;

    if (selectedPreparedItems.length === 0) {
      setFeedback({
        type: 'info',
        title: 'Selecciona productos',
        message: 'Debes dejar al menos un producto seleccionado para simular el pedido asociado.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await clientFlowApi.createPreparedReservationOrder({
        userId: user.id,
        reservationId: addingOrderToReservation.id,
        items: selectedPreparedItems,
        notes: orderNotes,
      });
      await loadReservations();
      setAddingOrderToReservation(null);
      setFeedback({
        type: 'success',
        title: 'Pedido de reserva preparado',
        message: 'Se creó un pedido mock asociado a la reserva. La cocina puede mostrarlo luego con hora de preparación.',
      });
      onNavigate('orders');
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo crear el pedido',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientLayout
      user={user}
      active="reservations"
      title="Mis reservas"
      subtitle="Reservas activas por defecto, con historial y flujo preparado para pedido asociado."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 rounded-[1.5rem] bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors ${
                activeTab === 'active' ? 'bg-primary text-white' : 'text-text hover:bg-black/5'
              }`}
            >
              Activas ({activeReservations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors ${
                activeTab === 'history' ? 'bg-primary text-white' : 'text-text hover:bg-black/5'
              }`}
            >
              Historial ({historyReservations.length})
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando reservas...
            </div>
          ) : visibleReservations.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">
                {activeTab === 'active' ? 'No tienes reservas activas' : 'No hay historial de reservas'}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">
                Puedes crear una reserva desde la opción Reservar mesa.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('reserve-table')}
                className="mt-4 rounded-2xl bg-primary px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Reservar mesa
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleReservations.map((reservation) => (
                <article key={reservation.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[20px] font-bold text-text">Mesa {reservation.tableNumber}</p>
                      <p className="mt-1 text-[13px] font-medium text-gray-500">
                        {reservation.zoneName} · {reservation.people} personas
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[12px] font-bold ${getStatusClass(
                        reservation.status
                      )}`}
                    >
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-[14px] text-gray-600 sm:grid-cols-2">
                    <p>Fecha: {formatDate(reservation.date)}</p>
                    <p>Hora: {reservation.time}</p>
                    <p className="sm:col-span-2">
                      Observaciones: {reservation.observations || 'Sin observaciones'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReservation(reservation)}
                      className="rounded-2xl bg-background px-4 py-2 text-[13px] font-bold text-text transition-colors hover:bg-black/5"
                    >
                      Ver detalle
                    </button>

                    {reservation.status === 'CONFIRMADA' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAddingOrderToReservation(reservation)}
                          className="rounded-2xl bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
                        >
                          Añadir pedido
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleCancelReservation(reservation)}
                          disabled={isSubmitting}
                          className="rounded-2xl bg-alert/10 px-4 py-2 text-[13px] font-bold text-alert transition-colors hover:bg-alert/20 disabled:opacity-60"
                        >
                          Cancelar reserva
                        </button>
                      </>
                    )}

                    {reservation.linkedOrderId && (
                      <button
                        type="button"
                        onClick={() => onNavigate('orders')}
                        className="rounded-2xl bg-info/10 px-4 py-2 text-[13px] font-bold text-info transition-colors hover:bg-info/20"
                      >
                        Ver pedido asociado
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-xl">
            <h2 className="text-[22px] font-bold text-text">Detalle de reserva</h2>
            <div className="mt-4 space-y-2 text-[14px] leading-6 text-gray-600">
              <p>Mesa: {selectedReservation.tableNumber}</p>
              <p>Zona: {selectedReservation.zoneName}</p>
              <p>Fecha y hora: {formatDate(selectedReservation.date)} · {selectedReservation.time}</p>
              <p>Personas: {selectedReservation.people}</p>
              <p>Estado: {getStatusLabel(selectedReservation.status)}</p>
              <p>Observaciones: {selectedReservation.observations || 'Sin observaciones'}</p>
              <p className="rounded-2xl bg-background p-3 text-[13px] leading-5">
                Flujo preparado: esta reserva puede asociarse después a un pedido de reserva y mostrarse en cocina con hora sugerida de preparación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReservation(null)}
              className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {addingOrderToReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-xl">
            <h2 className="text-[22px] font-bold text-text">Añadir pedido a reserva</h2>
            <p className="mt-1 text-[14px] leading-5 text-gray-500">
              Mesa {addingOrderToReservation.tableNumber} · {formatDate(addingOrderToReservation.date)} · {addingOrderToReservation.time}
            </p>

            <div className="mt-5 space-y-2">
              {preparedOrderOptions.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3 text-[14px]"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedItems[item.id])}
                      onChange={(event) =>
                        setSelectedItems((current) => ({
                          ...current,
                          [item.id]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="block font-bold text-text">{item.quantity} x {item.name}</span>
                      <span className="text-[12px] text-gray-500">Mock reemplazable por menú real</span>
                    </span>
                  </span>
                  <span className="font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Nota para cocina
              </span>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                className="mt-2 min-h-[80px] w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-primary"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-info/10 p-4 text-[13px] leading-5 text-info">
              Total simulado: <strong>{formatCurrency(selectedPreparedTotal)}</strong>. En cocina debería verse como pedido de reserva, no como pedido normal de mesa ocupada.
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setAddingOrderToReservation(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-background px-4 py-3 text-[14px] font-bold text-text transition-colors hover:bg-black/5 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreatePreparedOrder}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                Crear pedido
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
