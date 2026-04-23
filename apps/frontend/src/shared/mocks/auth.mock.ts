import { USER_ROLES, type UserRole } from '../constants/roles';
import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '../../modules/auth/types/auth.types';

type MockUserRecord = AuthUser & {
  password: string;
};

let nextId = 6;

const users: MockUserRecord[] = [
  {
    id: 1,
    username: 'admin',
    nombre: 'Juanito',
    apellido: 'Perez',
    correo: 'admin@gestionysabor.com',
    telefono: '70000001',
    ci: 111111,
    activo: true,
    rol: USER_ROLES.ADMIN,
    password: '123456',
  },
  {
    id: 2,
    username: 'mesero1',
    nombre: 'Mario',
    apellido: 'Torres',
    correo: 'mesero1@gestionysabor.com',
    telefono: '70000002',
    ci: 222222,
    activo: true,
    rol: USER_ROLES.MESERO,
    password: '123456',
  },
  {
    id: 3,
    username: 'cocina1',
    nombre: 'Carla',
    apellido: 'Rojas',
    correo: 'cocina1@gestionysabor.com',
    telefono: '70000003',
    ci: 333333,
    activo: true,
    rol: USER_ROLES.COCINERO,
    password: '123456',
  },
  {
    id: 4,
    username: 'cajero1',
    nombre: 'Luis',
    apellido: 'Mamani',
    correo: 'cajero1@gestionysabor.com',
    telefono: '70000004',
    ci: 444444,
    activo: true,
    rol: USER_ROLES.CAJERO,
    password: '123456',
  },
  {
    id: 5,
    username: 'cliente1',
    nombre: 'Ana',
    apellido: 'Lopez',
    correo: 'cliente1@gestionysabor.com',
    telefono: '70000005',
    ci: 555555,
    activo: false,
    rol: USER_ROLES.CLIENTE,
    password: '123456',
  },
];

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeUser(user: MockUserRecord): AuthUser {
  const safeUser: Partial<MockUserRecord> = { ...user };
  delete safeUser.password;
  return safeUser as AuthUser;
}

export async function loginMock(payload: LoginPayload): Promise<AuthSession> {
  await delay();

  const foundUser = users.find(
    (user) =>
      user.username.toLowerCase() === payload.identifier.toLowerCase() ||
      user.correo.toLowerCase() === payload.identifier.toLowerCase()
  );

  if (!foundUser) {
    throw new Error('Nombre de usuario o correo no encontrado');
  }

  if (foundUser.password !== payload.password) {
    throw new Error('Contraseña incorrecta');
  }

  if (!foundUser.activo) {
    throw new Error('Cuenta desactivada');
  }

  return {
    accessToken: `mock-token-${foundUser.id}`,
    user: sanitizeUser(foundUser),
  };
}

export async function registerMock(
  payload: RegisterPayload
): Promise<AuthUser> {
  await delay();

  if (payload.password !== payload.confirmPassword) {
    throw new Error('Las contraseñas no coinciden');
  }

  const usernameExists = users.some(
    (user) => user.username.toLowerCase() === payload.username.toLowerCase()
  );

  if (usernameExists) {
    throw new Error('El nombre de usuario ya existe');
  }

  const emailExists = users.some(
    (user) => user.correo.toLowerCase() === payload.correo.toLowerCase()
  );

  if (emailExists) {
    throw new Error('El correo ya está registrado');
  }

  const newUser: MockUserRecord = {
    id: nextId++,
    username: payload.username,
    nombre: payload.nombre,
    apellido: payload.apellido,
    correo: payload.correo,
    telefono: payload.telefono,
    activo: true,
    rol: USER_ROLES.CLIENTE,
    password: payload.password,
  };

  users.push(newUser);

  return sanitizeUser(newUser);
}

export async function listUsersMock(): Promise<AuthUser[]> {
  await delay();
  return users.map(sanitizeUser);
}

export async function updateUserRoleMock(
  userId: number,
  role: UserRole
): Promise<AuthUser> {
  await delay();

  const foundUser = users.find((user) => user.id === userId);

  if (!foundUser) {
    throw new Error('Usuario no encontrado');
  }

  foundUser.rol = role;
  return sanitizeUser(foundUser);
}

export async function updateUserStatusMock(
  userId: number,
  activo: boolean
): Promise<AuthUser> {
  await delay();

  const foundUser = users.find((user) => user.id === userId);

  if (!foundUser) {
    throw new Error('Usuario no encontrado');
  }

  foundUser.activo = activo;
  return sanitizeUser(foundUser);
}