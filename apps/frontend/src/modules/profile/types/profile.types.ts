export interface Role {
  id_rol: number;
  nombre: string;
}

export interface UserProfile {
  id_usuario: number;
  id_rol: number;
  usuario_ci: number;
  nombre: string;
  apellido: string | null;
  nombre_usuario: string;
  telefono: string | null;
  correo_electronico: string | null;
  activo: boolean;
  fecha_creacion: string;
  rol?: Role | null;
}