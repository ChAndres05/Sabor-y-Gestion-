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

type AppScreen =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'admin-menu'
  | 'admin-users'
  | 'menu-management'
  | 'table-management'
  | 'table-order'
  | 'mesero-home'
  | 'mesero-tables'
  | 'mesero-table-order'
  | 'mesero-orders'
  | 'mesero-menu'
  | 'cocina-home'
  | 'cajero-home'
  | 'cliente-home'
  | 'client-menu'
  | 'client-product-detail'
  | 'client-reserve-table'
  | 'client-reservations'
  | 'client-reservation-order'
  | 'client-orders'
  | 'client-manage-order'
  | 'admin-reservations'
  | 'admin-orders'
  | 'admin-kitchen-monitor';

const AUTH_STORAGE_KEY = 'gestionysabor_auth';

function getScreenByRole(role: AuthUser['rol']): AppScreen {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'admin-menu';
    case USER_ROLES.MESERO:
      return 'mesero-menu';
    case USER_ROLES.COCINERO:
      return 'cocina-home';
    case USER_ROLES.CAJERO:
      return 'cajero-home';
    case USER_ROLES.CLIENTE:
      return 'cliente-home';
    default:
      return 'login';
  }
}

function getClientScreen(screen: ClientNavigationKey): AppScreen {
  switch (screen) {
    case 'menu':
      return 'client-menu';
    case 'reserve-table':
      return 'client-reserve-table';
    case 'reservations':
      return 'client-reservations';
    case 'orders':
      return 'client-orders';
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

  const setScreen = useCallback((
    newScreen: AppScreen,
    options?: { tableId?: number | null; productId?: number | null; reservationId?: number | null; replace?: boolean }
  ) => {
    const nextTableId = options?.tableId !== undefined ? options.tableId : selectedTableId;
    const nextProductId = options?.productId !== undefined ? options.productId : selectedClientProductId;
    const nextReservationId = options?.reservationId !== undefined ? options.reservationId : selectedReservationId;

    const newState = {
      screen: newScreen,
      selectedTableId: nextTableId,
      selectedClientProductId: nextProductId,
      selectedReservationId: nextReservationId,
    };

    if (options?.replace) {
      window.history.replaceState(newState, '', '#' + newScreen);
    } else {
      window.history.pushState(newState, '', '#' + newScreen);
    }

    setScreenState(newScreen);
    if (options?.tableId !== undefined) setSelectedTableId(nextTableId);
    if (options?.productId !== undefined) setSelectedClientProductId(nextProductId);
    if (options?.reservationId !== undefined) setSelectedReservationId(nextReservationId);
  }, [selectedTableId, selectedClientProductId, selectedReservationId]);

  const navigateClient = useCallback(
    (screen: ClientNavigationKey) => {
      setScreen(getClientScreen(screen), { productId: null });
    },
    [setScreen]
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as {
        screen?: AppScreen;
        selectedTableId?: number | null;
        selectedClientProductId?: number | null;
        selectedReservationId?: number | null;
      } | null;

      if (state?.screen) {
        setScreenState(state.screen);
        if (state.selectedTableId !== undefined) setSelectedTableId(state.selectedTableId);
        if (state.selectedClientProductId !== undefined) {
          setSelectedClientProductId(state.selectedClientProductId);
        }
        if (state.selectedReservationId !== undefined) {
          setSelectedReservationId(state.selectedReservationId);
        }
      } else {
        const hash = window.location.hash.replace('#', '') as AppScreen;
        if (hash) setScreenState(hash);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!savedAuth) {
        setScreen('login', { replace: true });
        setIsBootstrapping(false);
        return;
      }

      const parsed = JSON.parse(savedAuth) as { accessToken: string; user: AuthUser };
      if (parsed?.accessToken && parsed?.user) {
        setAccessToken(parsed.accessToken);
        setSessionUser(parsed.user);
        const hash = window.location.hash.replace('#', '') as AppScreen;
        if (hash && hash !== 'login' && hash !== 'register' && hash !== 'forgot-password') {
          setScreen(hash, { replace: true });
        } else {
          setScreen(getScreenByRole(parsed.user.rol), { replace: true });
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setScreen('login', { replace: true });
    } finally {
      setIsBootstrapping(false);
    }
  }, [setScreen]);

  const handleLoginSuccess = (session: AuthSession) => {
    setAccessToken(session.accessToken);
    setSessionUser(session.user);
    setScreen(getScreenByRole(session.user.rol));
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: session.accessToken, user: session.user }));
  };

  const handleLogout = () => {
    setAccessToken(null);
    setSessionUser(null);
    setScreen('login', { tableId: null, productId: null, replace: true });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background font-sans text-text">
        <p className="text-content">Cargando sesión...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-sans text-text antialiased">
      {screenState === 'login' && (
        <LoginForm onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setScreen('register')} onGoToForgotPassword={() => setScreen('forgot-password')} />
      )}
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
        />
      )}
      {screenState === 'admin-reservations' && sessionUser && accessToken && (
        <AdminReservationsPage 
          onBack={() => setScreen('admin-menu')} 
          onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })}
          onViewOrder={(tableId) => setScreen('table-order', { tableId })}
        />
      )}
      {screenState === 'admin-orders' && sessionUser && accessToken && (
        <MeseroOrdersPage 
          user={sessionUser} 
          onBack={() => setScreen('admin-menu')} 
          onOpenOrder={(tableId) => setScreen('table-order', { tableId })} 
        />
      )}
      {screenState === 'admin-users' && sessionUser && accessToken && <UsersPage onBack={() => setScreen('admin-menu')} />}
      {screenState === 'menu-management' && sessionUser && accessToken && <MenuManagementPage onBack={() => setScreen('admin-menu')} />}
      {screenState === 'admin-kitchen-monitor' && sessionUser && accessToken && <MonitorCocinaPage onBack={() => setScreen('admin-menu')} />}
      {screenState === 'table-management' && sessionUser && accessToken && (
        <TableManagementPage role="ADMIN" onBack={() => setScreen('admin-menu')} onOpenTableOrder={(tableId) => setScreen('table-order', { tableId })} />
      )}
      {screenState === 'table-order' && sessionUser && accessToken && selectedTableId !== null && (
        <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('table-management')} />
      )}

      {screenState === 'mesero-menu' && sessionUser && accessToken && (
        <MeseroHomePage user={sessionUser} onLogout={handleLogout} onOpenTables={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
      )}
      {screenState === 'mesero-tables' && sessionUser && accessToken && (
        <TableManagementPage role="MESERO" onBack={() => setScreen('mesero-menu')} onOpenTableOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />
      )}
      {screenState === 'mesero-table-order' && sessionUser && accessToken && selectedTableId !== null && (
        <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
      )}
      {screenState === 'mesero-orders' && sessionUser && accessToken && (
        <MeseroOrdersPage user={sessionUser} onBack={() => setScreen('mesero-menu')} onOpenOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />
      )}

      {screenState === 'cocina-home' && sessionUser && accessToken && <MonitorCocinaPage onBack={handleLogout} />}
      {screenState === 'cajero-home' && sessionUser && accessToken && <CajeroHomePage user={sessionUser} onLogout={handleLogout} />}
      {screenState === 'cliente-home' && sessionUser && accessToken && (
        <ClientHomePage
          user={sessionUser}
          onLogout={handleLogout}
          onNavigate={navigateClient}
        />
      )}
      {screenState === 'client-menu' && sessionUser && accessToken && (
        <ClientMenuPage
          user={sessionUser}
          onLogout={handleLogout}
          onNavigate={navigateClient}
          onOpenProductDetail={(productId) => setScreen('client-product-detail', { productId })}
          onBack={() => setScreen('cliente-home')}
        />
      )}
      {screenState === 'client-product-detail' && sessionUser && accessToken && selectedClientProductId !== null && (
        <ClientProductDetailPage
          user={sessionUser}
          productId={selectedClientProductId}
          onBack={() => setScreen('client-menu')}
          onLogout={handleLogout}
          onNavigate={navigateClient}
        />
      )}
      {screenState === 'client-reserve-table' && sessionUser && accessToken && (
        <TableManagementPage 
          role="CLIENTE" 
          user={sessionUser} 
          onNavigate={navigateClient} 
          onBack={() => setScreen('cliente-home')} 
        />
      )}
      {screenState === 'client-reservations' && sessionUser && accessToken && (
        <ClientReservationsPage 
          user={sessionUser} 
          onLogout={handleLogout} 
          onNavigate={navigateClient} 
          onBack={() => setScreen('cliente-home')}
          onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })}
        />
      )}
      {screenState === 'client-reservation-order' && sessionUser && accessToken && selectedReservationId !== null && (
        <ClientReservationOrderPage
          user={sessionUser}
          reservationId={selectedReservationId}
          onBack={() => setScreen('client-reservations')}
          onNavigateToOrders={() => navigateClient('orders')}
        />
      )}
      {screenState === 'client-orders' && sessionUser && accessToken && (
        <ClientOrdersPage 
          user={sessionUser} 
          onLogout={handleLogout} 
          onNavigate={navigateClient} 
          onBack={() => setScreen('cliente-home')} 
          onManageOrder={(tableId) => setScreen('client-manage-order', { tableId })}
        />
      )}
      {screenState === 'client-manage-order' && sessionUser && accessToken && selectedTableId !== null && (
        <ClientActiveOrderPage
          user={sessionUser}
          tableId={selectedTableId}
          onBack={() => navigateClient('orders')}
        />
      )}
    </main>
  );
}

export default App;
