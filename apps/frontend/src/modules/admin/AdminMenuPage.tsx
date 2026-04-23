import type { AuthUser } from '../auth/types/auth.types';

interface AdminMenuPageProps {
  user: AuthUser;
  onLogout: () => void;
  onOpenUsers: () => void;
}

const menuItems = [
  { key: 'productos', label: 'Administración de productos', enabled: false },
  { key: 'mesas', label: 'Gestión de Mesas', enabled: false },
  { key: 'cocina', label: 'Monitor de cocina', enabled: false },
  { key: 'delivery', label: 'Atención Delivery', enabled: false },
  { key: 'facturacion', label: 'Facturación', enabled: false },
  { key: 'cierre', label: 'Cierre de Caja', enabled: false },
  { key: 'inventario', label: 'Gestión de Inventario', enabled: false },
  { key: 'usuarios', label: 'Gestión de Usuarios', enabled: true },
];

export default function AdminMenuPage({
  user,
  onLogout,
  onOpenUsers,
}: AdminMenuPageProps) {
  return (
    /* Aplicamos font-sans y bg-primary del config */
    <div className="min-h-screen bg-primary px-4 py-8 text-white font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col">
        
        <div className="space-y-1">
          {menuItems.map((item) => {
            const handleClick = () => {
              if (item.key === 'usuarios') {
                onOpenUsers();
              }
            };

            return (
              <button
                key={item.key}
                type="button"
                onClick={handleClick}
                disabled={!item.enabled}
                /* Usamos text-content para los items del menú */
                className={`flex w-full items-center justify-between border-b border-white/40 py-5 text-left text-content font-semibold transition-colors ${
                  item.enabled
                    ? 'cursor-pointer hover:bg-white/10'
                    : 'cursor-default opacity-50'
                }`}
              >
                <span>{item.label}</span>
                {/* La flecha usa text-subtitle para resaltar un poco más */}
                <span className="text-subtitle font-bold">{'>'}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex items-end justify-between pt-10">
          <div className="flex items-center gap-4">
            {/* Contenedor de icono usando un overlay sutil del blanco */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <span className="text-3xl">👤</span>
            </div>

            <div>
              {/* Nombre con text-subtitle */}
              <p className="text-subtitle font-bold leading-tight">
                {user.nombre} {user.apellido}
              </p>
              {/* Detalles con text-content */}
              <p className="text-content opacity-90">{user.correo}</p>
              <p className="text-content font-bold uppercase tracking-wider text-secondary-light">
                {user.rol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            /* Botón de logout usando un color de hover relacionado al primary */
            className="rounded-xl bg-white/20 p-3 text-subtitle font-bold hover:bg-primary-hover transition-colors shadow-lg"
          >
            {'>'}
          </button>
        </div>
      </div>
    </div>
  );
}