import { useEffect, useMemo, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { clientFlowApi } from '../../shared/api/client-flow.api';
import type {
  ClientReservation,
  ClientReservationStatus,
} from '../../shared/types/client-flow.types';

interface AdminReservationsPageProps {
  onBack: () => void;
  onOpenReservationOrder?: (reservationId: number) => void;
  onViewOrder?: (tableId: number) => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type ReservationTab = 'active' | 'history';

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

export default function AdminReservationsPage({ 
  onBack, 
  onOpenReservationOrder, 
  onViewOrder 
}: AdminReservationsPageProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [reservations, setReservations] = useState<ClientReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReservationTab>('active');
  const [selectedReservation, setSelectedReservation] = useState<ClientReservation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await clientFlowApi.listAllReservations();
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
  }, []);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'CONFIRMADA'),
    [reservations]
  );

  const historyReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status !== 'CONFIRMADA'),
    [reservations]
  );

  const visibleReservations = activeTab === 'active' ? activeReservations : historyReservations;

  const handleCancelReservation = async (reservation: ClientReservation) => {
    setIsSubmitting(true);
    try {
      await clientFlowApi.cancelReservation(reservation.userId, reservation.id);
      
      const response = await fetch(`${API_URL}/api/admin/mesas/${reservation.tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'LIBRE' }),
      });
      
      if (!response.ok) {
        console.warn('No se pudo liberar la mesa en el backend de mesas.');
      }

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

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text"
            aria-label="Volver"
          >
            ←
          </button>
        </div>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Gestión de reservas</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            Vista administrativa de todas las reservas registradas.
          </p>
        </header>

        <div className="mb-4 rounded-2xl bg-white/60 p-1 shadow-sm md:w-max">
          <div className="grid grid-cols-2 gap-1 md:flex md:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`rounded-xl px-4 py-2 text-[12px] font-bold transition-colors md:px-6 ${
                activeTab === 'active' ? 'bg-white text-text shadow-sm' : 'text-gray-500 hover:bg-white/60'
              }`}
            >
              Activas ({activeReservations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-xl px-4 py-2 text-[12px] font-bold transition-colors md:px-6 ${
                activeTab === 'history' ? 'bg-white text-text shadow-sm' : 'text-gray-500 hover:bg-white/60'
              }`}
            >
              Historial ({historyReservations.length})
            </button>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="rounded-[1.5rem] bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando reservas...
            </div>
          ) : visibleReservations.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">
                {activeTab === 'active' ? 'No hay reservas activas en el sistema' : 'No hay historial de reservas'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleReservations.map((reservation) => (
                <article key={reservation.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[20px] font-bold text-text">Mesa {reservation.tableNumber}</p>
                      <p className="mt-1 text-[13px] font-medium text-gray-500">
                        Usuario ID: {reservation.userId} · {reservation.zoneName} · {reservation.people} personas
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
                          onClick={() => {
                            if (onOpenReservationOrder) onOpenReservationOrder(reservation.id);
                          }}
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
                        onClick={() => {
                          if (onViewOrder) onViewOrder(reservation.tableId);
                        }}
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
              <p>Usuario ID: {selectedReservation.userId}</p>
              <p>Observaciones: {selectedReservation.observations || 'Sin observaciones'}</p>
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

      <FeedbackModal
        open={Boolean(feedback)}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        type={feedback?.type ?? 'info'}
        onClose={() => setFeedback(null)}
      />
    </main>
  );
}
