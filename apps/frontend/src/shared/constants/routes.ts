export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',

  ADMIN_MENU: '/admin/menu',
  ADMIN_USERS: '/admin/users',
  ADMIN_MENU_MANAGEMENT: '/admin/menu-management',
  ADMIN_TABLE_MANAGEMENT: '/admin/table-management',
  ADMIN_KITCHEN_MONITOR: '/admin/kitchen-monitor',

  MESERO_HOME: '/mesero',
  MESERO_TABLES: '/mesero/tables',
  MESERO_ORDERS: '/mesero/orders',

  COCINA_HOME: '/cocina',
  CAJERO_HOME: '/cajero',

  CLIENTE_HOME: '/cliente',
  CLIENTE_RESERVE_TABLE: '/cliente/reservar-mesa',
  CLIENTE_RESERVATIONS: '/cliente/mis-reservas',
  CLIENTE_ORDERS: '/cliente/mis-pedidos',
} as const;
