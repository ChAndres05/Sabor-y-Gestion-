type PasswordRecoveryUser = {
  id: number;
  username: string;
  correo: string;
  activo: boolean;
  password: string;
};

type ResetRequest = {
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
};

const MOCK_RESET_CODE = '123456';
const CODE_DURATION_MS = 5 * 60 * 1000;

const users: PasswordRecoveryUser[] = [
  {
    id: 1,
    username: 'admin',
    correo: 'admin@gestionysabor.com',
    activo: true,
    password: '123456',
  },
  {
    id: 2,
    username: 'mesero1',
    correo: 'mesero1@gestionysabor.com',
    activo: true,
    password: '123456',
  },
  {
    id: 3,
    username: 'cocina1',
    correo: 'cocina1@gestionysabor.com',
    activo: true,
    password: '123456',
  },
  {
    id: 4,
    username: 'cajero1',
    correo: 'cajero1@gestionysabor.com',
    activo: true,
    password: '123456',
  },
  {
    id: 5,
    username: 'cliente1',
    correo: 'cliente1@gestionysabor.com',
    activo: false,
    password: '123456',
  },
];

const resetRequests = new Map<string, ResetRequest>();

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getActiveUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const foundUser = users.find(
    (user) => user.correo.toLowerCase() === normalizedEmail
  );

  if (!foundUser) {
    throw new Error('No existe una cuenta con ese correo electrónico');
  }

  if (!foundUser.activo) {
    throw new Error('La cuenta está desactivada');
  }

  return foundUser;
}

export async function requestPasswordResetMock(email: string) {
  await delay();

  const user = getActiveUserByEmail(email);
  const normalizedEmail = normalizeEmail(user.correo);

  resetRequests.set(normalizedEmail, {
    email: normalizedEmail,
    code: MOCK_RESET_CODE,
    expiresAt: Date.now() + CODE_DURATION_MS,
    verified: false,
  });

  console.info(
    `[MOCK PASSWORD RESET] Código para ${normalizedEmail}: ${MOCK_RESET_CODE}`
  );

  return {
    success: true,
    message: 'Código enviado correctamente',
  };
}

export async function verifyPasswordResetCodeMock(email: string, code: string) {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const request = resetRequests.get(normalizedEmail);

  if (!request) {
    throw new Error('Primero solicita un código de recuperación');
  }

  if (Date.now() > request.expiresAt) {
    resetRequests.delete(normalizedEmail);
    throw new Error('El código expiró. Solicita uno nuevo');
  }

  if (request.code !== code.trim()) {
    throw new Error('El código ingresado es incorrecto');
  }

  resetRequests.set(normalizedEmail, {
    ...request,
    verified: true,
  });

  return {
    success: true,
    message: 'Código verificado correctamente',
  };
}

export async function resetPasswordMock(
  email: string,
  code: string,
  newPassword: string,
  confirmPassword: string
) {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const request = resetRequests.get(normalizedEmail);

  if (!request) {
    throw new Error('Primero solicita un código de recuperación');
  }

  if (Date.now() > request.expiresAt) {
    resetRequests.delete(normalizedEmail);
    throw new Error('El código expiró. Solicita uno nuevo');
  }

  if (request.code !== code.trim()) {
    throw new Error('El código ingresado es incorrecto');
  }

  if (!request.verified) {
    throw new Error('Debes validar el código antes de cambiar la contraseña');
  }

  if (!newPassword.trim() || !confirmPassword.trim()) {
    throw new Error('Completa todos los campos');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden');
  }

  if (newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const user = getActiveUserByEmail(normalizedEmail);
  user.password = newPassword;

  resetRequests.delete(normalizedEmail);

  return {
    success: true,
    message: 'Contraseña actualizada correctamente',
  };
}