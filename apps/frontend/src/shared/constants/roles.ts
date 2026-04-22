export const ROLE_KEYS = {
  ADMIN: 'ADMIN',
  MESERO: 'MESERO',
  CAJA: 'CAJA',
  COCINA: 'COCINA',
  CLIENTE: 'CLIENTE',
  DELIVERY: 'DELIVERY',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: 'Administración',
  MESERO: 'Mesero',
  CAJA: 'Caja',
  COCINA: 'Cocina',
  CLIENTE: 'Cliente',
  DELIVERY: 'Delivery',
};

export const ROLE_NAME_ALIASES: Record<RoleKey, string[]> = {
  ADMIN: ['ADMIN', 'ADMINISTRADOR', 'ADMINISTRACION'],
  MESERO: ['MESERO'],
  CAJA: ['CAJA', 'CAJERO'],
  COCINA: ['COCINA', 'COCINERO'],
  CLIENTE: ['CLIENTE', 'USUARIO'],
  DELIVERY: ['DELIVERY', 'REPARTIDOR'],
};

export const normalizeRoleName = (roleName: string): string => {
  return roleName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_');
};

export const resolveRoleKey = (roleName?: string | null): RoleKey | null => {
  if (!roleName) return null;

  const normalized = normalizeRoleName(roleName);

  for (const [roleKey, aliases] of Object.entries(ROLE_NAME_ALIASES) as [
    RoleKey,
    string[],
  ][]) {
    const normalizedAliases = aliases.map(normalizeRoleName);

    if (normalizedAliases.includes(normalized)) {
      return roleKey;
    }
  }

  return null;
};

export const ALL_ROLE_KEYS: RoleKey[] = Object.values(ROLE_KEYS);