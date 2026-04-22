import type { UserProfile } from '../types/profile.types';
import { ROLE_LABELS, resolveRoleKey } from '../../../shared/constants/roles';

interface ProfileCardProps {
  user: UserProfile;
}

const getFullName = (user: UserProfile): string => {
  return [user.nombre, user.apellido].filter(Boolean).join(' ');
};

const getRoleLabel = (user: UserProfile): string => {
  const roleKey = resolveRoleKey(user.rol?.nombre ?? null);

  if (!roleKey) {
    return user.rol?.nombre ?? 'Rol no definido';
  }

  return ROLE_LABELS[roleKey];
};

export const ProfileCard = ({ user }: ProfileCardProps) => {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '24px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
        maxWidth: '720px',
        width: '100%',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
          }}
        >
          Perfil de usuario
        </h2>

        <p
          style={{
            marginTop: '8px',
            marginBottom: 0,
            color: '#6b7280',
            fontSize: '0.95rem',
          }}
        >
          Información principal del usuario autenticado.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <strong>Nombre completo</strong>
          <p>{getFullName(user) || 'No disponible'}</p>
        </div>

        <div>
          <strong>CI</strong>
          <p>{user.usuario_ci}</p>
        </div>

        <div>
          <strong>Nombre de usuario</strong>
          <p>{user.nombre_usuario}</p>
        </div>

        <div>
          <strong>Correo electrónico</strong>
          <p>{user.correo_electronico ?? 'No disponible'}</p>
        </div>

        <div>
          <strong>Teléfono</strong>
          <p>{user.telefono ?? 'No disponible'}</p>
        </div>

        <div>
          <strong>Rol</strong>
          <p>{getRoleLabel(user)}</p>
        </div>

        <div>
          <strong>Estado</strong>
          <p>{user.activo ? 'Activo' : 'Inactivo'}</p>
        </div>

        <div>
          <strong>Fecha de creación</strong>
          <p>{new Date(user.fecha_creacion).toLocaleString()}</p>
        </div>
      </div>
    </section>
  );
};

export default ProfileCard;