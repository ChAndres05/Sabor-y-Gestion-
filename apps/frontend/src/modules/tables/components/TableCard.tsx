import type { RestaurantTable, TableStatus, Zone } from '../types/table.types';

interface TableCardProps {
  role: 'ADMIN' | 'MESERO' | 'CLIENTE';
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
    case 'LIBRE': return 'bg-success text-white';
    case 'OCUPADA': return 'bg-alert text-white';
    case 'RESERVADA': return 'bg-process text-white';
    case 'CUENTA_SOLICITADA': return 'bg-info text-white';
    case 'FUERA_DE_SERVICIO': return 'bg-gray-500 text-white';
  }
}

function getStatusLabel(status: TableStatus) {
  switch (status) {
    case 'LIBRE': return 'Libre';
    case 'OCUPADA': return 'Ocupada';
    case 'RESERVADA': return 'Reservada';
    case 'CUENTA_SOLICITADA': return 'Cuenta solicitada';
    case 'FUERA_DE_SERVICIO': return 'Fuera de servicio';
  }
}

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
  const isClient = role === 'CLIENTE';

  const getAvailableStatuses = (): TableStatus[] => {
    if (isClient) {
      return table.estado === 'LIBRE' ? ['RESERVADA'] : [];
    }

    const baseStatuses: TableStatus[] = ['RESERVADA', 'FUERA_DE_SERVICIO'];
    const canReleaseManually = isAdmin || (table.estado !== 'OCUPADA' && table.estado !== 'CUENTA_SOLICITADA');
    
    const statuses = [...baseStatuses];
    if (canReleaseManually) statuses.push('LIBRE');
    if (table.estado === 'OCUPADA') statuses.push('CUENTA_SOLICITADA');

    return statuses;
  };

  const availableStatuses = getAvailableStatuses();
  const canManageOrder = !isClient && table.estado !== 'FUERA_DE_SERVICIO';

  return (
    <article
      className={`relative rounded-[1.5rem] p-4 shadow-sm transition-all ${getStatusStyles(table.estado)}`}
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
        <div className="absolute right-3 top-12 z-20 min-w-[210px] overflow-hidden rounded-2xl bg-white text-text shadow-xl border border-black/5">
          {canManageOrder && (
            <button
              type="button"
              onClick={onManageOrder}
              className="block w-full px-4 py-3 text-left text-[14px] font-bold text-primary border-b border-black/5 hover:bg-black/5"
            >
              {table.estado === 'OCUPADA' ? 'Ver/Editar Pedido' : 'Gestionar pedido'}
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onEdit}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium hover:bg-black/5"
            >
              🛠️ Configurar mesa
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
                {status === 'RESERVADA' ? '📅 Hacer una reserva' : 
                 status === 'LIBRE' ? '🔓 Liberar mesa' :
                 status === 'CUENTA_SOLICITADA' ? '💰 Solicitar cuenta' :
                 `Marcar ${getStatusLabel(status).toLowerCase()}`}
              </button>
            ))}

          {isAdmin && (
            <button
              type="button"
              onClick={onDelete}
              className="block w-full px-4 py-3 text-left text-[14px] font-medium text-alert border-t border-black/5 hover:bg-alert/5"
            >
              🗑️ Eliminar mesa
            </button>
          )}
        </div>
      )}
    </article>
  );
}