import type {
  AddOrderItemPayload,
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderCustomer,
  TableOrderItem,
  TableOrderItemIngredient,
  TableOrderStatus,
} from '../../modules/tables/types/table-order.types';
import { emitRestaurantStateChanged } from '../utils/events';

type UnknownRecord = Record<string, unknown>;

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS_STORAGE_KEY = 'gestionysabor_unified_orders_mock';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function orderStatusValue(value: unknown, fallback: TableOrderStatus = 'REGISTRADO'): TableOrderStatus {
  switch (value) {
    case 'REGISTRADO':
    case 'EN_PREPARACION':
    case 'LISTO':
    case 'EN_CAMINO':
    case 'ENTREGADO':
    case 'PAGADO':
    case 'CANCELADO':
      return value;
    case 'COCINA':
      return 'EN_PREPARACION';
    default:
      return fallback;
  }
}

function readStorage<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;

  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;

    const parsed = JSON.parse(value) as unknown;

    if (key === ORDERS_STORAGE_KEY) {
      return migrateUnifiedOrdersStorage(parsed) as T;
    }

    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function persistOrders() {
  writeStorage(ORDERS_STORAGE_KEY, orders);
  emitRestaurantStateChanged();
}

function mapStoredIngredient(value: unknown): TableOrderItemIngredient {
  const ingredient = asRecord(value);

  return {
    nombre: stringValue(ingredient.nombre),
    incluido: Boolean(ingredient.incluido),
  };
}

function mapStoredItem(value: unknown): TableOrderItem {
  const item = asRecord(value);

  return {
    id: numberValue(item.id),
    productoId: numberValue(item.productoId),
    nombreProducto: stringValue(item.nombreProducto, 'Producto'),
    categoriaId: numberValue(item.categoriaId),
    categoriaNombre: stringValue(item.categoriaNombre, 'General'),
    cantidad: numberValue(item.cantidad, 1),
    observacion: stringValue(item.observacion),
    ingredientes: asArray(item.ingredientes).map(mapStoredIngredient),
    precioUnitario: numberValue(item.precioUnitario),
    tiempoPreparacion: numberValue(item.tiempoPreparacion),
    subtotal: numberValue(item.subtotal),
    imagen: stringValue(item.imagen, '') || null,
  };
}

function mapStoredCustomer(value: unknown): TableOrderCustomer {
  const customer = asRecord(value);

  return {
    idUsuario:
      customer.idUsuario === null || typeof customer.idUsuario === 'undefined'
        ? null
        : numberValue(customer.idUsuario),
    nombre: stringValue(customer.nombre, 'Cliente general'),
    telefono: stringValue(customer.telefono, '00000000'),
    ci: stringValue(customer.ci, '0'),
  };
}

function migrateClientOrderToTableOrder(item: UnknownRecord): TableOrder {
  const rawItems = asArray(item.items);

  return {
    id: numberValue(item.id),
    tableId: numberValue(item.tableNumber),
    tipoPedido: 'MESA',
    estado: orderStatusValue(item.status),
    waiterName: 'Mesero',
    customer: {
      idUsuario:
        item.userId === null || typeof item.userId === 'undefined'
          ? null
          : numberValue(item.userId),
      nombre: 'Cliente registrado',
      telefono: '00000000',
      ci: '0',
    },
    items: rawItems.map((rawItem) => {
      const orderItem = asRecord(rawItem);

      return {
        id: numberValue(orderItem.id),
        productoId: 0,
        nombreProducto: stringValue(orderItem.name, 'Producto'),
        categoriaId: 0,
        categoriaNombre: 'General',
        cantidad: numberValue(orderItem.quantity, 1),
        observacion: stringValue(orderItem.notes),
        ingredientes: [],
        precioUnitario: numberValue(orderItem.unitPrice),
        tiempoPreparacion: 0,
        subtotal: numberValue(orderItem.subtotal),
        imagen: null,
      };
    }),
    subtotal: numberValue(item.subtotal),
    impuesto: 0,
    descuento: 0,
    total: numberValue(item.total),
    tiempoEstimadoMinutos: numberValue(item.estimatedMinutes),
    observaciones: stringValue(item.notes),
    fechaCreacion: stringValue(item.createdAt, new Date().toISOString()),
  };
}

