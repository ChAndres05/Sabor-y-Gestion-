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
import CajeroHomePage from './modules/cajero/CajeroHomePage';
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
import type { ClientNavigationKey } from './shared/types/client-flow.types';
import { pusherClient } from './shared/utils/pusher';
import { emitRestaurantStateChanged } from './shared/utils/events';

type AppScreen =
  | 'login' | 'register' | 'forgot-password' | 'admin-menu' | 'admin-users'
  | 'menu-management' | 'table-management' | 'table-order' | 'mesero-home'
  | 'mesero-tables' | 'mesero-table-order' | 'mesero-orders' | 'mesero-menu'
  | 'cocina-home' | 'cajero-home' | 'cliente-home' | 'client-menu'
  | 'client-product-detail' | 'client-reserve-table' | 'client-reservations'
  | 'client-reservation-order' | 'client-orders' | 'client-manage-order'
  | 'admin-reservations' | 'admin-orders' | 'admin-kitchen-monitor';

const AUTH_STORAGE_KEY = 'gestionysabor_auth';

const ROLE_PERMISSIONS: Record<string, AppScreen[]> = {
  [USER_ROLES.ADMIN]: ['admin-menu', 'admin-users', 'menu-management', 'table-management', 'table-order', 'admin-kitchen-monitor', 'admin-reservations', 'admin-orders', 'client-reservation-order', 'mesero-orders', 'mesero-table-order'],
  [USER_ROLES.MESERO]: ['mesero-menu', 'mesero-tables', 'mesero-table-order', 'mesero-orders'],
  [USER_ROLES.COCINERO]: ['cocina-home'],
  [USER_ROLES.CAJERO]: ['cajero-home'],
  [USER_ROLES.CLIENTE]: ['cliente-home', 'client-menu', 'client-product-detail', 'client-reserve-table', 'client-reservations', 'client-reservation-order', 'client-orders', 'client-manage-order']
};

function getScreenByRole(role: AuthUser['rol']): AppScreen {
  switch (role) {
    case USER_ROLES.ADMIN: return 'admin-menu';
    case USER_ROLES.MESERO: return 'mesero-menu';
    case USER_ROLES.COCINERO: return 'cocina-home';
    case USER_ROLES.CAJERO: return 'cajero-home';
    case USER_ROLES.CLIENTE: return 'cliente-home';
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
      <div className="flex-1 overflow-y-auto">
        <div className={!isAuthScreen ? "max-w-screen-2xl mx-auto w-full p-4 md:p-6" : "w-full"}>
          {screenState === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setScreen('register')} onGoToForgotPassword={() => setScreen('forgot-password')} />}
          {screenState === 'register' && <RegisterForm onGoToLogin={() => setScreen('login')} />}
          {screenState === 'forgot-password' && <ForgotPasswordPage onBackToLogin={() => setScreen('login')} />}

          {screenState === 'admin-menu' && sessionUser && accessToken && (
            <AdminMenuPage user={sessionUser} onLogout={handleLogout} onOpenUsers={() => setScreen('admin-users')} onOpenMenuManagement={() => setScreen('menu-management')} onOpenTableManagement={() => setScreen('table-management')} onOpenKitchenMonitor={() => setScreen('admin-kitchen-monitor')} onOpenReservations={() => setScreen('admin-reservations')} onOpenOrders={() => setScreen('admin-orders')} />
          )}
          {screenState === 'admin-reservations' && (
            <AdminReservationsPage onBack={() => setScreen('admin-menu')} onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })} onViewOrder={(tableId) => setScreen('table-order', { tableId })} />
          )}
          {screenState === 'admin-orders' && sessionUser && (
            <MeseroOrdersPage user={sessionUser} onBack={() => setScreen('admin-menu')} onOpenOrder={(tableId) => setScreen('table-order', { tableId })} />
          )}
          {screenState === 'admin-users' && <UsersPage onBack={() => setScreen('admin-menu')} />}
          {screenState === 'menu-management' && <MenuManagementPage onBack={() => setScreen('admin-menu')} />}
          {screenState === 'admin-kitchen-monitor' && <MonitorCocinaPage onBack={() => setScreen('admin-menu')} />}
          {screenState === 'table-management' && <TableManagementPage role="ADMIN" onBack={() => setScreen('admin-menu')} onOpenTableOrder={(tableId) => setScreen('table-order', { tableId })} />}
          {screenState === 'table-order' && sessionUser && selectedTableId !== null && (
            <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('table-management')} />
          )}

          {screenState === 'mesero-menu' && sessionUser && accessToken && (
            <MeseroHomePage user={sessionUser} onLogout={handleLogout} onOpenTables={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
          )}
          {screenState === 'mesero-tables' && <TableManagementPage role="MESERO" onBack={() => setScreen('mesero-menu')} onOpenTableOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />}
          {screenState === 'mesero-table-order' && sessionUser && selectedTableId !== null && (
            <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
          )}
          {screenState === 'mesero-orders' && sessionUser && (
            <MeseroOrdersPage user={sessionUser} onBack={() => setScreen('mesero-menu')} onOpenOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />
          )}

          {screenState === 'cocina-home' && <MonitorCocinaPage onBack={handleLogout} />}
          {screenState === 'cajero-home' && sessionUser && accessToken && <CajeroHomePage user={sessionUser} onLogout={handleLogout} />}
          
          {screenState === 'cliente-home' && sessionUser && <ClientHomePage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} />}
          {screenState === 'client-menu' && sessionUser && (
            <ClientMenuPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onOpenProductDetail={(productId) => setScreen('client-product-detail', { productId })} onBack={() => setScreen('cliente-home')} />
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