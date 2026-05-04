import type {
  AddOrderItemPayload,
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderCustomer,
  TableOrderItem,
  TableOrderItemIngredient,
  TableOrderStatus,
  UpdateOrderItemPayload,
} from '../../modules/tables/types/table-order.types';

let nextOrderId = 5;
let nextOrderItemId = 9;

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS_STORAGE_KEY = 'gestionysabor_waiter_mock_orders';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
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

function createItem(
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
  };
}

function calculateSubtotal(items: TableOrderItem[]) {
  return items.reduce((acc, item) => acc + item.subtotal, 0);
}

function calculateEstimatedTime(items: TableOrderItem[]) {
  return items.length === 0
    ? 0
    : Math.max(...items.map((item) => item.tiempoPreparacion));
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

let orders: TableOrder[] = [
  recalculateOrder({
    id: 1,
    tableId: 2,
    tipoPedido: 'MESA',
    estado: 'REGISTRADO',
    waiterName: 'María López',
    customer: {
      idUsuario: 22,
      nombre: 'Roberto García',
      telefono: '70011223',
      ci: '234531',
    },
    items: [
      createItem(1, 3, 2, 'Sin locoto', [
        { nombre: 'Carne', incluido: true },
        { nombre: 'Salchicha', incluido: true },
        { nombre: 'Huevo', incluido: true },
        { nombre: 'Papas', incluido: true },
        { nombre: 'Locoto', incluido: false },
        { nombre: 'Mayonesa', incluido: true },
        { nombre: 'Kétchup', incluido: true },
      ]),
      createItem(2, 5, 2, 'Sin hielo', [
        { nombre: 'Hielo', incluido: false },
        { nombre: 'Limón', incluido: false },
        { nombre: 'Vaso', incluido: true },
      ]),
    ],
    subtotal: 0,
    impuesto: 0,
    descuento: 0,
    total: 0,
    tiempoEstimadoMinutos: 0,
    observaciones: 'Cliente en mesa, pedido tomado por mesero.',
    fechaCreacion: new Date().toISOString(),
  }),
  recalculateOrder({
    id: 2,
    tableId: 6,
    tipoPedido: 'MESA',
    estado: 'EN_PREPARACION',
    waiterName: 'María López',
    customer: {
      nombre: 'Familia Flores',
      telefono: '71234567',
      ci: '0',
    },
    items: [createItem(3, 4, 1, 'Término medio'), createItem(4, 6, 3)],
    subtotal: 0,
    impuesto: 0,
    descuento: 0,
    total: 0,
    tiempoEstimadoMinutos: 0,
    observaciones: 'Pedido enviado a cocina.',
    fechaCreacion: new Date().toISOString(),
  }),
  recalculateOrder({
    id: 3,
    tableId: 10,
    tipoPedido: 'MESA',
    estado: 'LISTO',
    waiterName: 'Carlos Méndez',
    customer: {
      nombre: 'Mesa sin registro',
      telefono: '00000000',
      ci: '0',
    },
    items: [
      createItem(5, 1, 2, 'Sin cebolla', [
        { nombre: 'Lechuga', incluido: true },
        { nombre: 'Tomate', incluido: true },
        { nombre: 'Pepino', incluido: true },
        { nombre: 'Cebolla', incluido: false },
        { nombre: 'Aceitunas', incluido: false },
        { nombre: 'Queso', incluido: true },
        { nombre: 'Aderezo', incluido: true },
      ]),
      createItem(6, 8, 2),
    ],
    subtotal: 0,
    impuesto: 0,
    descuento: 0,
    total: 0,
    tiempoEstimadoMinutos: 0,
    observaciones: 'Listo para entregar en mesa.',
    fechaCreacion: new Date().toISOString(),
  }),
  recalculateOrder({
    id: 4,
    tableId: 4,
    tipoPedido: 'MESA',
    estado: 'ENTREGADO',
    waiterName: 'Carlos Méndez',
    customer: {
      idUsuario: 21,
      nombre: 'Ana Vargas',
      telefono: '76543210',
      ci: '5678123',
    },
    items: [createItem(7, 3, 1), createItem(8, 7, 1)],
    subtotal: 0,
    impuesto: 0,
    descuento: 0,
    total: 0,
    tiempoEstimadoMinutos: 0,
    observaciones: 'Pedido entregado, listo para solicitar cuenta.',
    fechaCreacion: new Date().toISOString(),
    fechaEntrega: new Date().toISOString(),
  }),
];


orders = readStorage(ORDERS_STORAGE_KEY, orders);
nextOrderId = Math.max(nextOrderId, ...orders.map((order) => order.id + 1));
nextOrderItemId = Math.max(
  nextOrderItemId,
  ...orders.flatMap((order) => order.items.map((item) => item.id + 1)),
  nextOrderItemId
);

function findOrderIndexByTable(tableId: number) {
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
  if (order.estado === 'PAGADO' || order.estado === 'CANCELADO') {
    throw new Error('No puedes editar un pedido pagado o cancelado');
  }

  if (
    order.estado === 'LISTO' ||
    order.estado === 'EN_CAMINO' ||
    order.estado === 'ENTREGADO'
  ) {
    throw new Error('No puedes editar items cuando el pedido ya está listo o entregado');
  }
}

function buildItemFromPayload(itemId: number, payload: AddOrderItemPayload): TableOrderItem {
  const selectedCategory = categories.find(
    (category) => category.id === payload.categoriaId
  );

  if (!selectedCategory) {
    throw new Error('La categoría seleccionada no existe');
  }

  const selectedProduct = products.find(
    (product) =>
      product.id === payload.productoId &&
      product.categoryId === payload.categoriaId &&
      product.disponible
  );

  if (!selectedProduct) {
    throw new Error('El producto seleccionado no existe o no está disponible');
  }

  if (!Number.isFinite(payload.cantidad) || payload.cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

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

  return products
    .filter((product) => product.categoryId === categoryId && product.disponible)
    .map(cloneProduct);
}


export async function searchOrderCustomerByCiMock(
  ci: string
): Promise<TableOrderCustomer | null> {
  await delay();

  const normalizedCi = normalizeCi(ci);
  const foundCustomer = registeredCustomersMock.find(
    (customer) => customer.ci === normalizedCi
  );

  return foundCustomer ? { ...foundCustomer } : null;
}

export async function listWaiterOrdersMock(): Promise<TableOrder[]> {
  await delay();

  return orders
    .filter((order) => order.estado !== 'PAGADO' && order.estado !== 'CANCELADO')
    .sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
    )
    .map(cloneOrder);
}

export async function getOpenOrderByTableMock(
  tableId: number
): Promise<TableOrder | null> {
  await delay();

  const order = orders.find(
    (item) =>
      item.tableId === tableId &&
      item.estado !== 'PAGADO' &&
      item.estado !== 'CANCELADO'
  );

  return order ? cloneOrder(order) : null;
}

export async function saveOrderCustomerMock(
  tableId: number,
  customer: TableOrderCustomer
): Promise<TableOrder> {
  await delay();

  if (!customer.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio');
  }

  const index = findOrderIndexByTable(tableId);
  const normalizedCi = normalizeCi(customer.ci) || '0';
  const registeredCustomer =
    normalizedCi === '0'
      ? null
      : registeredCustomersMock.find((item) => item.ci === normalizedCi) ?? null;
  const normalizedCustomer: TableOrderCustomer = {
    idUsuario: customer.idUsuario ?? registeredCustomer?.idUsuario ?? null,
    nombre: customer.nombre.trim(),
    telefono: customer.telefono.trim() || registeredCustomer?.telefono || '00000000',
    ci: normalizedCi,
  };

  if (index === -1) {
    const newOrder: TableOrder = recalculateOrder({
      id: nextOrderId++,
      tableId,
      tipoPedido: 'MESA',
      estado: 'REGISTRADO',
      waiterName: 'Mesero asignado',
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

  const currentOrder = orders[index];

  if (currentOrder.estado === 'PAGADO' || currentOrder.estado === 'CANCELADO') {
    throw new Error('No puedes editar un pedido pagado o cancelado');
  }

  const updatedOrder: TableOrder = {
    ...currentOrder,
    customer: normalizedCustomer,
  };

  orders = orders.map((order, orderIndex) =>
    orderIndex === index ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function addOrderItemToTableMock(
  tableId: number,
  payload: AddOrderItemPayload
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('Primero guarda los datos del cliente para crear el pedido');
  }

  const currentOrder = orders[orderIndex];
  ensureEditable(currentOrder);

  const newItem = buildItemFromPayload(nextOrderItemId++, payload);

  const updatedOrder = recalculateOrder({
    ...currentOrder,
    items: [...currentOrder.items, newItem],
  });

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function updateOrderItemInTableMock(
  tableId: number,
  itemId: number,
  payload: UpdateOrderItemPayload
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('Pedido no encontrado');
  }

  const currentOrder = orders[orderIndex];
  ensureEditable(currentOrder);

  const foundItem = currentOrder.items.find((item) => item.id === itemId);

  if (!foundItem) {
    throw new Error('Item no encontrado');
  }

  const updatedItem = buildItemFromPayload(itemId, payload);
  const updatedOrder = recalculateOrder({
    ...currentOrder,
    items: currentOrder.items.map((item) =>
      item.id === itemId ? updatedItem : item
    ),
  });

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function updateOrderItemQuantityMock(
  tableId: number,
  itemId: number,
  quantity: number
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('Pedido no encontrado');
  }

  if (quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  const currentOrder = orders[orderIndex];
  ensureEditable(currentOrder);

  const foundItem = currentOrder.items.find((item) => item.id === itemId);

  if (!foundItem) {
    throw new Error('Item no encontrado');
  }

  const updatedItems = currentOrder.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          cantidad: quantity,
          subtotal: item.precioUnitario * quantity,
        }
      : item
  );

  const updatedOrder = recalculateOrder({
    ...currentOrder,
    items: updatedItems,
  });

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function removeOrderItemFromTableMock(
  tableId: number,
  itemId: number
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('Pedido no encontrado');
  }

  const currentOrder = orders[orderIndex];
  ensureEditable(currentOrder);

  const updatedItems = currentOrder.items.filter((item) => item.id !== itemId);

  if (updatedItems.length === currentOrder.items.length) {
    throw new Error('Item no encontrado');
  }

  const updatedOrder = recalculateOrder({
    ...currentOrder,
    items: updatedItems,
  });

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function updateOrderStatusForTableMock(
  tableId: number,
  status: TableOrderStatus
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('No existe un pedido abierto para esta mesa');
  }

  const currentOrder = orders[orderIndex];

  if (currentOrder.estado === 'PAGADO' || currentOrder.estado === 'CANCELADO') {
    throw new Error('No puedes cambiar un pedido pagado o cancelado');
  }

  if (currentOrder.items.length === 0 && status !== 'CANCELADO') {
    throw new Error('Agrega al menos un item antes de cambiar el estado del pedido');
  }

  const updatedOrder: TableOrder = {
    ...currentOrder,
    estado: status,
    fechaEntrega:
      status === 'ENTREGADO' ? new Date().toISOString() : currentOrder.fechaEntrega,
  };

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );
  persistOrders();

  return cloneOrder(updatedOrder);
}

export async function requestBillForTableMock(
  tableId: number
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('No existe un pedido abierto para esta mesa');
  }

  const currentOrder = orders[orderIndex];

  if (currentOrder.items.length === 0) {
    throw new Error('No puedes solicitar cuenta sin items en el pedido');
  }

  if (currentOrder.estado !== 'ENTREGADO') {
    throw new Error('Primero marca el pedido como entregado en mesa');
  }

  return cloneOrder(currentOrder);
}
