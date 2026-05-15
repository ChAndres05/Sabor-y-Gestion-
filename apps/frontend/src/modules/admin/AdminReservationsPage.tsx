import { useEffect, useMemo, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { clientFlowApi } from '../../shared/api/client-flow.api';
import type { ClientReservation, ClientReservationStatus } from '../../shared/types/client-flow.types';
import { RESTAURANT_STATE_CHANGED_EVENT } from '../../shared/utils/events';

interface AdminReservationsPageProps {
  onBack: () => void;
  onOpenReservationOrder?: (reservationId: number) => void;
  onViewOrder?: (tableId: number) => void;
}

type FeedbackState = { type: 'success' | 'error' | 'info'; title: string; message: string; } | null;
type ReservationTab = 'active' | 'history';

function getStatusLabel(status: ClientReservationStatus) {
  const labels: Record<ClientReservationStatus, string> = {
    'CONFIRMADA': 'Confirmada',
    'CANCELADA': 'Cancelada',
    'COMPLETADA': 'Completada'
  };
  return labels[status] || status;
}

function getStatusClass(status: ClientReservationStatus) {
  if (status === 'CONFIRMADA') return 'bg-success/10 text-success';
  if (status === 'CANCELADA') return 'bg-alert/10 text-alert';
  return 'bg-info/10 text-info';
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function AdminReservationsPage({ onBack, onOpenReservationOrder, onViewOrder }: AdminReservationsPageProps) {
  const [reservations, setReservations] = useState<ClientReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReservationTab>('active');
  const [selectedReservation, setSelectedReservation] = useState<ClientReservation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadReservations = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsLoading(true);
    try {
      const data = await clientFlowApi.listAllReservations();
      setReservations(data);
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      if (!isBackgroundRefresh) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, () => loadReservations(true));
    return () => window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, () => loadReservations(true));
  }, [loadReservations]);

  const activeReservations = useMemo(() => reservations.filter(r => r.status === 'CONFIRMADA'), [reservations]);
  const historyReservations = useMemo(() => reservations.filter(r => r.status !== 'CONFIRMADA'), [reservations]);
  const visibleReservations = activeTab === 'active' ? activeReservations : historyReservations;

  const handleCancelReservation = async (reservation: ClientReservation) => {
    setIsSubmitting(true);
    try {
      await clientFlowApi.cancelReservation(reservation.userId, reservation.id);
      await loadReservations();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Reserva cancelada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text"
            aria-label="Menú"
          >
            ☰
          </button>
        </div>
        <header className="mb-4">
          <h1 className="text-title font-bold">Gestión de reservas</h1>
          <p className="text-gray-500">Vista administrativa de reservas reales del backend.</p>
        </header>

        <div className="mb-6 flex gap-2 rounded-2xl bg-white/60 p-1 shadow-sm w-fit">
          <button onClick={() => setActiveTab('active')} className={`rounded-xl px-6 py-2 text-[12px] font-bold ${activeTab === 'active' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            Activas ({activeReservations.length})
          </button>
          <button onClick={() => setActiveTab('history')} className={`rounded-xl px-6 py-2 text-[12px] font-bold ${activeTab === 'history' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            Historial ({historyReservations.length})
          </button>
        </div>

        {isLoading ? (
          <p className="text-center p-10 text-gray-500 text-[14px]">Sincronizando con el servidor...</p>
        ) : visibleReservations.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-10 text-center shadow-sm">
            <p className="font-semibold">No se encontraron reservas {activeTab === 'active' ? 'activas' : 'en el historial'}.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleReservations.map((res) => (
              <article key={res.id} className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[20px] font-bold">Mesa {res.tableNumber}</p>
                    <p className="text-[13px] text-gray-500">{res.zoneName} · {res.people} personas</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusClass(res.status)}`}>
                    {getStatusLabel(res.status)}
                  </span>
                </div>
                <div className="mt-4 text-[14px] text-gray-600 border-t border-gray-50 pt-4">
                  <p><b>Fecha:</b> {formatDate(res.date)}</p>
                  <p><b>Hora:</b> {res.time}</p>
                  <p className="mt-2 text-gray-400">"{res.observations || 'Sin observaciones'}"</p>
                </div>
                <div className="mt-5 flex gap-2 flex-wrap">
                  <button onClick={() => setSelectedReservation(res)} className="rounded-2xl bg-background px-4 py-2 text-[12px] font-bold">Detalles</button>
                  {res.status === 'CONFIRMADA' && (
                    <>
                      <button onClick={() => onOpenReservationOrder?.(res.id)} className="rounded-2xl bg-primary px-4 py-2 text-[12px] font-bold text-white">Añadir pedido</button>
                      <button onClick={() => handleCancelReservation(res)} disabled={isSubmitting} className="rounded-2xl bg-alert/10 px-4 py-2 text-[12px] font-bold text-alert">Cancelar</button>
                    </>
                  )}
                  {res.linkedOrderId && (
                    <button onClick={() => onViewOrder?.(res.tableId)} className="rounded-2xl bg-info/10 px-4 py-2 text-[12px] font-bold text-info">Ver pedido</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
            <h2 className="text-[24px] font-bold">Detalle de reserva</h2>
            <div className="mt-6 space-y-3 text-[15px]">
              <p><b>Mesa:</b> {selectedReservation.tableNumber} ({selectedReservation.zoneName})</p>
              <p><b>Fecha/Hora:</b> {formatDate(selectedReservation.date)} a las {selectedReservation.time}</p>
              <p><b>Comensales:</b> {selectedReservation.people}</p>
              <p><b>Estado:</b> {getStatusLabel(selectedReservation.status)}</p>
              <p><b>ID Usuario:</b> {selectedReservation.userId}</p>
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-gray-500 italic">
                {selectedReservation.observations || 'Sin observaciones adicionales.'}
              </div>
            </div>
            <button onClick={() => setSelectedReservation(null)} className="mt-8 w-full rounded-2xl bg-primary py-4 font-bold text-white">Cerrar</button>
          </div>
        </div>
      )}

      <FeedbackModal open={Boolean(feedback)} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'info'} onClose={() => setFeedback(null)} />
    </main>
  );
}