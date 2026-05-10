import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { TableCard } from './components/TableCard';
import { TableFormModal } from './components/TableFormModal';
import { ReservationModal } from './components/ReservationModal';
import { TableSummaryCards } from './components/TableSummaryCards';
import { ZoneFilterChips } from './components/ZoneFilterChips';
import { ZoneFormModal } from './components/ZoneFormModal';

import { tablesApi } from '../../shared/api/tables.api';
import { ordersApi } from '../../shared/api/orders.api';
import { clientFlowApi } from '../../shared/api/client-flow.api';
import { getEffectiveTableStatus } from '../../shared/mocks/tables.mock';
import { pusherClient } from '../../shared/utils/pusher';
import { 
  RESTAURANT_STATE_CHANGED_EVENT, 
} from '../../shared/utils/events';

import type { AuthUser } from '../auth/types/auth.types';
import type { ClientNavigationKey } from '../../shared/types/client-flow.types';
import type {
  RestaurantTable,
  TableFormValues,
  TableStatus,
  Zone,
  ZoneFilter,
  ZoneFormValues,
} from './types/table.types';

interface TableManagementPageProps {
  role: 'ADMIN' | 'MESERO' | 'CLIENTE';
  onBack: () => void;
  onOpenTableOrder?: (tableId: number) => void;
  user?: AuthUser;
  onNavigate?: (screen: ClientNavigationKey) => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type ConfirmState =
  | { type: 'delete'; table: RestaurantTable }
  | { type: 'deleteZone'; zone: Zone }
  | { type: 'status'; table: RestaurantTable; nextStatus: TableStatus }
  | null;

function getStatusLabel(status: TableStatus) {
  const labels: Record<TableStatus, string> = {
    'LIBRE': 'libre',
    'OCUPADA': 'ocupada',
    'RESERVADA': 'reservada',
    'CUENTA_SOLICITADA': 'cuenta solicitada',
    'FUERA_DE_SERVICIO': 'fuera de servicio'
  };
  return labels[status];
}

export default function TableManagementPage({
  role,
  onBack,
  onOpenTableOrder,
  user,
  onNavigate,
}: TableManagementPageProps) {
  const isAdmin = role === 'ADMIN';
  const isClient = role === 'CLIENTE';

  const [filterPeople, setFilterPeople] = useState<number | ''>(2);
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState<boolean>(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isZonesLoading, setIsZonesLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneFilter>('ALL');
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isSubmittingZoneForm, setIsSubmittingZoneForm] = useState(false);
  const [isSubmittingTableForm, setIsSubmittingTableForm] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [reservingTable, setReservingTable] = useState<RestaurantTable | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadZones = useCallback(async () => {
    setIsZonesLoading(true);
    try {
      const data = await tablesApi.listZones();
      setZones(data);
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsZonesLoading(false);
    }
  }, []);

  const loadTables = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setIsTablesLoading(true);
    try {
      const baseTables = await tablesApi.listTables();
      const [activeOrders, reservations] = await Promise.all([
        ordersApi.listActiveOrders(),
        clientFlowApi.listAllReservations(),
      ]);

      const updatedTables = baseTables.map((table) => ({
        ...table,
        estado: getEffectiveTableStatus(table, activeOrders, reservations),
      }));

      setTables(updatedTables);
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      if (!isBackgroundRefresh) setIsTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
    loadTables();
  }, [loadZones, loadTables]);

  useEffect(() => {
    const handleStateChange = () => loadTables(true);
    const tablesChannel = pusherClient.subscribe('tables-channel');
    tablesChannel.bind('table-updated', () => loadTables(true));

    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
    return () => {
      tablesChannel.unbind('table-updated');
      pusherClient.unsubscribe('tables-channel');
      window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
    };
  }, [loadTables]);

  const filteredTables = useMemo(() => {
    let result = tables;
    if (selectedZoneId !== 'ALL') result = result.filter((t) => t.zoneId === selectedZoneId);
    if (isClient) {
      if (filterPeople !== '') result = result.filter((t) => t.capacidad >= filterPeople);
      if (filterOnlyAvailable) result = result.filter((t) => t.estado === 'LIBRE');
    }
    return result;
  }, [tables, selectedZoneId, isClient, filterPeople, filterOnlyAvailable]);

  const handleCreateZone = async (values: ZoneFormValues) => {
    setIsSubmittingZoneForm(true);
    try {
      await tablesApi.createZone(values);
      setIsCreateZoneOpen(false);
      await loadZones();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Zona creada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingZoneForm(false);
    }
  };

  const handleCreateTable = async (values: TableFormValues) => {
    setIsSubmittingTableForm(true);
    try {
      await tablesApi.createTable(values);
      setIsCreateTableOpen(false);
      await loadTables();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Mesa creada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingTableForm(false);
    }
  };

