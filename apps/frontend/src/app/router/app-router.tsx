import { Navigate, Route, Routes } from 'react-router-dom';

import RoleSelectionPage from '../../modules/auth/pages/role-selection-page';
import MyProfilePage from '../../modules/profile/pages/my-profile-page';
import { APP_ROUTES } from '../../shared/constants/routes';

const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#f9fafb',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          padding: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: '12px',
            fontSize: '1.8rem',
            color: '#111827',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin: 0,
            color: '#6b7280',
            lineHeight: 1.6,
          }}
        >
          Esta vista quedó preparada como placeholder para continuar el módulo.
        </p>
      </section>
    </main>
  );
};

export const AppRouter = () => {
  return (
    <Routes>
      <Route
        path={APP_ROUTES.ROOT}
        element={<Navigate to={APP_ROUTES.ROLE_SELECTION} replace />}
      />

      <Route
        path={APP_ROUTES.LOGIN}
        element={<PlaceholderPage title="Login" />}
      />

      <Route
        path={APP_ROUTES.REGISTER}
        element={<PlaceholderPage title="Registro" />}
      />

      <Route
        path={APP_ROUTES.UNAUTHORIZED}
        element={<PlaceholderPage title="Acceso no autorizado" />}
      />

      <Route
        path={APP_ROUTES.ROLE_SELECTION}
        element={<RoleSelectionPage />}
      />

      <Route
        path={APP_ROUTES.PROFILE}
        element={<MyProfilePage />}
      />

      <Route
        path={APP_ROUTES.ADMIN_HOME}
        element={<PlaceholderPage title="Panel de administración" />}
      />

      <Route
        path={APP_ROUTES.MESERO_HOME}
        element={<PlaceholderPage title="Inicio de mesero" />}
      />

      <Route
        path={APP_ROUTES.TABLES}
        element={<PlaceholderPage title="Mapa de mesas" />}
      />

      <Route
        path={APP_ROUTES.CAJA_HOME}
        element={<PlaceholderPage title="Inicio de caja" />}
      />

      <Route
        path={APP_ROUTES.COCINA_HOME}
        element={<PlaceholderPage title="Inicio de cocina" />}
      />

      <Route
        path={APP_ROUTES.KITCHEN_MONITOR}
        element={<PlaceholderPage title="Monitor de cocina" />}
      />

      <Route
        path={APP_ROUTES.CLIENTE_HOME}
        element={<PlaceholderPage title="Inicio de cliente" />}
      />

      <Route
        path={APP_ROUTES.DELIVERY_HOME}
        element={<PlaceholderPage title="Inicio de delivery" />}
      />

      <Route
        path="*"
        element={<Navigate to={APP_ROUTES.ROLE_SELECTION} replace />}
      />
    </Routes>
  );
};

export default AppRouter;