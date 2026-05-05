import type { AuthUser } from '../auth/types/auth.types';

interface MeseroHomePageProps {
  user: AuthUser;
  onLogout: () => void;
  onOpenTables: () => void;
  onOpenOrders: () => void;
}

const menuItems = [
  { key: 'mesas', label: 'Gestionar mesas', description: 'Cambiar estado y tomar pedido por mesa', enabled: true },
  { key: 'pedidos', label: 'Gestionar pedidos', description: 'Ver pedidos listos, entregados y cuenta', enabled: true },
  { key: 'historial', label: 'Historial', description: 'Disponible cuando backend exponga reportes', enabled: false },
];

export default function MeseroHomePage({
  user,
  onLogout,
  onOpenTables,
  onOpenOrders,
}: MeseroHomePageProps) {
  return (
    <div className="min-h-screen bg-primary px-4 py-8 font-sans text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const handleClick = () => {
              if (!item.enabled) return;

              if (item.key === 'mesas') {
                onOpenTables();
              }

              if (item.key === 'pedidos') {
                onOpenOrders();
              }
            };

            return (
              <button
                key={item.key}
                type="button"
                onClick={handleClick}
                disabled={!item.enabled}
                className={`flex w-full items-center justify-between border-b border-white/40 py-5 text-left text-content font-semibold transition-colors ${
                  item.enabled
                    ? 'cursor-pointer hover:bg-white/10'
                    : 'cursor-default opacity-50'
                }`}
              >
                <span>
                  <span className="block">{item.label}</span>
                  <span className="mt-1 block text-[12px] font-medium opacity-75">
                    {item.description}
                  </span>
                </span>
                <span className="text-subtitle font-bold">{'>'}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex items-end justify-between pt-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <span className="text-3xl">👤</span>
            </div>

            <div>
              <p className="text-subtitle font-bold leading-tight">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-content opacity-90">{user.correo}</p>
              <p className="text-content font-bold uppercase tracking-wider text-white/90">
                {user.rol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl bg-white/20 p-3 text-subtitle font-bold transition-colors shadow-lg hover:bg-primary-hover"
          >
            {'>'}
          </button>
        </div>
      </div>
    </div>
  );
}