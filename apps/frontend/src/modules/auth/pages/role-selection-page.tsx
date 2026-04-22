import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { UserProfile } from '../../profile/types/profile.types';
import {
  ALL_ROLE_KEYS,
  ROLE_LABELS,
  type RoleKey,
} from '../../../shared/constants/roles';
import { APP_ROUTES } from '../../../shared/constants/routes';
import {
  getUserRoleKey,
  hasRequiredRole,
  isUserActive,
  isAdmin,
} from '../../../shared/utils/permissions';
import { getDefaultRouteByRole } from '../../../shared/utils/redirect-by-role';

const mockUser: UserProfile = {
  id_usuario: 1,
  id_rol: 1,
  usuario_ci: 12345678,
  nombre: 'Ronici',
  apellido: 'Cuellar',
  nombre_usuario: 'ronicicuellar0',
  telefono: '70000000',
  correo_electronico: 'ronicicuellar0@gmail.com',
  activo: true,
  fecha_creacion: new Date().toISOString(),
  rol: {
    id_rol: 1,
    nombre: 'ADMINISTRADOR',
  },
};

const getRoleRoute = (role: RoleKey): string => {
  switch (role) {
    case 'ADMIN':
      return APP_ROUTES.ADMIN_HOME;
    case 'MESERO':
      return APP_ROUTES.TABLES;
    case 'CAJA':
      return APP_ROUTES.CAJA_HOME;
    case 'COCINA':
      return APP_ROUTES.KITCHEN_MONITOR;
    case 'CLIENTE':
      return APP_ROUTES.CLIENTE_HOME;
    case 'DELIVERY':
      return APP_ROUTES.DELIVERY_HOME;
    default:
      return APP_ROUTES.UNAUTHORIZED;
  }
};

const getVisibleRoles = (user: UserProfile): RoleKey[] => {
  if (!isUserActive(user)) return [];

  if (isAdmin(user)) {
    return ALL_ROLE_KEYS;
  }

  const currentRole = getUserRoleKey(user);
  return currentRole ? [currentRole] : [];
};

export const RoleSelectionPage = () => {
  const navigate = useNavigate();

  const availableRoles = useMemo(() => getVisibleRoles(mockUser), []);

  const handleGoByRole = (role: RoleKey) => {
    if (!hasRequiredRole(mockUser, [role]) && !isAdmin(mockUser)) {
      navigate(APP_ROUTES.UNAUTHORIZED);
      return;
    }

    navigate(getRoleRoute(role));
  };

  const handleContinue = () => {
    navigate(getDefaultRouteByRole(mockUser));
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 20px',
        background:
          'linear-gradient(180deg, #fff7ed 0%, #fffbeb 50%, #ffffff 100%)',
      }}
    >
      <section
        style={{
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        <header style={{ marginBottom: '24px' }}>
          <p
            style={{
              margin: 0,
              color: '#9a3412',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Selección de entorno
          </p>

          <h1
            style={{
              marginTop: '12px',
              marginBottom: '8px',
              fontSize: '2rem',
              color: '#111827',
            }}
          >
            Bienvenido, {mockUser.nombre}
          </h1>

          <p
            style={{
              margin: 0,
              color: '#6b7280',
              maxWidth: '680px',
              lineHeight: 1.6,
            }}
          >
            Elige el entorno de trabajo al que deseas ingresar según tu rol.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleGoByRole(role)}
              style={{
                border: '1px solid #fed7aa',
                borderRadius: '18px',
                padding: '20px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.06)',
                transition: 'transform 0.2s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  marginBottom: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#c2410c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Acceso
              </span>

              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  color: '#111827',
                }}
              >
                {ROLE_LABELS[role]}
              </h2>

              <p
                style={{
                  marginTop: '10px',
                  marginBottom: 0,
                  color: '#6b7280',
                  lineHeight: 1.5,
                }}
              >
                Ingresar al módulo de {ROLE_LABELS[role].toLowerCase()}.
              </p>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleContinue}
            style={{
              border: 'none',
              borderRadius: '14px',
              padding: '12px 18px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continuar con mi acceso principal
          </button>

          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.PROFILE)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '14px',
              padding: '12px 18px',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ver mi perfil
          </button>
        </div>
      </section>
    </main>
  );
};

export default RoleSelectionPage;