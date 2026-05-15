import { useEffect, useState, useCallback } from 'react';
import { LoginForm } from './modules/auth/LoginForm';
import RegisterForm from './modules/auth/RegisterForm';
import ForgotPasswordPage from './modules/auth/ForgotPasswordPage';
import type { AuthSession, AuthUser } from './modules/auth/types/auth.types';
import { USER_ROLES } from './shared/constants/roles';
import AdminMenuPage from './modules/admin/AdminMenuPage';
import MeseroHomePage from './modules/mesero/MeseroHomePage';
import MeseroOrderFlowPage from './modules/mesero/MeseroOrderFlowPage';
import MeseroOrdersPage from './modules/mesero/MeseroOrdersPage';
import { CajeroHomePage } from "./modules/cajero/CajeroHomePage";
import ClientHomePage from './modules/cliente/ClienteHomePage';
import ClientMenuPage from './modules/cliente/ClientMenuPage';
import ClientProductDetailPage from './modules/cliente/ClientProductDetailPage';
import ClientReservationsPage from './modules/cliente/ClientReservationsPage';
import ClientReservationOrderPage from './modules/cliente/ClientReservationOrderPage';
import ClientOrdersPage from './modules/cliente/ClientOrdersPage';
import ClientActiveOrderPage from './modules/cliente/ClientActiveOrderPage';
import UsersPage from './modules/users/UsersPage';
import MenuManagementPage from './modules/menu/MenuManagementPage';
import TableManagementPage from './modules/tables/TableManagementPage';
import MonitorCocinaPage from './modules/cocina/MonitorCocinaPage';
import AdminReservationsPage from './modules/admin/AdminReservationsPage';
import ServiceHistoryPage from './modules/history/ServiceHistoryPage';
import CashHistoryPage from './modules/history/CashHistoryPage';
import type { ClientNavigationKey } from './shared/types/client-flow.types';
import { pusherClient } from './shared/utils/pusher';
import { emitRestaurantStateChanged } from './shared/utils/events';
import { Sidebar } from './shared/components/Sidebar';

type AppScreen =
  | 'login' | 'register' | 'forgot-password' | 'admin-menu' | 'admin-users'
  | 'menu-management' | 'table-management' | 'table-order' | 'mesero-home'
  | 'mesero-tables' | 'mesero-table-order' | 'mesero-orders' | 'mesero-menu'
  | 'cocina-home' | 'cajero-home' | 'cliente-home' | 'client-menu'
  | 'client-product-detail' | 'client-reserve-table' | 'client-reservations'
  | 'client-reservation-order' | 'client-orders' | 'client-manage-order'
  | 'admin-reservations' | 'admin-orders' | 'admin-kitchen-monitor' | 'service-history' | 'cash-history';

const AUTH_STORAGE_KEY = 'gestionysabor_auth';

const ROLE_PERMISSIONS: Record<string, AppScreen[]> = {
  [USER_ROLES.ADMIN]: ['admin-menu', 'admin-users', 'menu-management', 'table-management', 'table-order', 'admin-kitchen-monitor', 'admin-reservations', 'admin-orders', 'client-reservation-order', 'mesero-orders', 'mesero-table-order', 'service-history', 'cash-history'],
  [USER_ROLES.MESERO]: ['mesero-menu', 'mesero-tables', 'mesero-table-order', 'mesero-orders'],
  [USER_ROLES.COCINERO]: ['cocina-home'],
  [USER_ROLES.CAJERO]: ['cajero-home'],
  [USER_ROLES.CLIENTE]: ['cliente-home', 'client-menu', 'client-product-detail', 'client-reserve-table', 'client-reservations', 'client-reservation-order', 'client-orders', 'client-manage-order']
};

function getScreenByRole(role: AuthUser['rol']): AppScreen {
  switch (role) {
    case USER_ROLES.ADMIN: return 'menu-management';
    case USER_ROLES.MESERO: return 'mesero-tables';
    case USER_ROLES.COCINERO: return 'cocina-home';
    case USER_ROLES.CAJERO: return 'cajero-home';
    case USER_ROLES.CLIENTE: return 'client-menu';
    default: return 'login';
  }
}

function getClientScreen(screen: ClientNavigationKey): AppScreen {
  switch (screen) {
    case 'menu': return 'client-menu';
    case 'reserve-table': return 'client-reserve-table';
    case 'reservations': return 'client-reservations';
    case 'orders': return 'client-orders';
  }
}