function migrateTableOrderStorageItem(item: UnknownRecord): TableOrder {
  return {
    id: numberValue(item.id),
    tableId: numberValue(item.tableId),
    tableNumber:
      typeof item.tableNumber === 'undefined'
        ? undefined
        : numberValue(item.tableNumber),
    tipoPedido: 'MESA',
    estado: orderStatusValue(item.estado),
    waiterName: stringValue(item.waiterName, 'Mesero'),
    customer: mapStoredCustomer(item.customer),
    items: asArray(item.items).map(mapStoredItem),
    subtotal: numberValue(item.subtotal),
    impuesto: numberValue(item.impuesto),
    descuento: numberValue(item.descuento),
    total: numberValue(item.total),
    tiempoEstimadoMinutos: numberValue(item.tiempoEstimadoMinutos),
    observaciones: stringValue(item.observaciones),
    fechaCreacion: stringValue(item.fechaCreacion, new Date().toISOString()),
    fechaEntrega: stringValue(item.fechaEntrega, '') || undefined,
  };
}

function migrateUnifiedOrdersStorage(data: unknown): TableOrder[] {
  if (!Array.isArray(data)) return [];

  return data.map((rawItem) => {
    const item = asRecord(rawItem);
    const rawItems = asArray(item.items);
    const firstItem = rawItems.length > 0 ? asRecord(rawItems[0]) : {};
    const isClientOrder = Boolean(
      item.status &&
        item.orderNumber &&
        (rawItems.length === 0 || typeof firstItem.name === 'string')
    );

    return isClientOrder
      ? migrateClientOrderToTableOrder(item)
      : migrateTableOrderStorageItem(item);
  });
}

export function mapBackendOrderToFrontend(backendOrderValue: unknown): TableOrder {
  const backendOrder = asRecord(backendOrderValue);
  const customer = asRecord(backendOrder.usuarios_pedidos_id_usuario_clienteTousuarios);
  const waiter = asRecord(backendOrder.usuario_mesero);
  const details = asArray(backendOrder.detalles_pedido);

  const items: TableOrderItem[] = details.map((rawDetail) => {
    const detail = asRecord(rawDetail);
    const presentation = asRecord(detail.presentacion_producto);
    const product = asRecord(presentation.producto);
    const category = asRecord(product.categoria);

    return {
      id: numberValue(detail.id_detalle_pedido),
      productoId: numberValue(presentation.id_presentacion_producto),
      nombreProducto: stringValue(product.nombre, 'Producto'),
      categoriaId: numberValue(category.id_categoria),
      categoriaNombre: stringValue(category.nombre, 'Categoría'),
      cantidad: numberValue(detail.cantidad, 1),
      observacion: stringValue(detail.observaciones),
      ingredientes: [],
      precioUnitario: numberValue(detail.precio_unitario),
      tiempoPreparacion: numberValue(presentation.tiempo_preparacion_minutos),
      subtotal: numberValue(detail.subtotal),
      imagen: stringValue(product.imagen_url, '') || null,
    };
  });

  const maxTime = details.reduce<number>((max, rawDetail) => {
    const detail = asRecord(rawDetail);
    const presentation = asRecord(detail.presentacion_producto);
    const cantidad = numberValue(detail.cantidad, 1);
    const prepTime = numberValue(presentation.tiempo_preparacion_minutos);
    const itemTime = prepTime + (cantidad > 2 ? 5 : 0);
    return itemTime > max ? itemTime : max;
  }, 0);
  const tiempoEstimadoMinutos = maxTime + (details.length > 2 ? 5 : 0);

  return {
    id: numberValue(backendOrder.id_pedido),
    tableId: numberValue(backendOrder.id_mesa),
    tipoPedido: 'MESA',
    estado: orderStatusValue(backendOrder.estado),
    waiterName: waiter.nombre
      ? `${stringValue(waiter.nombre)} ${stringValue(waiter.apellido)}`.trim()
      : 'Mesero',
    customer: {
      idUsuario: customer.id_usuario ? numberValue(customer.id_usuario) : null,
      nombre: customer.nombre
        ? `${stringValue(customer.nombre)} ${stringValue(customer.apellido)}`.trim()
        : 'Cliente general',
      telefono: stringValue(customer.telefono, '00000000'),
      ci: customer.usuario_ci ? String(customer.usuario_ci) : '0',
    },
    items,
    subtotal: numberValue(backendOrder.subtotal),
    impuesto: numberValue(backendOrder.impuesto),
    descuento: numberValue(backendOrder.descuento),
    total: numberValue(backendOrder.total),
    tiempoEstimadoMinutos,
    observaciones: stringValue(backendOrder.observaciones),
    fechaCreacion: stringValue(backendOrder.fecha_hora_pedido, new Date().toISOString()),
  };
}

