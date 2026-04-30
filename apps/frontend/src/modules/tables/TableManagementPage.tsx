import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { TableCard } from './components/TableCard';
import { TableFormModal } from './components/TableFormModal';
import { TableSummaryCards } from './components/TableSummaryCards';
import { ZoneFilterChips } from './components/ZoneFilterChips';
import { ZoneFormModal } from './components/ZoneFormModal';
import type {
  RestaurantTable,
  TableFormValues,
  TableStatus,
  Zone,
  ZoneFilter,
  ZoneFormValues,
} from './types/table.types';

interface TableManagementPageProps {
  role: 'ADMIN' | 'MESERO';
  onBack: () => void;
  onOpenTableOrder: (tableId: number) => void;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type ConfirmState =
  | {
      type: 'delete';
      table: RestaurantTable;
    }
  | {
      type: 'status';
      table: RestaurantTable;
      nextStatus: TableStatus;
    }
  | null;

function getStatusLabel(status: TableStatus) {
  switch (status) {
    case 'LIBRE':
      return 'libre';
    case 'OCUPADA':
      return 'ocupada';
    case 'RESERVADA':
      return 'reservada';
    case 'CUENTA_SOLICITADA':
      return 'cuenta solicitada';
  }
}

export default function TableManagementPage({
  role,
  onBack,
  onOpenTableOrder,
}: TableManagementPageProps) {
  // === CONFIGURACIÓN ===
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const isAdmin = role === 'ADMIN';

  // === ESTADOS ===
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // --- CARGA DE DATOS ---

  const loadZones = useCallback(async () => {
    setIsZonesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/zonas`);
      if (!response.ok) throw new Error('Error al cargar zonas');

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('El servidor no devolvió una lista válida de zonas');

      const mappedZones: Zone[] = data.map(
        (z: { id_zona: number; nombre: string; activo?: boolean; activa?: boolean }) => ({
          id: z.id_zona,
          nombre: z.nombre,
          activo: z.activo ?? z.activa ?? true,
        })
      );

      setZones(mappedZones.filter((zone) => zone.activo));
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'No se pudieron cargar las zonas',
      });
    } finally {
      setIsZonesLoading(false);
    }
  }, [API_URL]);

  const loadTables = useCallback(async () => {
    setIsTablesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/mesas`);
      if (!response.ok) throw new Error('Error al cargar mesas');

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('El servidor no devolvió una lista válida de mesas');

      const mappedTables: RestaurantTable[] = data.map(
        (t: {
          id_mesa: number;
          numero: number;
          capacidad: number;
          id_zona: number;
          estado: TableStatus;
          activa?: boolean;
        }) => ({
          id: t.id_mesa,
          numero: t.numero,
          capacidad: t.capacidad,
          zoneId: t.id_zona,
          estado: t.estado,
          activo: t.activa ?? true,
        })
      );

      setTables(mappedTables.filter((table) => table.activo));
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'No se pudieron cargar las mesas',
      });
    } finally {
      setIsTablesLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    void loadZones();
    void loadTables();
  }, [loadZones, loadTables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) =>
      selectedZoneId === 'ALL' ? true : table.zoneId === selectedZoneId
    );
  }, [tables, selectedZoneId]);

  // --- MANEJADORES DE EVENTOS ---

  const handleCreateZone = async (values: ZoneFormValues) => {
    setIsSubmittingZoneForm(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/zonas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: values.nombre }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear zona');
      }

      setIsCreateZoneOpen(false);
      await loadZones();
      setFeedback({
        type: 'success',
        title: 'Zona creada',
        message: 'La zona se creó correctamente.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo crear',
        message: error instanceof Error ? error.message : 'Ocurrió un error al crear la zona',
      });
    } finally {
      setIsSubmittingZoneForm(false);
    }
  };

  const handleCreateTable = async (values: TableFormValues) => {
    setIsSubmittingTableForm(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/mesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: values.numero,
          capacidad: values.capacidad,
          id_zona: values.zoneId,
          estado: 'LIBRE',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear mesa');
      }

      setIsCreateTableOpen(false);
      await loadTables();
      setFeedback({
        type: 'success',
        title: 'Mesa creada',
        message: 'La mesa se creó correctamente.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo crear',
        message: error instanceof Error ? error.message : 'Ocurrió un error al crear la mesa',
      });
    } finally {
      setIsSubmittingTableForm(false);
    }
  };

  const handleEditTable = async (values: TableFormValues) => {
    if (!editingTable) return;
    setIsSubmittingTableForm(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/mesas/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: values.numero,
          capacidad: values.capacidad,
          id_zona: values.zoneId,
        }),
      });

      if (!response.ok) throw new Error('Error al actualizar mesa');

      setEditingTable(null);
      await loadTables();
      setFeedback({
        type: 'success',
        title: 'Mesa actualizada',
        message: 'La mesa se actualizó correctamente.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo actualizar',
        message: error instanceof Error ? error.message : 'Ocurrió un error al actualizar la mesa',
      });
    } finally {
      setIsSubmittingTableForm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setIsConfirming(true);

    try {
      if (confirmState.type === 'delete') {
        const response = await fetch(`${API_URL}/api/admin/mesas/${confirmState.table.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Error al eliminar mesa');
        setFeedback({
          type: 'success',
          title: 'Mesa eliminada',
          message: `La mesa ${confirmState.table.numero} fue eliminada correctamente.`,
        });
      }

      if (confirmState.type === 'status') {
        const response = await fetch(`${API_URL}/api/admin/mesas/${confirmState.table.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: confirmState.nextStatus }),
        });
        if (!response.ok) throw new Error('Error al actualizar estado');

        setFeedback({
          type: 'success',
          title: 'Estado actualizado',
          message: `La mesa ${confirmState.table.numero} ahora está ${getStatusLabel(confirmState.nextStatus)}.`,
        });
      }

      setConfirmState(null);
      setOpenActionMenuId(null);
      await loadTables();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo completar la acción',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-[28px] leading-none text-text"
          >
            ☰
          </button>

          <h1 className="text-title font-bold text-text">Gestión de mesas</h1>
          <p className="mt-1 text-[14px] leading-5 text-gray-500">
            {isAdmin
              ? 'Administra el salón, las zonas y el estado de cada mesa.'
              : 'Consulta el salón y gestiona el estado operativo de cada mesa.'}
          </p>

          <div className="mt-4">
            <TableSummaryCards tables={tables} />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                void loadZones();
                void loadTables();
              }}
              className="rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-text shadow-sm transition-colors hover:bg-black/5"
            >
              Actualizar
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateZoneOpen(true)}
                  className="rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold text-text shadow-sm transition-colors hover:bg-black/5"
                >
                  + Nueva zona
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateTableOpen(true)}
                  disabled={zones.length === 0}
                  className="rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  + Nueva mesa
                </button>
              </>
            )}
          </div>

          <div className="mt-4">
            {isZonesLoading ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-[14px] text-gray-500 shadow-sm">
                Cargando zonas...
              </div>
            ) : (
              <ZoneFilterChips
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
              />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-subtitle font-bold text-text">Mesas</h2>
            <span className="text-[13px] font-medium text-gray-500">
              {filteredTables.length} resultados
            </span>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isTablesLoading ? (
            <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando mesas...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">
                No hay mesas en esta zona
              </p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">
                Prueba con otra zona o registra una nueva mesa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTables.map((table) => (
                <TableCard
                  key={table.id}
                  role={role}
                  table={table}
                  zone={zones.find((zone) => zone.id === table.zoneId)}
                  menuOpen={openActionMenuId === table.id}
                  onToggleMenu={() =>
                    setOpenActionMenuId((currentId) =>
                      currentId === table.id ? null : table.id
                    )
                  }
                  onManageOrder={() => {
                    setOpenActionMenuId(null);
                    onOpenTableOrder(table.id);
                  }}
                  onEdit={() => {
                    setOpenActionMenuId(null);
                    setEditingTable(table);
                  }}
                  onDelete={() => {
                    setOpenActionMenuId(null);
                    setConfirmState({ type: 'delete', table });
                  }}
                  onChangeStatus={(nextStatus) => {
                    setOpenActionMenuId(null);
                    setConfirmState({ type: 'status', table, nextStatus });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          <ZoneFormModal
            key={isCreateZoneOpen ? 'zone-open' : 'zone-closed'}
            open={isCreateZoneOpen}
            isSubmitting={isSubmittingZoneForm}
            onClose={() => setIsCreateZoneOpen(false)}
            onSubmit={handleCreateZone}
          />
          <TableFormModal
            key={isCreateTableOpen ? 'table-create-open' : 'table-create-closed'}
            open={isCreateTableOpen}
            mode="create"
            zones={zones}
            isSubmitting={isSubmittingTableForm}
            onClose={() => setIsCreateTableOpen(false)}
            onSubmit={handleCreateTable}
          />
          <TableFormModal
            key={editingTable ? `table-edit-${editingTable.id}` : 'table-edit-closed'}
            open={Boolean(editingTable)}
            mode="edit"
            zones={zones}
            initialTable={editingTable}
            isSubmitting={isSubmittingTableForm}
            onClose={() => setEditingTable(null)}
            onSubmit={handleEditTable}
          />
        </>
      )}

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.type === 'delete' ? '¿Eliminar mesa?' : '¿Cambiar estado de la mesa?'}
        description={
          confirmState?.type === 'delete'
            ? 'Esta acción no se puede deshacer.'
            : confirmState
            ? `La mesa ${confirmState.table.numero} cambiará a estado ${getStatusLabel(confirmState.nextStatus)}.`
            : ''
        }
        confirmLabel={confirmState?.type === 'delete' ? 'Eliminar' : 'Confirmar'}
        isLoading={isConfirming}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirmAction}
      />

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