function App() {
  const [screenState, setScreenState] = useState<AppScreen>('login');
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [selectedClientProductId, setSelectedClientProductId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCajeroView, setSelectedCajeroView] = useState<'facturacion' | 'cierre'>('facturacion');

  const canAccess = useCallback((role: string, screen: AppScreen) => {
    if (['login', 'register', 'forgot-password'].includes(screen)) return true;
    return ROLE_PERMISSIONS[role]?.includes(screen) || false;
  }, []);

  const setScreen = useCallback((
    newScreen: AppScreen,
    options?: { tableId?: number | null; productId?: number | null; reservationId?: number | null; replace?: boolean }
  ) => {
    if (options?.tableId !== undefined) setSelectedTableId(options.tableId);
    if (options?.productId !== undefined) setSelectedClientProductId(options.productId);
    if (options?.reservationId !== undefined) setSelectedReservationId(options.reservationId);

    const newState = {
      screen: newScreen,
      selectedTableId: options?.tableId !== undefined ? options.tableId : selectedTableId,
      selectedClientProductId: options?.productId !== undefined ? options.productId : selectedClientProductId,
      selectedReservationId: options?.reservationId !== undefined ? options.reservationId : selectedReservationId,
    };

    if (options?.replace) {
      window.history.replaceState(newState, '', '#' + newScreen);
    } else {
      window.history.pushState(newState, '', '#' + newScreen);
    }

    setScreenState(newScreen);
  }, [selectedTableId, selectedClientProductId, selectedReservationId]);

  const navigateClient = useCallback((screen: ClientNavigationKey) => {
    setScreen(getClientScreen(screen), { productId: null });
  }, [setScreen]);

  const getSidebarOptionsForRole = useCallback((role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return [
          { key: 'productos', label: 'Administración de productos', onClick: () => { setScreen('menu-management'); setIsSidebarOpen(false); } },
          { key: 'mesas', label: 'Gestión de Mesas', onClick: () => { setScreen('table-management'); setIsSidebarOpen(false); } },
          { key: 'cocina', label: 'Monitor de cocina', onClick: () => { setScreen('admin-kitchen-monitor'); setIsSidebarOpen(false); } },
          { key: 'reservas', label: 'Gestión de reservas', onClick: () => { setScreen('admin-reservations'); setIsSidebarOpen(false); } },
          { key: 'pedidos', label: 'Gestión de pedidos', onClick: () => { setScreen('admin-orders'); setIsSidebarOpen(false); } },
          { key: 'delivery', label: 'Atención Delivery', onClick: () => { alert('Atención Delivery no implementado aún'); setIsSidebarOpen(false); } },
          { key: 'facturacion', label: 'Facturación', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('facturacion'); setIsSidebarOpen(false); } },
          { key: 'cierre', label: 'Cierre de Caja', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('cierre'); setIsSidebarOpen(false); } },
          { key: 'usuarios', label: 'Gestión de Usuarios', onClick: () => { setScreen('admin-users'); setIsSidebarOpen(false); } },
          { key: 'historial', label: 'Historial de Atención', onClick: () => { setScreen('service-history'); setIsSidebarOpen(false); } },
          { key: 'historial-caja', label: 'Historial de Caja', onClick: () => { setScreen('cash-history'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.MESERO:
        return [
          { key: 'mesas', label: 'Gestionar mesas', onClick: () => { setScreen('mesero-tables'); setIsSidebarOpen(false); } },
          { key: 'pedidos', label: 'Gestionar pedidos', onClick: () => { setScreen('mesero-orders'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.CAJERO:
        return [
          { key: 'facturacion', label: 'Facturación', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('facturacion'); setIsSidebarOpen(false); } },
          { key: 'cierre', label: 'Cierre de Caja', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('cierre'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.COCINERO:
        return [
          { key: 'cocina', label: 'Monitor de Cocina', onClick: () => { setScreen('cocina-home'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.CLIENTE:
        return [
          { key: 'menu', label: 'Menú', onClick: () => { navigateClient('menu'); setIsSidebarOpen(false); } },
          { key: 'reserve-table', label: 'Reservar mesa', onClick: () => { navigateClient('reserve-table'); setIsSidebarOpen(false); } },
          { key: 'reservations', label: 'Mis reservas', onClick: () => { navigateClient('reservations'); setIsSidebarOpen(false); } },
          { key: 'orders', label: 'Mis pedidos', onClick: () => { navigateClient('orders'); setIsSidebarOpen(false); } }
        ];
      default:
        return [];
    }
  }, [setScreen, navigateClient]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { screen?: AppScreen; selectedTableId?: number | null; selectedClientProductId?: number | null; selectedReservationId?: number | null } | null;
      if (state?.screen) {
        if (sessionUser && !canAccess(sessionUser.rol, state.screen)) {
          setScreen(getScreenByRole(sessionUser.rol), { replace: true });
          return;
        }
        setScreenState(state.screen);
        if (state.selectedTableId !== undefined) setSelectedTableId(state.selectedTableId);
        if (state.selectedClientProductId !== undefined) setSelectedClientProductId(state.selectedClientProductId);
        if (state.selectedReservationId !== undefined) setSelectedReservationId(state.selectedReservationId);
      } else if (window.location.hash) {
        const hash = window.location.hash.replace('#', '') as AppScreen;
        setScreenState(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessionUser, canAccess, setScreen]);

  useEffect(() => {
    const handleEvent = () => emitRestaurantStateChanged();
    const tablesChannel = pusherClient.subscribe('tables-channel');
    tablesChannel.bind('table-updated', handleEvent);
    tablesChannel.bind('table-order-updated', handleEvent);
    const cocinaChannel = pusherClient.subscribe('cocina-channel');
    cocinaChannel.bind('nuevo-pedido', handleEvent);
    cocinaChannel.bind('pedido-actualizado', handleEvent);

    return () => {
      tablesChannel.unbind_all();
      pusherClient.unsubscribe('tables-channel');
      cocinaChannel.unbind_all();
      pusherClient.unsubscribe('cocina-channel');
    };
  }, []);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!savedAuth) {
        setIsBootstrapping(false);
        return;
      }
      const parsed = JSON.parse(savedAuth) as { accessToken: string; user: AuthUser };
      if (parsed?.accessToken && parsed?.user) {
        setAccessToken(parsed.accessToken);
        setSessionUser(parsed.user);
        const hash = window.location.hash.replace('#', '') as AppScreen;
        const target = (hash && hash !== 'login' && canAccess(parsed.user.rol, hash)) 
          ? hash 
          : getScreenByRole(parsed.user.rol);
        setScreen(target, { replace: true });
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsBootstrapping(false);
    }
  }, [canAccess, setScreen]);

  const handleLoginSuccess = (session: AuthSession) => {
    setAccessToken(session.accessToken);
    setSessionUser(session.user);
    setScreen(getScreenByRole(session.user.rol), { replace: true });
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: session.accessToken, user: session.user }));
  };

  const handleLogout = () => {
    setAccessToken(null);
    setSessionUser(null);
    setSelectedTableId(null);
    setSelectedClientProductId(null);
    setSelectedReservationId(null);
    setScreen('login', { replace: true });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (isBootstrapping) {
    return (
      <main className="flex h-screen items-center justify-center bg-background font-sans text-text">
        <p className="text-content">Cargando sesión...</p>
      </main>
    );
  }

  const isAuthScreen = ['login', 'register', 'forgot-password'].includes(screenState);

  return (
    <main className="h-screen w-screen overflow-hidden bg-background font-sans text-text antialiased flex flex-col">
      {sessionUser && !isAuthScreen && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          user={sessionUser} 
          options={getSidebarOptionsForRole(sessionUser.rol)}
          onLogout={handleLogout}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        <div className={!isAuthScreen ? "max-w-screen-2xl mx-auto w-full p-4 md:p-6" : "w-full"}>
          {screenState === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setScreen('register')} onGoToForgotPassword={() => setScreen('forgot-password')} />}
          {screenState === 'register' && <RegisterForm onGoToLogin={() => setScreen('login')} />}
          {screenState === 'forgot-password' && <ForgotPasswordPage onBackToLogin={() => setScreen('login')} />}

          {screenState === 'admin-menu' && sessionUser && accessToken && (
            <AdminMenuPage 
              user={sessionUser} 
              onLogout={handleLogout} 
              onOpenUsers={() => setScreen('admin-users')} 
              onOpenMenuManagement={() => setScreen('menu-management')} 
              onOpenTableManagement={() => setScreen('table-management')} 
              onOpenKitchenMonitor={() => setScreen('admin-kitchen-monitor')} 
              onOpenReservations={() => setScreen('admin-reservations')} 
              onOpenOrders={() => setScreen('admin-orders')} 
              onOpenCaja={() => setScreen('cajero-home')}
            />
          )}
          {screenState === 'admin-reservations' && (
            <AdminReservationsPage onBack={() => setIsSidebarOpen(true)} onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })} onViewOrder={(tableId) => setScreen('table-order', { tableId })} />
          )}
          {screenState === 'admin-orders' && sessionUser && (
            <MeseroOrdersPage user={sessionUser} onBack={() => setIsSidebarOpen(true)} onOpenOrder={(tableId) => setScreen('table-order', { tableId })} />
          )}
          {screenState === 'admin-users' && <UsersPage onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'menu-management' && <MenuManagementPage onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'admin-kitchen-monitor' && <MonitorCocinaPage onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'table-management' && <TableManagementPage role="ADMIN" onBack={() => setIsSidebarOpen(true)} onOpenTableOrder={(tableId) => setScreen('table-order', { tableId })} />}
          {screenState === 'table-order' && sessionUser && selectedTableId !== null && (
            <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('table-management')} />
          )}

          {screenState === 'mesero-menu' && sessionUser && accessToken && (
            <MeseroHomePage user={sessionUser} onLogout={handleLogout} onOpenTables={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
          )}
          {screenState === 'mesero-tables' && <TableManagementPage role="MESERO" onBack={() => setIsSidebarOpen(true)} onOpenTableOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />}
          {screenState === 'mesero-table-order' && sessionUser && selectedTableId !== null && (
            <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
          )}
          {screenState === 'mesero-orders' && sessionUser && (
            <MeseroOrdersPage user={sessionUser} onBack={() => setIsSidebarOpen(true)} onOpenOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />
          )}

          {screenState === 'service-history' && sessionUser && (
            <ServiceHistoryPage userRole={sessionUser.rol} userId={sessionUser.id} onBack={() => setIsSidebarOpen(true)} />
          )}

          {screenState === 'cash-history' && sessionUser && (
            <CashHistoryPage onBack={() => setIsSidebarOpen(true)} />
          )}

          {screenState === 'cocina-home' && <MonitorCocinaPage onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'cajero-home' && sessionUser && accessToken && (
            <CajeroHomePage 
              user={sessionUser} 
              onLogout={handleLogout} 
              onOpenSidebar={() => setIsSidebarOpen(true)}
              defaultView={selectedCajeroView}
            />
          )}
          
          {screenState === 'cliente-home' && sessionUser && <ClientHomePage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} />}
          {screenState === 'client-menu' && sessionUser && (
            <ClientMenuPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onOpenProductDetail={(productId) => setScreen('client-product-detail', { productId })} onBack={() => setIsSidebarOpen(true)} />
          )}
          {screenState === 'client-product-detail' && sessionUser && selectedClientProductId !== null && (
            <ClientProductDetailPage user={sessionUser} productId={selectedClientProductId} onBack={() => setScreen('client-menu')} onLogout={handleLogout} onNavigate={navigateClient} />
          )}
          {screenState === 'client-reserve-table' && sessionUser && <TableManagementPage role="CLIENTE" user={sessionUser} onNavigate={navigateClient} onBack={() => setScreen('cliente-home')} />}
          {screenState === 'client-reservations' && sessionUser && (
            <ClientReservationsPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onBack={() => setScreen('cliente-home')} onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })} />
          )}
          {screenState === 'client-reservation-order' && sessionUser && selectedReservationId !== null && (
            <ClientReservationOrderPage user={sessionUser} reservationId={selectedReservationId} onBack={() => setScreen('client-reservations')} onNavigateToOrders={() => navigateClient('orders')} />
          )}
          {screenState === 'client-orders' && sessionUser && (
            <ClientOrdersPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onBack={() => setScreen('cliente-home')} onManageOrder={(tableId) => setScreen('client-manage-order', { tableId })} />
          )}
          {screenState === 'client-manage-order' && sessionUser && selectedTableId !== null && (
            <ClientActiveOrderPage user={sessionUser} tableId={selectedTableId} onBack={() => navigateClient('orders')} />
          )}
        </div>
      </div>
    </main>
  );
}

export default App;