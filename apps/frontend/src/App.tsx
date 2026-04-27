import { useEffect, useState } from 'react';
import { LoginForm } from './modules/auth/LoginForm';
import RegisterForm from './modules/auth/RegisterForm';
import type { AuthSession, AuthUser } from './modules/auth/types/auth.types';
import { USER_ROLES } from './shared/constants/roles';
import AdminMenuPage from './modules/admin/AdminMenuPage';
import MeseroHomePage from './modules/mesero/MeseroHomePage';
import CocinaHomePage from './modules/cocina/CocinaHomePage';
import CajeroHomePage from './modules/cajero/CajeroHomePage';
import ClienteHomePage from './modules/cliente/ClienteHomePage';
import UsersPage from './modules/users/UsersPage';

type AppScreen =
  | 'login'
  | 'register'
  | 'admin-menu'
  | 'admin-users'
  | 'mesero-home'
  | 'cocina-home'
  | 'cajero-home'
  | 'cliente-home';

const AUTH_STORAGE_KEY = 'gestionysabor_auth';

function getScreenByRole(role: AuthUser['rol']): AppScreen {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'admin-menu';
    case USER_ROLES.MESERO:
      return 'mesero-home';
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

function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

      if (!savedAuth) {
        setIsBootstrapping(false);
        return;
      }

      const parsed = JSON.parse(savedAuth) as {
        accessToken: string;
        user: AuthUser;
      };

      if (parsed?.accessToken && parsed?.user) {
        setAccessToken(parsed.accessToken);
        setSessionUser(parsed.user);
        setScreen(getScreenByRole(parsed.user.rol));
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  const handleLoginSuccess = (session: AuthSession) => {
    setAccessToken(session.accessToken);
    setSessionUser(session.user);
    setScreen(getScreenByRole(session.user.rol));

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: session.accessToken,
        user: session.user,
      })
    );
  };

  const handleLogout = () => {
    setAccessToken(null);
    setSessionUser(null);
    setScreen('login');
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
      {screen === 'login' && (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setScreen('register')}
        />
      )}

      {screen === 'register' && (
        <RegisterForm onGoToLogin={() => setScreen('login')} />
      )}

      {screen === 'admin-menu' && sessionUser && accessToken && (
        <AdminMenuPage
          user={sessionUser}
          onLogout={handleLogout}
          onOpenUsers={() => setScreen('admin-users')}
        />
      )}

      {screen === 'admin-users' && sessionUser && accessToken && (
        <UsersPage onBack={() => setScreen('admin-menu')} />
      )}

      {screen === 'mesero-home' && sessionUser && accessToken && (
        <MeseroHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cocina-home' && sessionUser && accessToken && (
        <CocinaHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cajero-home' && sessionUser && accessToken && (
        <CajeroHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cliente-home' && sessionUser && accessToken && (
        <ClienteHomePage user={sessionUser} onLogout={handleLogout} />
      )}
    </main>
  );
}

export default App;