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
}: TableManagementPageProps) {
  const isAdmin = role === 'ADMIN';
  
  // Estados de Filtros
  const [filterPeople, setFilterPeople] = useState<number | ''>('');
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState<boolean>(false);
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneFilter>('ALL');

  // Estados de Datos
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isZonesLoading, setIsZonesLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);

  // Estados de UI y Modales
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [reservingTable, setReservingTable] = useState<RestaurantTable | null>(null);
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

  // Filtrado Dinámico para todos los roles
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchZone = selectedZoneId === 'ALL' || t.zoneId === selectedZoneId;
      const matchPeople = filterPeople === '' || t.capacidad >= filterPeople;
      const matchAvailable = !filterOnlyAvailable || t.estado === 'LIBRE';
      return matchZone && matchPeople && matchAvailable;
    });
  }, [tables, selectedZoneId, filterPeople, filterOnlyAvailable]);

  const handleCreateZone = async (values: ZoneFormValues) => {
    setIsSubmittingForm(true);
    try {
      await tablesApi.createZone(values);
      setIsCreateZoneOpen(false);
      await loadZones();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Zona creada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleCreateTable = async (values: TableFormValues) => {
    setIsSubmittingForm(true);
    try {
      await tablesApi.createTable(values);
      setIsCreateTableOpen(false);
      await loadTables();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Mesa creada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleEditTable = async (values: TableFormValues) => {
    if (!editingTable) return;
    setIsSubmittingForm(true);
    try {
      await tablesApi.updateTable(editingTable.id, values);
      setEditingTable(null);
      await loadTables();
      setFeedback({ type: 'success', title: 'Éxito', message: 'Mesa actualizada correctamente.' });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setIsSubmittingForm(true);
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
      await loadTables(true);
    } catch (error) {
      setFeedback({ type: 'error', title: 'Error', message: (error as Error).message });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-background px-4 py-6 text-text flex flex-col font-sans">
      <div className="mx-auto flex h-full w-full max-w-screen-xl flex-col overflow-hidden">
        <div className="shrink-0">
          <button type="button" onClick={onBack} className="mb-4 text-[28px]">☰</button>
          <h1 className="text-title font-bold text-text">Gestión de mesas</h1>
          <p className="mt-1 text-[14px] leading-5 text-gray-500">Mapeo del salón y pedidos sincronizados con el backend.</p>
          
          <div className="mt-4"><TableSummaryCards tables={tables} /></div>

          {/* Filtros Globales (Admin, Mesero y Cliente) */}
          <div className="mt-6 grid gap-3 md:grid-cols-[auto_1fr_auto] items-end bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-50">
            <label className="block">
              <span className="text-[11px] font-black text-gray-400 uppercase">Capacidad Mín.</span>
              <input 
                type="number" 
                min="1" 
                value={filterPeople} 
                onChange={(e) => setFilterPeople(e.target.value === '' ? '' : Number(e.target.value))} 
                className="mt-2 w-24 rounded-xl border border-gray-100 bg-background p-3 text-[14px] font-bold outline-none focus:border-primary" 
              />
            </label>

            <div className="block">
              <span className="text-[11px] font-black text-gray-400 uppercase">Filtrar por Zona</span>
              {isZonesLoading ? (
                <div className="mt-2 h-12 w-full animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <div className="mt-2">
                  <ZoneFilterChips 
                    zones={zones} 
                    selectedZoneId={selectedZoneId} 
                    onSelectZone={setSelectedZoneId} 
                    onDeleteZone={isAdmin ? (z) => setConfirmState({ type: 'deleteZone', zone: z }) : undefined} 
                  />
                </div>
              )}
            </div>

            <label className="flex h-[50px] cursor-pointer items-center gap-3 rounded-xl bg-background px-4">
              <input 
                type="checkbox" 
                checked={filterOnlyAvailable} 
                onChange={(e) => setFilterOnlyAvailable(e.target.checked)} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
              />
              <span className="text-[14px] font-bold text-text">Solo disponibles</span>
            </label>
          </div>
          
          {isAdmin && (
            <div className="mt-4 flex gap-3">
              <button onClick={() => setIsCreateZoneOpen(true)} className="rounded-2xl bg-white px-4 py-3 font-semibold shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">+ Nueva zona</button>
              <button onClick={() => setIsCreateTableOpen(true)} disabled={zones.length === 0} className="rounded-2xl bg-primary px-4 py-3 font-semibold text-white shadow-md hover:bg-primary-hover transition-colors">+ Nueva mesa</button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-subtitle font-bold text-text uppercase tracking-tight">Distribución de Mesas</h2>
            <span className="text-[13px] font-medium text-gray-400">{filteredTables.length} mesas encontradas</span>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {isTablesLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 animate-pulse bg-white rounded-3xl" />)}
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm border border-dashed border-gray-200">
              <p className="text-[16px] font-bold text-gray-400">No hay mesas con estos filtros</p>
              <p className="mt-1 text-[13px] text-gray-300">Intenta cambiando la zona o la capacidad mínima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 pb-10">
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

      {/* Modales de Gestión */}
      <ZoneFormModal open={isCreateZoneOpen} onClose={() => setIsCreateZoneOpen(false)} onSubmit={handleCreateZone} isSubmitting={isSubmittingForm} />
      <TableFormModal open={isCreateTableOpen} mode="create" zones={zones} onClose={() => setIsCreateTableOpen(false)} onSubmit={handleCreateTable} isSubmitting={isSubmittingForm} />
      <TableFormModal open={Boolean(editingTable)} mode="edit" zones={zones} initialTable={editingTable || undefined} onClose={() => setEditingTable(null)} onSubmit={handleEditTable} isSubmitting={isSubmittingForm} />
      
      <ConfirmModal 
        open={Boolean(confirmState)} 
        title={confirmState?.type === 'delete' ? '¿Eliminar mesa?' : confirmState?.type === 'deleteZone' ? '¿Eliminar zona?' : '¿Cambiar estado?'} 
        description={confirmState?.type === 'delete' ? 'Esta acción no se puede deshacer.' : confirmState?.type === 'deleteZone' ? `Se eliminará la zona "${confirmState.zone.nombre}" y sus mesas.` : `La mesa ${confirmState?.table?.numero} cambiará a ${getStatusLabel(confirmState?.nextStatus || 'LIBRE')}.`} 
        confirmLabel={confirmState?.type === 'delete' || confirmState?.type === 'deleteZone' ? 'Eliminar' : 'Confirmar'} 
        onConfirm={handleConfirmAction} 
        onClose={() => setConfirmState(null)} 
        isLoading={isSubmittingForm} 
      />

      {/* MODAL DE RESERVA ÚNICO */}
      {reservingTable && (
        <ReservationModal 
          open={Boolean(reservingTable)} 
          onClose={() => setReservingTable(null)} 
          onSuccess={() => { void loadTables(true); }} 
          tableId={reservingTable.id} 
          tableNumber={reservingTable.numero} 
          tableCapacity={reservingTable.capacidad} 
          waiterId={user?.id || 1} 
        />
      )}

      <FeedbackModal open={Boolean(feedback)} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'info'} onClose={() => setFeedback(null)} />
    </main>
  );
}