const categories: OrderCatalogCategory[] = [
  { id: 1, nombre: 'Entradas' },
  { id: 2, nombre: 'Platos principales' },
  { id: 3, nombre: 'Bebidas' },
  { id: 4, nombre: 'Postres' },
];

const products: OrderCatalogProduct[] = [
  {
    id: 1,
    categoryId: 1,
    nombre: 'Ensalada fresca',
    descripcion: 'Lechuga, tomate, pepino, queso y aderezo de la casa',
    precio: 25,
    tiempoPreparacion: 10,
    disponible: true,
    ingredientes: [
      { id: 1, nombre: 'Lechuga', incluidoPorDefecto: true },
      { id: 2, nombre: 'Tomate', incluidoPorDefecto: true },
      { id: 3, nombre: 'Pepino', incluidoPorDefecto: true },
      { id: 4, nombre: 'Cebolla', incluidoPorDefecto: false },
      { id: 5, nombre: 'Aceitunas', incluidoPorDefecto: false },
      { id: 6, nombre: 'Queso', incluidoPorDefecto: true },
      { id: 7, nombre: 'Aderezo', incluidoPorDefecto: true },
    ],
  },
  {
    id: 2,
    categoryId: 1,
    nombre: 'Bruschettas',
    descripcion: 'Pan tostado con tomate, queso y aceite de oliva',
    precio: 30,
    tiempoPreparacion: 12,
    disponible: true,
    ingredientes: [
      { id: 8, nombre: 'Tomate', incluidoPorDefecto: true },
      { id: 9, nombre: 'Queso', incluidoPorDefecto: true },
      { id: 10, nombre: 'Ajo', incluidoPorDefecto: true },
      { id: 11, nombre: 'Orégano', incluidoPorDefecto: true },
      { id: 12, nombre: 'Aceite de oliva', incluidoPorDefecto: true },
    ],
  },
  {
    id: 3,
    categoryId: 2,
    nombre: 'Pique macho',
    descripcion: 'Carne, salchicha, huevo, papas y salsa picante',
    precio: 80,
    tiempoPreparacion: 30,
    disponible: true,
    ingredientes: [
      { id: 13, nombre: 'Carne', incluidoPorDefecto: true },
      { id: 14, nombre: 'Salchicha', incluidoPorDefecto: true },
      { id: 15, nombre: 'Huevo', incluidoPorDefecto: true },
      { id: 16, nombre: 'Papas', incluidoPorDefecto: true },
      { id: 17, nombre: 'Locoto', incluidoPorDefecto: true },
      { id: 18, nombre: 'Mayonesa', incluidoPorDefecto: true },
      { id: 19, nombre: 'Kétchup', incluidoPorDefecto: true },
    ],
  },
  {
    id: 4,
    categoryId: 2,
    nombre: 'Parrilla de res',
    descripcion: 'Corte de res con arroz, papas y ensalada',
    precio: 95,
    tiempoPreparacion: 35,
    disponible: true,
    ingredientes: [
      { id: 20, nombre: 'Carne de res', incluidoPorDefecto: true },
      { id: 21, nombre: 'Arroz', incluidoPorDefecto: true },
      { id: 22, nombre: 'Papas', incluidoPorDefecto: true },
      { id: 23, nombre: 'Ensalada', incluidoPorDefecto: true },
      { id: 24, nombre: 'Llajua', incluidoPorDefecto: true },
    ],
  },
  {
    id: 5,
    categoryId: 3,
    nombre: 'Coca Cola',
    descripcion: 'Bebida gaseosa personal',
    precio: 15,
    tiempoPreparacion: 2,
    disponible: true,
    ingredientes: [
      { id: 25, nombre: 'Hielo', incluidoPorDefecto: true },
      { id: 26, nombre: 'Limón', incluidoPorDefecto: false },
      { id: 27, nombre: 'Vaso', incluidoPorDefecto: true },
    ],
  },
  {
    id: 6,
    categoryId: 3,
    nombre: 'Jugo natural',
    descripcion: 'Jugo de fruta de temporada',
    precio: 18,
    tiempoPreparacion: 5,
    disponible: true,
    ingredientes: [
      { id: 28, nombre: 'Azúcar', incluidoPorDefecto: true },
      { id: 29, nombre: 'Hielo', incluidoPorDefecto: true },
      { id: 30, nombre: 'Agua', incluidoPorDefecto: true },
    ],
  },
  {
    id: 7,
    categoryId: 4,
    nombre: 'Flan',
    descripcion: 'Postre casero con caramelo',
    precio: 20,
    tiempoPreparacion: 8,
    disponible: true,
    ingredientes: [
      { id: 31, nombre: 'Caramelo', incluidoPorDefecto: true },
      { id: 32, nombre: 'Crema', incluidoPorDefecto: false },
      { id: 33, nombre: 'Frutilla', incluidoPorDefecto: false },
    ],
  },
  {
    id: 8,
    categoryId: 4,
    nombre: 'Brownie',
    descripcion: 'Brownie de chocolate con opción a helado',
    precio: 22,
    tiempoPreparacion: 8,
    disponible: true,
    ingredientes: [
      { id: 34, nombre: 'Chocolate', incluidoPorDefecto: true },
      { id: 35, nombre: 'Nueces', incluidoPorDefecto: true },
      { id: 36, nombre: 'Helado', incluidoPorDefecto: false },
      { id: 37, nombre: 'Crema', incluidoPorDefecto: false },
    ],
  },
];

