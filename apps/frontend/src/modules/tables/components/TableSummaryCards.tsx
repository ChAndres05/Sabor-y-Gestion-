import type { RestaurantTable } from '../types/table.types';

interface TableSummaryCardsProps {
  tables: RestaurantTable[];
}

function countByStatus(
  tables: RestaurantTable[],
  status: RestaurantTable['estado']
) {
  return tables.filter((table) => table.estado === status).length;
}

export function TableSummaryCards({ tables }: TableSummaryCardsProps) {
  const items = [
    {
      label: 'Libres',
      value: countByStatus(tables, 'LIBRE'),
      className: 'bg-success/10 text-success',
    },
    {
      label: 'Ocupadas',
      value: countByStatus(tables, 'OCUPADA'),
      className: 'bg-alert/10 text-alert',
    },
    {
      label: 'Reservadas',
      value: countByStatus(tables, 'RESERVADA'),
      className: 'bg-process/10 text-process',
    },
    {
      label: 'Cuenta solicitada',
      value: countByStatus(tables, 'CUENTA_SOLICITADA'),
      className: 'bg-info/10 text-info',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.25rem] bg-white p-4 shadow-sm"
        >
          <p className="text-[13px] font-medium text-gray-500">{item.label}</p>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-[16px] font-bold ${item.className}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}