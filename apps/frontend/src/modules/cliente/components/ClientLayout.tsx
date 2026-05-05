import { useState, type ReactNode } from 'react';
import type { AuthUser } from '../../auth/types/auth.types';
import type { ClientNavigationKey } from '../types/client-flow.types';

interface ClientLayoutProps {
  user: AuthUser;
  active: ClientNavigationKey;
  title: string;
  subtitle?: string;
  onNavigate: (screen: ClientNavigationKey) => void;
  onLogout: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  onBack?: () => void;
}

const navigationItems: Array<{ key: ClientNavigationKey; label: string; description: string }> = [
  {
    key: 'menu',
    label: 'Menú',
    description: 'Productos, filtros y detalle de platos',
  },
  {
    key: 'reserve-table',
    label: 'Reservar mesa',
    description: 'Mesas disponibles por zona y capacidad',
  },
  {
    key: 'reservations',
    label: 'Mis reservas',
    description: 'Reservas activas e historial',
  },
  {
    key: 'orders',
    label: 'Mis pedidos',
    description: 'Seguimiento de pedidos asociados a tu usuario',
  },
];

export default function ClientLayout({
  user,
  active,
  title,
  subtitle,
  onNavigate,
  onLogout,
  children,
  maxWidthClassName = 'max-w-screen-xl',
  onBack,
}: ClientLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigate = (screen: ClientNavigationKey) => {
    setIsDrawerOpen(false);
    onNavigate(screen);
  };

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className={`mx-auto flex h-full w-full ${maxWidthClassName} flex-col overflow-hidden`}>
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack ? onBack : () => setIsDrawerOpen(true)}
                className="rounded-2xl bg-white px-3 py-2 text-[24px] leading-none text-text shadow-sm transition-colors hover:bg-black/5"
                aria-label={onBack ? "Volver" : "Abrir navegación del cliente"}
              >
                ☰
              </button>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl bg-white px-4 py-2 text-[14px] font-semibold text-text shadow-sm transition-colors hover:bg-black/5"
            >
              Salir
            </button>
          </div>

          <p className="mt-4 text-[14px] font-medium text-gray-500">
            Hola, {user.nombre}
          </p>
          <h1 className="mt-1 text-title font-bold text-text">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-[14px] leading-5 text-gray-500">{subtitle}</p>
          )}
        </header>

        <section className="mt-4 min-h-0 flex-1 overflow-hidden">{children}</section>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/50">
          <button
            type="button"
            className="flex-1 cursor-default"
            aria-label="Cerrar navegación"
            onClick={() => setIsDrawerOpen(false)}
          />

          <aside className="h-full w-[320px] max-w-[88vw] bg-primary p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-white/70">
                  Navegación cliente
                </p>
                <p className="mt-1 text-[20px] font-bold leading-tight">
                  {user.nombre} {user.apellido}
                </p>
                <p className="mt-1 break-all text-[12px] font-medium text-white/75">
                  {user.correo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-xl bg-white/15 px-3 py-2 text-[18px] leading-none transition-colors hover:bg-white/25"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {navigationItems.map((item) => {
                const isActive = item.key === active;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavigate(item.key)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-white text-primary' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span className="block text-[15px] font-bold">{item.label}</span>
                    <span className={`mt-1 block text-[12px] leading-4 ${isActive ? 'text-primary/75' : 'text-white/70'}`}>
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 rounded-2xl bg-white/10 p-4 text-[12px] leading-5 text-white/80">
              El cliente entra directo al menú, pero ahora puede navegar a reservas y pedidos sin salir de su sesión.
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
