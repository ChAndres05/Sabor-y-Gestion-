import { type ReactNode } from 'react';
import type { AuthUser } from '../../modules/auth/types/auth.types';
import type { ClientNavigationKey } from '../../shared/types/client-flow.types';
import { useCartStore } from '../../store/cartStore';

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

export default function ClientLayout({
  user,
  title,
  subtitle,
  onNavigate,
  onLogout,
  children,
  maxWidthClassName = 'max-w-screen-xl',
  onBack,
}: ClientLayoutProps) {
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.cantidad, 0);

  const handleNavigate = (screen: ClientNavigationKey) => {
    onNavigate(screen);
  };

  return (
    <main className="bg-background px-4 py-6 text-text min-h-screen">
      <div className={`mx-auto flex w-full ${maxWidthClassName} flex-col`}>
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack ? onBack : () => window.dispatchEvent(new Event('open-sidebar'))}
                className="rounded-2xl bg-white px-3 py-2 text-[24px] leading-none text-text shadow-sm transition-colors hover:bg-black/5 cursor-pointer"
                aria-label={onBack ? "Volver" : "Abrir navegación del cliente"}
              >
                {onBack ? '←' : '☰'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Cart Badge Trigger */}
              <button
                type="button"
                onClick={() => handleNavigate('cart')}
                className="relative rounded-2xl bg-white px-4 py-2 text-[15px] font-semibold text-text shadow-sm transition-all hover:bg-black/5 flex items-center gap-2 border border-gray-100 cursor-pointer"
                title="Ver Carrito"
              >
                <span>🛒 Carrito</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-bounce">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-2xl bg-white px-4 py-2 text-[14px] font-semibold text-text shadow-sm transition-colors hover:bg-black/5 cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>

          <p className="mt-4 text-[14px] font-medium text-gray-500">
            Hola, {user.nombre}
          </p>
          <h1 className="mt-1 text-title font-bold text-text">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-[14px] leading-5 text-gray-500">{subtitle}</p>
          )}
        </header>

        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}