  const handleEditTable = async (values: TableFormValues) => {
    if (!editingTable) return;
    setIsSubmittingTableForm(true);
    try {
      await tablesApi.updateTable(editingTable.id, values);
      setEditingTable(null);
      await loadTables();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Mesa actualizada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingTableForm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setIsConfirming(true);
    try {
      if (confirmState.type === 'delete') {
        await tablesApi.deleteTable(confirmState.table.id);
      } else if (confirmState.type === 'deleteZone') {
        await tablesApi.deleteZone(confirmState.zone.id);
        if (selectedZoneId === confirmState.zone.id) setSelectedZoneId('ALL');
      } else if (confirmState.type === 'status') {
        await tablesApi.updateStatus(confirmState.table.id, confirmState.nextStatus);
      }
      setConfirmState(null);
      await loadZones();
      await loadTables();
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReservationConfirm = async (mes: string, dia: string, horaInicio: string) => {
    if (!reservingTable) return;
    setIsConfirming(true);
    try {
      const currentYear = new Date().getFullYear();
      const monthIndex = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'].indexOf(mes) + 1;
      const formattedDate = `${currentYear}-${String(monthIndex).padStart(2, '0')}-${dia.padStart(2, '0')}`;
      
      await clientFlowApi.createReservation({
        userId: user?.id || 1,
        table: reservingTable,
        zone: zones.find(z => z.id === reservingTable.zoneId),
        people: reservingTable.capacidad,
        date: formattedDate,
        time: horaInicio,
        observations: role === 'CLIENTE' ? 'Reserva cliente.' : 'Reserva personal.',
      });

      setReservingTable(null);
      await loadTables();
      if (isClient && onNavigate) onNavigate('reservations');
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-background px-4 py-6 text-text flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-screen-xl flex-col overflow-hidden">
        <div className="shrink-0">
          <button type="button" onClick={onBack} className="mb-4 text-[28px]">☰</button>
          <h1 className="text-title font-bold">Gestión de mesas</h1>
          <p className="mt-1 text-[14px] leading-5 text-gray-500">Administra el salón y gestiona pedidos utilizando los datos del backend.</p>
          <div className="mt-4"><TableSummaryCards tables={tables} /></div>
          
          {isAdmin && (
            <div className="mt-4 flex gap-3">
              <button onClick={() => setIsCreateZoneOpen(true)} className="rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm transition-colors hover:bg-black/5">+ Nueva zona</button>
              <button onClick={() => setIsCreateTableOpen(true)} disabled={zones.length === 0} className="rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-hover">+ Nueva mesa</button>
            </div>
          )}

          {isClient ? (
            <div className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">CANTIDAD DE PERSONAS</span>
                  <input type="number" min="1" value={filterPeople} onChange={(e) => setFilterPeople(e.target.value === '' ? '' : Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-[14px] font-medium outline-none transition-colors focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-gray-500">ZONA</span>
                  <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium outline-none transition-colors focus:border-primary">
                    <option value="ALL">Todas las zonas</option>
                    {zones.map((zone) => (<option key={zone.id} value={zone.id}>{zone.nombre}</option>))}
                  </select>
                </label>
                <label className="flex h-[50px] cursor-pointer items-center gap-3 rounded-2xl bg-background px-4">
                  <input type="checkbox" checked={filterOnlyAvailable} onChange={(e) => setFilterOnlyAvailable(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-[14px] font-bold text-text">Solo disponibles</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {isZonesLoading ? (<div className="rounded-2xl bg-white px-4 py-3 text-[14px] text-gray-500">Cargando zonas...</div>) : (
                <ZoneFilterChips zones={zones} selectedZoneId={selectedZoneId} onSelectZone={setSelectedZoneId} onDeleteZone={isAdmin ? (z) => setConfirmState({ type: 'deleteZone', zone: z }) : undefined} />
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-subtitle font-bold text-text">Mesas</h2>
            <span className="text-[13px] font-medium text-gray-500">{filteredTables.length} resultados</span>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {isTablesLoading ? (<p className="p-5 text-gray-500">Cargando mesas...</p>) : filteredTables.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">No hay mesas en esta zona</p>
              <p className="mt-2 text-[14px] text-gray-500">Prueba con otra zona o reserva.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {filteredTables.map((table) => (
                <TableCard 
                  key={table.id} 
                  table={table} 
                  role={role} 
                  zone={zones.find(z => z.id === table.zoneId)} 
                  menuOpen={openActionMenuId === table.id}
                  onToggleMenu={() => setOpenActionMenuId(openActionMenuId === table.id ? null : table.id)}
                  onEdit={() => setEditingTable(table)}
                  onDelete={() => setConfirmState({ type: 'delete', table })}
                  onChangeStatus={(s) => s === 'RESERVADA' ? setReservingTable(table) : setConfirmState({ type: 'status', table, nextStatus: s })}
                  onManageOrder={() => onOpenTableOrder?.(table.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ZoneFormModal open={isCreateZoneOpen} onClose={() => setIsCreateZoneOpen(false)} onSubmit={handleCreateZone} isSubmitting={isSubmittingZoneForm} />
      <TableFormModal open={isCreateTableOpen} mode="create" zones={zones} onClose={() => setIsCreateTableOpen(false)} onSubmit={handleCreateTable} isSubmitting={isSubmittingTableForm} />
      <TableFormModal open={Boolean(editingTable)} mode="edit" zones={zones} initialTable={editingTable} onClose={() => setEditingTable(null)} onSubmit={handleEditTable} isSubmitting={isSubmittingTableForm} />
      <ConfirmModal open={Boolean(confirmState)} title={confirmState?.type === 'delete' ? '¿Eliminar mesa?' : confirmState?.type === 'deleteZone' ? '¿Eliminar zona?' : '¿Cambiar estado?'} description={confirmState?.type === 'delete' ? 'Esta acción no se puede deshacer.' : confirmState?.type === 'deleteZone' ? `Esta acción eliminará la zona "${confirmState.zone.nombre}" y todas sus mesas asociadas.` : confirmState?.type === 'status' ? `La mesa ${confirmState.table.numero} cambiará a estado ${getStatusLabel(confirmState.nextStatus)}.` : ''} confirmLabel={confirmState?.type === 'delete' || confirmState?.type === 'deleteZone' ? 'Eliminar' : 'Confirmar'} onConfirm={handleConfirmAction} onClose={() => setConfirmState(null)} isLoading={isConfirming} />
      <ReservationModal open={Boolean(reservingTable)} onConfirm={handleReservationConfirm} onClose={() => setReservingTable(null)} isLoading={isConfirming} />
      <FeedbackModal open={Boolean(feedback)} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'info'} onClose={() => setFeedback(null)} />
    </main>
  );
}