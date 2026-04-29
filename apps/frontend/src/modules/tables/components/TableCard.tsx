import type { RestaurantTable, TableStatus, Zone } from '../types/table.types';

interface TableCardProps {
  table: RestaurantTable;
  zone?: Zone;
  menuOpen: boolean;
  onToggleMenu: () => void;
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
    default:
      return 'bg-gray-200 text-text';
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
    default:
      return status;
  }
}

const ALL_STATUSES: TableStatus[] = [
  'LIBRE',
  'OCUPADA',
  'RESERVADA',
  'CUENTA_SOLICITADA',
];

export function TableCard({
  table,
  zone,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  onChangeStatus,
}: TableCardProps) {
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
        <div className="absolute right-3 top-12 z-20 min-w-[200px] overflow-hidden rounded-2xl bg-white text-text shadow-xl">
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
          >
            Editar mesa
          </button>

          {ALL_STATUSES.filter((status) => status !== table.estado).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChangeStatus(status)}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5"
              >
                Marcar {getStatusLabel(status).toLowerCase()}
              </button>
            )
          )}

          <button
            type="button"
            onClick={onDelete}
            className="block w-full px-4 py-3 text-left text-[14px] font-medium text-alert transition-colors hover:bg-alert/5"
          >
            Eliminar mesa
          </button>
        </div>
      )}
    </article>
  );
}