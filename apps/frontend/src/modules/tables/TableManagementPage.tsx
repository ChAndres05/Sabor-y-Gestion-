import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import {
  createTableMock,
  createZoneMock,
  deleteTableMock,
  listTablesMock,
  listZonesMock,
  updateTableMock,
  updateTableStatusMock,
} from '../../shared/mocks/tables.mock';
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
  onBack: () => void;
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
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export default function TableManagementPage({
  onBack,
}: TableManagementPageProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const [isZonesLoading, setIsZonesLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);

  const [selectedZoneId, setSelectedZoneId] = useState<ZoneFilter>('ALL');

  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(
    null
  );

  const [isSubmittingZoneForm, setIsSubmittingZoneForm] = useState(false);
  const [isSubmittingTableForm, setIsSubmittingTableForm] = useState(false);

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadZones = useCallback(async () => {
    setIsZonesLoading(true);

    try {
      const data = await listZonesMock();
      setZones(data.filter((zone) => zone.activo));
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las zonas',
      });
    } finally {
      setIsZonesLoading(false);
    }
  }, []);

  const loadTables = useCallback(async () => {
    setIsTablesLoading(true);

    try {
      const data = await listTablesMock();
      setTables(data.filter((table) => table.activo));
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las mesas',
      });
    } finally {
      setIsTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
    void loadTables();
  }, [loadZones, loadTables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) =>
      selectedZoneId === 'ALL' ? true : table.zoneId === selectedZoneId
    );
  }, [tables, selectedZoneId]);

  const handleCreateZone = async (values: ZoneFormValues) => {
    setIsSubmittingZoneForm(true);

    try {
      await createZoneMock(values);
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
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al crear la zona',
      });
    } finally {
      setIsSubmittingZoneForm(false);
    }
  };

  const handleCreateTable = async (values: TableFormValues) => {
    setIsSubmittingTableForm(true);

    try {
      await createTableMock(values);
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
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al crear la mesa',
      });
    } finally {
      setIsSubmittingTableForm(false);
    }
  };

  const handleEditTable = async (values: TableFormValues) => {
    if (!editingTable) return;

    setIsSubmittingTableForm(true);

    try {
      await updateTableMock(editingTable.id, values);
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
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al actualizar la mesa',
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
        await deleteTableMock(confirmState.table.id);
        setFeedback({
          type: 'success',
          title: 'Mesa eliminada',
          message: `La mesa ${confirmState.table.numero} fue eliminada correctamente.`,
        });
      }

      if (confirmState.type === 'status') {
        await updateTableStatusMock(
          confirmState.table.id,
          confirmState.nextStatus
        );
        setFeedback({
          type: 'success',
          title: 'Estado actualizado',
          message: `La mesa ${confirmState.table.numero} ahora está ${getStatusLabel(
            confirmState.nextStatus
          )}.`,
        });
      }

      setConfirmState(null);
      setOpenActionMenuId(null);
      await loadTables();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo completar la acción',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
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
            Administra el salón, las zonas y el estado de cada mesa.
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
                  table={table}
                  zone={zones.find((zone) => zone.id === table.zoneId)}
                  menuOpen={openActionMenuId === table.id}
                  onToggleMenu={() =>
                    setOpenActionMenuId((currentId) =>
                      currentId === table.id ? null : table.id
                    )
                  }
                  onEdit={() => {
                    setOpenActionMenuId(null);
                    setEditingTable(table);
                  }}
                  onDelete={() => {
                    setOpenActionMenuId(null);
                    setConfirmState({
                      type: 'delete',
                      table,
                    });
                  }}
                  onChangeStatus={(nextStatus) => {
                    setOpenActionMenuId(null);
                    setConfirmState({
                      type: 'status',
                      table,
                      nextStatus,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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

      <ConfirmModal
        open={Boolean(confirmState)}
        title={
          confirmState?.type === 'delete'
            ? '¿Eliminar mesa?'
            : '¿Cambiar estado de la mesa?'
        }
        description={
          confirmState?.type === 'delete'
            ? 'Esta acción no se puede deshacer.'
            : confirmState
              ? `La mesa ${confirmState.table.numero} cambiará a estado ${getStatusLabel(
                  confirmState.nextStatus
                )}.`
              : ''
        }
        confirmLabel={
          confirmState?.type === 'delete' ? 'Eliminar' : 'Confirmar'
        }
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