const registeredCustomersMock: TableOrderCustomer[] = [
  {
    idUsuario: 21,
    nombre: 'Ana Vargas',
    telefono: '76543210',
    ci: '5678123',
  },
  {
    idUsuario: 22,
    nombre: 'Roberto García',
    telefono: '70011223',
    ci: '234531',
  },
  {
    idUsuario: 23,
    nombre: 'Luis Paredes',
    telefono: '71239876',
    ci: '8989898',
  },
];

function normalizeCi(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function cloneProduct(product: OrderCatalogProduct): OrderCatalogProduct {
  return {
    ...product,
    ingredientes: product.ingredientes.map((ingredient) => ({ ...ingredient })),
  };
}

function normalizeIngredients(
  product: OrderCatalogProduct,
  selectedIngredients?: TableOrderItemIngredient[]
): TableOrderItemIngredient[] {
  if (!selectedIngredients || selectedIngredients.length === 0) {
    return product.ingredientes.map((ingredient) => ({
      nombre: ingredient.nombre,
      incluido: ingredient.incluidoPorDefecto,
    }));
  }

  return product.ingredientes.map((ingredient) => {
    const selected = selectedIngredients.find(
      (item) => item.nombre.toLowerCase() === ingredient.nombre.toLowerCase()
    );

    return {
      nombre: ingredient.nombre,
      incluido: selected?.incluido ?? ingredient.incluidoPorDefecto,
    };
  });
}

export function createItem(
  id: number,
  productoId: number,
  cantidad: number,
  observacion = '',
  ingredientes?: TableOrderItemIngredient[]
): TableOrderItem {
  const product = products.find((item) => item.id === productoId);
  const category = categories.find((item) => item.id === product?.categoryId);

  if (!product || !category) {
    throw new Error('Producto mock no encontrado');
  }

  return {
    id,
    productoId: product.id,
    nombreProducto: product.nombre,
    categoriaId: category.id,
    categoriaNombre: category.nombre,
    cantidad,
    observacion,
    ingredientes: normalizeIngredients(product, ingredientes),
    precioUnitario: product.precio,
    tiempoPreparacion: product.tiempoPreparacion,
    subtotal: product.precio * cantidad,
    imagen: product.imagen ?? null,
  };
}

function calculateSubtotal(items: TableOrderItem[]) {
  return items.reduce((acc, item) => acc + item.subtotal, 0);
}

function calculateEstimatedTime(items: TableOrderItem[]) {
  if (items.length === 0) return 0;
  const maxTime = items.reduce((max, item) => {
    const itemTime = item.tiempoPreparacion + (item.cantidad > 2 ? 5 : 0);
    return itemTime > max ? itemTime : max;
  }, 0);
  return maxTime + (items.length > 2 ? 5 : 0);
}

function recalculateOrder(order: TableOrder): TableOrder {
  const subtotal = calculateSubtotal(order.items);
  const impuesto = 0;
  const descuento = 0;

  return {
    ...order,
    subtotal,
    impuesto,
    descuento,
    total: subtotal + impuesto - descuento,
    tiempoEstimadoMinutos: calculateEstimatedTime(order.items),
  };
}

let orders: TableOrder[] = [];

function syncOrdersFromStorage() {
  orders = readStorage(ORDERS_STORAGE_KEY, orders);
}

syncOrdersFromStorage();

function createLocalOrderId() {
  const minOrderId = orders.reduce((lowest, order) => Math.min(lowest, order.id), 0);
  return minOrderId <= 0 ? minOrderId - 1 : -1;
}

function findOrderIndexByTable(tableId: number, preferredOrderId?: number) {
  if (typeof preferredOrderId === 'number') {
    const preferredIndex = orders.findIndex(
      (order) =>
        order.id === preferredOrderId &&
        order.tableId === tableId &&
        order.estado !== 'PAGADO' &&
        order.estado !== 'CANCELADO'
    );

    if (preferredIndex !== -1) return preferredIndex;
  }

  const regIndex = orders.findIndex(
    (order) => order.tableId === tableId && order.estado === 'REGISTRADO'
  );

  if (regIndex !== -1) return regIndex;

  return orders.findIndex(
    (order) =>
      order.tableId === tableId &&
      order.estado !== 'PAGADO' &&
      order.estado !== 'CANCELADO'
  );
}

function cloneOrder(order: TableOrder): TableOrder {
  return {
    ...order,
    customer: { ...order.customer },
    items: order.items.map((item) => ({
      ...item,
      ingredientes: item.ingredientes.map((ingredient) => ({ ...ingredient })),
    })),
  };
}

function ensureEditable(order: TableOrder) {
  if (order.estado !== 'REGISTRADO') {
    throw new Error('Solo se pueden editar pedidos en estado REGISTRADO');
  }
}

function buildSnapshotProduct(payload: AddOrderItemPayload): OrderCatalogProduct {
  return {
    id: payload.productoId,
    categoryId: payload.categoriaId,
    nombre: payload.productoNombre?.trim() || `Producto ${payload.productoId}`,
    descripcion: '',
    precio: Number(payload.precioUnitario ?? 0),
    tiempoPreparacion: Number(payload.tiempoPreparacion ?? 0),
    disponible: true,
    ingredientes: payload.ingredientes.map((ingredient, index) => ({
      id: index + 1,
      nombre: ingredient.nombre,
      incluidoPorDefecto: ingredient.incluido,
    })),
    imagen: payload.imagen ?? null,
  };
}

async function buildItemFromPayload(
  itemId: number,
  payload: AddOrderItemPayload
): Promise<TableOrderItem> {
  if (!Number.isFinite(payload.cantidad) || payload.cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  const selectedCategory =
    categories.find((category) => category.id === payload.categoriaId) ??
    {
      id: payload.categoriaId,
      nombre: payload.categoriaNombre?.trim() || 'Categoría',
    };

  const selectedProduct =
    products.find(
      (product) =>
        product.id === payload.productoId &&
        product.categoryId === payload.categoriaId &&
        product.disponible
    ) ?? buildSnapshotProduct(payload);

  return {
    id: itemId,
    productoId: selectedProduct.id,
    nombreProducto: selectedProduct.nombre,
    categoriaId: selectedCategory.id,
    categoriaNombre: selectedCategory.nombre,
    cantidad: payload.cantidad,
    observacion: payload.observacion.trim(),
    ingredientes: normalizeIngredients(selectedProduct, payload.ingredientes),
    precioUnitario: selectedProduct.precio,
    tiempoPreparacion: selectedProduct.tiempoPreparacion,
    subtotal: selectedProduct.precio * payload.cantidad,
    imagen: selectedProduct.imagen ?? null,
  };
}

export async function listOrderCategoriesMock(): Promise<OrderCatalogCategory[]> {
  await delay();
  return [...categories];
}

export async function listOrderProductsByCategoryMock(
  categoryId: number
): Promise<OrderCatalogProduct[]> {
  await delay();
  return products.filter((product) => product.categoryId === categoryId && product.disponible).map(cloneProduct);
}

export async function searchOrderCustomerByCiMock(ci: string): Promise<TableOrderCustomer | null> {
  await delay();

  const normalizedCi = normalizeCi(ci);
  const found = registeredCustomersMock.find((customer) => customer.ci === normalizedCi);

  return found ? { ...found } : null;
}

export async function listWaiterOrdersMock(): Promise<TableOrder[]> {
  syncOrdersFromStorage();
  await delay();

  return orders
    .filter((order) => order.estado !== 'PAGADO' && order.estado !== 'CANCELADO')
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .map(cloneOrder);
}

export async function getOpenOrdersByTableMock(tableId: number): Promise<TableOrder[]> {
  syncOrdersFromStorage();
  await delay();

  return orders
    .filter((order) => order.tableId === tableId && order.estado !== 'PAGADO' && order.estado !== 'CANCELADO')
    .map(cloneOrder);
}

export async function getOpenOrderByTableMock(tableId: number): Promise<TableOrder | null> {
  syncOrdersFromStorage();

  const all = await getOpenOrdersByTableMock(tableId);

  if (all.length === 0) return null;

  return all.find((order) => order.estado === 'REGISTRADO') || all[0];
}

export async function saveOrderCustomerMock(
  tableId: number,
  customer: TableOrderCustomer,
  waiterUserId?: number
): Promise<TableOrder> {
  syncOrdersFromStorage();

  if (!customer.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio');
  }

  await delay();

  const normalizedCi = normalizeCi(customer.ci) || '0';
  const registered =
    normalizedCi === '0'
      ? null
      : registeredCustomersMock.find((registeredCustomer) => registeredCustomer.ci === normalizedCi) || null;

  const normalizedCustomer: TableOrderCustomer = {
    idUsuario: customer.idUsuario ?? registered?.idUsuario ?? null,
    nombre: customer.nombre.trim(),
    telefono: customer.telefono.trim() || registered?.telefono || '00000000',
    ci: normalizedCi,
  };

  const index = findOrderIndexByTable(tableId);

  if (index === -1) {
    const newOrder = recalculateOrder({
      id: createLocalOrderId(),
      tableId,
      tipoPedido: 'MESA',
      estado: 'REGISTRADO',
      waiterName: waiterUserId ? `Mesero ${waiterUserId}` : 'Mesero asignado',
      customer: normalizedCustomer,
      items: [],
      subtotal: 0,
      impuesto: 0,
      descuento: 0,
      total: 0,
      tiempoEstimadoMinutos: 0,
      observaciones: 'Pedido creado desde flujo de mesa.',
      fechaCreacion: new Date().toISOString(),
    });

    orders = [...orders, newOrder];
    persistOrders();

    return cloneOrder(newOrder);
  }

  const current = orders[index];

  if (current.estado === 'PAGADO' || current.estado === 'CANCELADO') {
    throw new Error('No puedes editar un pedido finalizado');
  }

  const updated: TableOrder = { ...current, customer: normalizedCustomer };

  orders = orders.map((order, currentIndex) => (currentIndex === index ? updated : order));
  persistOrders();

  return cloneOrder(updated);
}

export async function createExtraOrderMock(
  tableId: number,
  customer: TableOrderCustomer,
  waiterUserId?: number
): Promise<TableOrder> {
  syncOrdersFromStorage();
  await delay();

  const normalizedCi = normalizeCi(customer.ci) || '0';
  const registered =
    normalizedCi === '0'
      ? null
      : registeredCustomersMock.find((registeredCustomer) => registeredCustomer.ci === normalizedCi) || null;

  const normalizedCustomer: TableOrderCustomer = {
    idUsuario: customer.idUsuario ?? registered?.idUsuario ?? null,
    nombre: customer.nombre.trim(),
    telefono: customer.telefono.trim() || registered?.telefono || '00000000',
    ci: normalizedCi,
  };

  const newOrder = recalculateOrder({
    id: createLocalOrderId(),
    tableId,
    tipoPedido: 'MESA',
    estado: 'REGISTRADO',
    waiterName: waiterUserId ? `Mesero ${waiterUserId}` : 'Mesero asignado',
    customer: normalizedCustomer,
    items: [],
    subtotal: 0,
    impuesto: 0,
    descuento: 0,
    total: 0,
    tiempoEstimadoMinutos: 0,
    observaciones: 'Pedido adicional creado.',
    fechaCreacion: new Date().toISOString(),
  });

  orders = [...orders, newOrder];
  persistOrders();

  return cloneOrder(newOrder);
}

export async function addOrderItemToTableMock(
  tableId: number,
  payload: AddOrderItemPayload,
  orderId?: number
): Promise<TableOrder> {
  syncOrdersFromStorage();
  await delay();

  const index = findOrderIndexByTable(tableId, orderId);

  if (index === -1) {
    throw new Error('No hay un pedido activo para esta mesa. Guarde los datos del cliente primero.');
  }

  const order = orders[index];
  ensureEditable(order);

  const nextItemId =
    order.items.length > 0 ? Math.max(...order.items.map((item) => item.id)) + 1 : 1;

  const newItem = await buildItemFromPayload(nextItemId, payload);
  const updatedOrder = recalculateOrder({ ...order, items: [...order.items, newItem] });

  orders = orders.map((currentOrder, currentIndex) =>
    currentIndex === index ? updatedOrder : currentOrder
  );

  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function updateOrderItemInTableMock(
  tableId: number,
  itemId: number,
  payload: AddOrderItemPayload,
  orderId?: number
): Promise<TableOrder> {
  syncOrdersFromStorage();
  await delay();

  const index = findOrderIndexByTable(tableId, orderId);

  if (index === -1) {
    throw new Error('No hay un pedido activo');
  }

  const order = orders[index];
  ensureEditable(order);

  const itemIndex = order.items.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    throw new Error('Item no encontrado');
  }

  const updatedItem = await buildItemFromPayload(itemId, payload);
  const updatedItems = [...order.items];

  updatedItems[itemIndex] = updatedItem;

  const updatedOrder = recalculateOrder({ ...order, items: updatedItems });

  orders = orders.map((currentOrder, currentIndex) =>
    currentIndex === index ? updatedOrder : currentOrder
  );

  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function removeOrderItemFromTableMock(
  tableId: number,
  itemId: number,
  orderId?: number
): Promise<void> {
  syncOrdersFromStorage();
  await delay();

  const index = findOrderIndexByTable(tableId, orderId);

  if (index === -1) return;

  const order = orders[index];
  ensureEditable(order);

  const updatedOrder = recalculateOrder({
    ...order,
    items: order.items.filter((item) => item.id !== itemId),
  });

  orders = orders.map((currentOrder, currentIndex) =>
    currentIndex === index ? updatedOrder : currentOrder
  );

  persistOrders();
}

export async function updateOrderStatusForTableMock(
  tableId: number,
  status: TableOrderStatus,
  orderId?: number
): Promise<void> {
  syncOrdersFromStorage();
  await delay();

  const index = findOrderIndexByTable(tableId, orderId);

  if (index === -1) return;

  orders = orders.map((currentOrder, currentIndex) =>
    currentIndex === index ? { ...currentOrder, estado: status } : currentOrder
  );

  persistOrders();
}

export async function requestBillForTableMock(tableId: number): Promise<void> {
  syncOrdersFromStorage();
  await delay();

  orders = orders.map((order) =>
    order.tableId === tableId &&
    order.estado !== 'PAGADO' &&
    order.estado !== 'CANCELADO'
      ? { ...order, estado: 'ENTREGADO' }
      : order
  );

  persistOrders();
}