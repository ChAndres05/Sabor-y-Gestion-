import { useState } from 'react';
import { LoginForm } from './modules/auth/LoginForm';
import RegisterForm from './modules/auth/RegisterForm';
import type { AuthUser } from './modules/auth/types/auth.types';
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

  const handleLoginSuccess = (user: AuthUser) => {
    setSessionUser(user);
    setScreen(getScreenByRole(user.rol));
  };

  const handleLogout = () => {
    setSessionUser(null);
    setScreen('login');
  };

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

      {screen === 'admin-menu' && sessionUser && (
        <AdminMenuPage
          user={sessionUser}
          onLogout={handleLogout}
          onOpenUsers={() => setScreen('admin-users')}
        />
      )}

      {screen === 'admin-users' && sessionUser && (
        <UsersPage onBack={() => setScreen('admin-menu')} />
      )}

      {screen === 'mesero-home' && sessionUser && (
        <MeseroHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cocina-home' && sessionUser && (
        <CocinaHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cajero-home' && sessionUser && (
        <CajeroHomePage user={sessionUser} onLogout={handleLogout} />
      )}

      {screen === 'cliente-home' && sessionUser && (
        <ClienteHomePage user={sessionUser} onLogout={handleLogout} />
      )}
    </main>
  );
}

export default App;