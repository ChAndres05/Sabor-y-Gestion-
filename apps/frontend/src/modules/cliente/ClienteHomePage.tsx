
import type { AuthUser } from '../auth/types/auth.types';

interface ClienteHomePageProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function ClienteHomePage({
  user,
  onLogout,
}: ClienteHomePageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-title font-bold text-text">Inicio Cliente</h1>
      <p className="mt-3 text-content text-gray-600">
        Bienvenido, {user.nombre}. Este módulo se conectará después.
      </p>

      <button
        onClick={onLogout}
        className="mt-8 rounded-2xl bg-primary px-6 py-3 font-bold text-white hover:bg-primary-hover"
      >
        Cerrar sesión
      </button>
    </div>
  );
}