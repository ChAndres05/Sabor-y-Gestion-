import ProfileCard from '../components/profile-card';
import type { UserProfile } from '../types/profile.types';

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

export const MyProfilePage = () => {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 20px',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <ProfileCard user={mockUser} />
    </main>
  );
};

export default MyProfilePage;