import type { UserProfile } from '../types/profile.types';

interface ProfileCardProps {
  user: UserProfile;
  title?: string;
}

const getFullName = (user: UserProfile): string => {
  return [user.nombre, user.apellido].filter(Boolean).join(' ');
};

export const ProfileCard = ({
  user,
  title = 'Perfil de usuario',
}: ProfileCardProps) => {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: '720px',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '24px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
      }}
    >
      <header style={{ marginBottom: '20px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
            fontWeight: 700,
            color: '#111827',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            marginTop: '8px',
            marginBottom: 0,
            color: '#6b7280',
            fontSize: '0.95rem',
          }}
        >
          Información principal del usuario.
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
          <p>{user.rol?.nombre ?? 'No definido'}</p>
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