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
import ClientCartPage from './modules/cliente/ClientCartPage';
import UsersPage from './modules/users/UsersPage';
import MenuManagementPage from './modules/menu/MenuManagementPage';
import InventarioLayout from './modules/admin/inventario/InventarioLayout';
import TableManagementPage from './modules/tables/TableManagementPage';
import MonitorCocinaPage from './modules/cocina/MonitorCocinaPage';
import AdminReservationsPage from './modules/admin/AdminReservationsPage';
import AdminInvoicesPage from './modules/admin/AdminInvoicesPage';
import AdminCouponsPage from './modules/admin/AdminCouponsPage';
import AdminDeliveryPage from './modules/admin/AdminDeliveryPage';
import ServiceHistoryPage from './modules/history/ServiceHistoryPage';
import CashHistoryPage from './modules/history/CashHistoryPage';
import type { ClientNavigationKey } from './shared/types/client-flow.types';
import { pusherClient } from './shared/utils/pusher';
import { emitRestaurantStateChanged } from './shared/utils/events';
import { Sidebar } from './shared/components/Sidebar';


type AppScreen =
  | 'login' | 'register' | 'forgot-password' | 'admin-menu' | 'admin-users'
  | 'menu-management' | 'admin-inventory' | 'table-management' | 'table-order' | 'mesero-home'
  | 'mesero-tables' | 'mesero-table-order' | 'mesero-orders' | 'mesero-menu'
  | 'cocina-home' | 'cajero-home' | 'cliente-home' | 'client-menu'
  | 'client-product-detail' | 'client-reserve-table' | 'client-reservations'
  | 'client-reservation-order' | 'client-orders' | 'client-manage-order' | 'client-cart'
  | 'admin-reservations' | 'admin-orders' | 'admin-kitchen-monitor' | 'service-history' | 'cash-history' | 'admin-invoices' | 'admin-coupons' | 'admin-delivery';

const AUTH_STORAGE_KEY = 'gestionysabor_auth';

