import type { RestaurantTable, TableStatus, Zone } from '../types/table.types';

interface TableCardProps {
  role: 'ADMIN' | 'MESERO';
  table: RestaurantTable;
  zone?: Zone;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onManageOrder: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: TableStatus) => void;
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

const ADMIN_STATUSES: TableStatus[] = [
  'LIBRE',
  'OCUPADA',
  'RESERVADA',
  'CUENTA_SOLICITADA',
  'FUERA_DE_SERVICIO',
];

const WAITER_STATUSES: TableStatus[] = ['LIBRE', 'OCUPADA', 'RESERVADA', 'CUENTA_SOLICITADA', 'FUERA_DE_SERVICIO'];

export function TableCard({
  role,
  table,
  zone,
  menuOpen,
  onToggleMenu,
  onManageOrder,
  onEdit,
  onDelete,
  onChangeStatus,
}: TableCardProps) {
  const isAdmin = role === 'ADMIN';
  const availableStatuses = isAdmin ? ADMIN_STATUSES : WAITER_STATUSES;
  const canManageOrder = table.estado !== 'FUERA_DE_SERVICIO';

  return (
    <article
      className={`relative rounded-[1.5rem] p-4 shadow-sm ${getStatusStyles(
        table.estado
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[20px] font-bold">Mesa {table.numero}</p>
          <p className="mt-1 text-[13px] font-medium opacity-90">
            {zone?.nombre ?? 'Sin zona'}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleMenu}
          className="rounded-full px-2 py-1 text-[20px] leading-none transition-colors hover:bg-white/15"
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

      {menuOpen && (
        <div className="absolute right-3 top-12 z-20 min-w-[210px] overflow-hidden rounded-2xl bg-white text-text shadow-xl">
          {canManageOrder && (
            <button
              type="button"
              onClick={onManageOrder}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
            >
              Gestionar pedido
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onEdit}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
            >
              Editar mesa
            </button>
          )}

          {table.estado === 'RESERVADA' && availableStatuses.includes('RESERVADA') && (
            <button
              type="button"
              onClick={() => onChangeStatus('RESERVADA')}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
            >
              Editar reserva
            </button>
          )}

          {availableStatuses
            .filter((status) => status !== table.estado)
            .map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChangeStatus(status)}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
              >
                {status === 'RESERVADA' ? 'Hacer una reserva' : `Marcar ${getStatusLabel(status).toLowerCase()}`}
              </button>
            ))}

          {isAdmin && (
            <button
              type="button"
              onClick={onDelete}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium text-alert transition-colors hover:bg-alert/5"
            >
              Eliminar mesa
            </button>
          )}
        </div>
      )}
    </article>
  );
}
