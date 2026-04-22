export const APP_ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',
  ROLE_SELECTION: '/role-selection',
  PROFILE: '/profile',

  ADMIN_HOME: '/admin',
  MESERO_HOME: '/mesero',
  CAJA_HOME: '/caja',
  COCINA_HOME: '/cocina',
  CLIENTE_HOME: '/cliente',
  DELIVERY_HOME: '/delivery',

  TABLES: '/mesas',
  KITCHEN_MONITOR: '/cocina/monitor',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];