const ROLE_PERMISSIONS: Record<string, AppScreen[]> = {
  [USER_ROLES.ADMIN]: ['admin-menu', 'admin-users', 'menu-management', 'admin-inventory', 'table-management', 'table-order', 'admin-kitchen-monitor', 'admin-reservations', 'admin-orders', 'client-reservation-order', 'mesero-orders', 'mesero-table-order', 'service-history', 'cash-history', 'admin-invoices', 'admin-coupons', 'admin-delivery'],
  [USER_ROLES.MESERO]: ['mesero-menu', 'mesero-tables', 'mesero-table-order', 'mesero-orders'],
  [USER_ROLES.COCINERO]: ['cocina-home'],
  [USER_ROLES.CAJERO]: ['cajero-home', 'admin-delivery'],
  [USER_ROLES.CLIENTE]: ['cliente-home', 'client-menu', 'client-product-detail', 'client-reserve-table', 'client-reservations', 'client-reservation-order', 'client-orders', 'client-manage-order', 'client-cart']
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
    case 'cart': return 'client-cart';
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
          { key: 'productos', label: 'Administración de productos', active: screenState === 'menu-management', onClick: () => { setScreen('menu-management'); setIsSidebarOpen(false); } },
          { key: 'inventario', label: 'Gestión de Inventario', active: screenState === 'admin-inventory', onClick: () => { setScreen('admin-inventory'); setIsSidebarOpen(false); } },
          { key: 'mesas', label: 'Gestión de Mesas', active: ['table-management', 'table-order'].includes(screenState), onClick: () => { setScreen('table-management'); setIsSidebarOpen(false); } },
          { key: 'cocina', label: 'Monitor de cocina', active: screenState === 'admin-kitchen-monitor', onClick: () => { setScreen('admin-kitchen-monitor'); setIsSidebarOpen(false); } },
          { key: 'reservas', label: 'Gestión de reservas', active: screenState === 'admin-reservations', onClick: () => { setScreen('admin-reservations'); setIsSidebarOpen(false); } },
          { key: 'pedidos', label: 'Gestión de pedidos', active: screenState === 'admin-orders', onClick: () => { setScreen('admin-orders'); setIsSidebarOpen(false); } },
          { key: 'delivery', label: 'Atención Delivery', active: screenState === 'admin-delivery', onClick: () => { setScreen('admin-delivery'); setIsSidebarOpen(false); } },
          { key: 'facturacion', label: 'Facturación', active: screenState === 'cajero-home' && selectedCajeroView === 'facturacion', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('facturacion'); setIsSidebarOpen(false); } },
          { key: 'cierre', label: 'Cierre de Caja', active: screenState === 'cajero-home' && selectedCajeroView === 'cierre', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('cierre'); setIsSidebarOpen(false); } },
          { key: 'facturas-admin', label: 'Control de Facturas', active: screenState === 'admin-invoices', onClick: () => { setScreen('admin-invoices'); setIsSidebarOpen(false); } },
          { key: 'cupones', label: 'Gestión de Cupones', active: screenState === 'admin-coupons', onClick: () => { setScreen('admin-coupons'); setIsSidebarOpen(false); } },
          { key: 'usuarios', label: 'Gestión de Usuarios', active: screenState === 'admin-users', onClick: () => { setScreen('admin-users'); setIsSidebarOpen(false); } },
          { key: 'historial', label: 'Historial de Atención', active: screenState === 'service-history', onClick: () => { setScreen('service-history'); setIsSidebarOpen(false); } },
          { key: 'historial-caja', label: 'Historial de Caja', active: screenState === 'cash-history', onClick: () => { setScreen('cash-history'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.MESERO:
        return [
          { key: 'mesas', label: 'Gestionar mesas', active: ['mesero-tables', 'mesero-table-order'].includes(screenState), onClick: () => { setScreen('mesero-tables'); setIsSidebarOpen(false); } },
          { key: 'pedidos', label: 'Gestionar pedidos', active: screenState === 'mesero-orders', onClick: () => { setScreen('mesero-orders'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.CAJERO:
        return [
          { key: 'delivery', label: 'Atención Delivery', active: screenState === 'admin-delivery', onClick: () => { setScreen('admin-delivery'); setIsSidebarOpen(false); } },
          { key: 'facturacion', label: 'Facturación', active: screenState === 'cajero-home' && selectedCajeroView === 'facturacion', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('facturacion'); setIsSidebarOpen(false); } },
          { key: 'cierre', label: 'Cierre de Caja', active: screenState === 'cajero-home' && selectedCajeroView === 'cierre', onClick: () => { setScreen('cajero-home'); setSelectedCajeroView('cierre'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.COCINERO:
        return [
          { key: 'cocina', label: 'Monitor de Cocina', active: screenState === 'cocina-home', onClick: () => { setScreen('cocina-home'); setIsSidebarOpen(false); } }
        ];
      case USER_ROLES.CLIENTE:
        return [
          { key: 'menu', label: 'Menú', active: ['client-menu', 'client-product-detail'].includes(screenState), onClick: () => { navigateClient('menu'); setIsSidebarOpen(false); } },
          { key: 'cart', label: 'Mi pedido (Carrito)', active: screenState === 'client-cart', onClick: () => { navigateClient('cart'); setIsSidebarOpen(false); } },
          { key: 'reserve-table', label: 'Reservar mesa', active: screenState === 'client-reserve-table', onClick: () => { navigateClient('reserve-table'); setIsSidebarOpen(false); } },
          { key: 'reservations', label: 'Mis reservas', active: ['client-reservations', 'client-reservation-order'].includes(screenState), onClick: () => { navigateClient('reservations'); setIsSidebarOpen(false); } },
          { key: 'orders', label: 'Mis pedidos', active: ['client-orders', 'client-manage-order'].includes(screenState), onClick: () => { navigateClient('orders'); setIsSidebarOpen(false); } }
        ];
      default:
        return [];
    }
  }, [setScreen, navigateClient, screenState, selectedCajeroView]);

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
    const handleOpenSidebar = () => setIsSidebarOpen(true);
    window.addEventListener('open-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-sidebar', handleOpenSidebar);
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
        
        // Restore active navigation IDs from history state on reload
        const historyState = window.history.state as {
          selectedTableId?: number | null;
          selectedClientProductId?: number | null;
          selectedReservationId?: number | null;
        } | null;

        setScreen(target, { 
          replace: true,
          tableId: historyState?.selectedTableId !== undefined ? historyState.selectedTableId : null,
          productId: historyState?.selectedClientProductId !== undefined ? historyState.selectedClientProductId : null,
          reservationId: historyState?.selectedReservationId !== undefined ? historyState.selectedReservationId : null
        });
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
              onOpenInvoices={() => setScreen('admin-invoices')}
              onOpenCoupons={() => setScreen('admin-coupons')}
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
          {screenState === 'admin-inventory' && <InventarioLayout onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'admin-kitchen-monitor' && <MonitorCocinaPage onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'table-management' && sessionUser && <TableManagementPage role="ADMIN" user={sessionUser} onBack={() => setIsSidebarOpen(true)} onOpenTableOrder={(tableId) => setScreen('table-order', { tableId })} />}
          {screenState === 'table-order' && sessionUser && selectedTableId !== null && (
            <MeseroOrderFlowPage user={sessionUser} tableId={selectedTableId} onBack={() => setScreen('table-management')} />
          )}

          {screenState === 'mesero-menu' && sessionUser && accessToken && (
            <MeseroHomePage user={sessionUser} onLogout={handleLogout} onOpenTables={() => setScreen('mesero-tables')} onOpenOrders={() => setScreen('mesero-orders')} />
          )}
          {screenState === 'mesero-tables' && sessionUser && <TableManagementPage role="MESERO" user={sessionUser} onBack={() => setIsSidebarOpen(true)} onOpenTableOrder={(tableId) => setScreen('mesero-table-order', { tableId })} />}
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

          {screenState === 'admin-invoices' && (
            <AdminInvoicesPage onBack={() => setIsSidebarOpen(true)} />
          )}

          {screenState === 'admin-coupons' && (
            <AdminCouponsPage onBack={() => setIsSidebarOpen(true)} />
          )}

          {screenState === 'admin-delivery' && sessionUser && (
            <AdminDeliveryPage user={sessionUser} onBack={() => setIsSidebarOpen(true)} />
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
            <ClientMenuPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onOpenProductDetail={(productId) => setScreen('client-product-detail', { productId })} />
          )}
          {screenState === 'client-product-detail' && sessionUser && selectedClientProductId !== null && (
            <ClientProductDetailPage user={sessionUser} productId={selectedClientProductId} onBack={() => setScreen('client-menu')} onLogout={handleLogout} onNavigate={navigateClient} />
          )}
          {screenState === 'client-cart' && sessionUser && (
            <ClientCartPage user={sessionUser} onNavigate={navigateClient} onLogout={handleLogout} />
          )}
          {screenState === 'client-reserve-table' && sessionUser && <TableManagementPage role="CLIENTE" user={sessionUser} onNavigate={navigateClient} onBack={() => setIsSidebarOpen(true)} />}
          {screenState === 'client-reservations' && sessionUser && (
            <ClientReservationsPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onOpenReservationOrder={(resId) => setScreen('client-reservation-order', { reservationId: resId })} />
          )}
          {screenState === 'client-reservation-order' && sessionUser && selectedReservationId !== null && (
            <ClientReservationOrderPage 
              user={sessionUser} 
              reservationId={selectedReservationId} 
              onBack={() => {
                if (sessionUser.rol === USER_ROLES.ADMIN) setScreen('admin-reservations');
                else if (sessionUser.rol === USER_ROLES.MESERO) setScreen('mesero-tables');
                else setScreen('client-reservations');
              }} 
              onNavigateToOrders={() => {
                if (sessionUser.rol === USER_ROLES.ADMIN) setScreen('admin-orders');
                else if (sessionUser.rol === USER_ROLES.MESERO) setScreen('mesero-orders');
                else navigateClient('orders');
              }} 
            />
          )}
          {screenState === 'client-orders' && sessionUser && (
            <ClientOrdersPage user={sessionUser} onLogout={handleLogout} onNavigate={navigateClient} onManageOrder={(tableId) => setScreen('client-manage-order', { tableId })} />
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