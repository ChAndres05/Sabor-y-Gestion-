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

let cachedMenu: any[] | null = null;

async function getMenuFromAPI() {
  if (cachedMenu) return cachedMenu;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/menu`);
    if (res.ok) {
      cachedMenu = await res.json();
    }
  } catch (error) {
    console.error('Error fetching menu API:', error);
  }
  return cachedMenu || [];
}

const SIMULATED_STATUSES_KEY = 'gestionysabor_simulated_statuses';

let simulatedStatuses: Record<number, TableOrderStatus> = readStorage(SIMULATED_STATUSES_KEY, {});

function persistSimulatedStatuses() {
  writeStorage(SIMULATED_STATUSES_KEY, simulatedStatuses);
}

export function mapBackendOrderToFrontend(backendOrder: any): TableOrder {
  const customer = backendOrder.usuarios_pedidos_id_usuario_clienteTousuarios;
  const originalStatus = backendOrder.estado === 'COCINA' ? 'EN_PREPARACION' : backendOrder.estado;
  return {
    id: backendOrder.id_pedido,
    tableId: backendOrder.id_mesa || 0,
    tipoPedido: 'MESA',
    estado: simulatedStatuses[backendOrder.id_pedido] || originalStatus,
    waiterName: backendOrder.usuario_mesero ? `${backendOrder.usuario_mesero.nombre} ${backendOrder.usuario_mesero.apellido || ''}`.trim() : 'Mesero',
    customer: {
      idUsuario: customer ? customer.id_usuario : null,
      nombre: customer ? `${customer.nombre} ${customer.apellido || ''}`.trim() : 'Cliente general',
      telefono: customer?.telefono || '00000000',
      ci: customer ? String(customer.usuario_ci) : '0',
    },
    items: (backendOrder.detalles_pedido || []).map((detalle: any) => {
      const pres = detalle.presentacion_producto || {};
      const prod = pres.producto || {};
      const cat = prod.categoria || {};
      return {
        id: detalle.id_detalle_pedido,
        productoId: pres.id_presentacion_producto || 0,
        nombreProducto: prod.nombre || 'Producto',
        categoriaId: cat.id_categoria || 0,
        categoriaNombre: cat.nombre || 'Categoría',
        cantidad: detalle.cantidad,
        observacion: detalle.observaciones || '',
        ingredientes: [],
        precioUnitario: Number(detalle.precio_unitario || 0),
        tiempoPreparacion: pres.tiempo_preparacion_minutos || 0,
        subtotal: Number(detalle.subtotal || 0)
      };
    }),
    subtotal: Number(backendOrder.subtotal || 0),
    impuesto: Number(backendOrder.impuesto || 0),
    descuento: Number(backendOrder.descuento || 0),
    total: Number(backendOrder.total || 0),
    tiempoEstimadoMinutos: (backendOrder.detalles_pedido || []).reduce((acc: number, cur: any) => Math.max(acc, cur.presentacion_producto?.tiempo_preparacion_minutos || 0), 0),
    observaciones: backendOrder.observaciones || '',
    fechaCreacion: backendOrder.fecha_hora_pedido || new Date().toISOString(),
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

async function buildItemFromPayload(itemId: number, payload: AddOrderItemPayload): Promise<TableOrderItem> {
  const menu = await getMenuFromAPI();
  if (menu && menu.length > 0) {
    const selectedCategory = menu.find((cat: any) => cat.id_categoria === payload.categoriaId);
    if (!selectedCategory) throw new Error('La categoría seleccionada no existe en la base de datos');
    
    const selectedProduct = selectedCategory.productos.find((prod: any) => {
      const presentacion = prod.presentaciones?.[0] || {};
      const id = presentacion.id_presentacion_producto || prod.id_producto;
      return id === payload.productoId && prod.disponible;
    });

    if (!selectedProduct) throw new Error('El producto seleccionado no existe o no está disponible en la BD');

    if (!Number.isFinite(payload.cantidad) || payload.cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    const presentacion = selectedProduct.presentaciones?.[0] || {};
    const precioUnitario = Number(presentacion.precio || selectedProduct.precio || 0);
    const tiempoPreparacion = Number(presentacion.tiempo_preparacion_minutos || selectedProduct.tiempo_preparacion || 0);

    const ingredientesBase = (presentacion.recetas_presentaciones || []).map((receta: any) => ({
      nombre: receta.insumo.nombre,
      incluidoPorDefecto: true
    }));

    let normalizedIngredients: TableOrderItemIngredient[];
    if (!payload.ingredientes || payload.ingredientes.length === 0) {
      normalizedIngredients = ingredientesBase.map((i: any) => ({ nombre: i.nombre, incluido: i.incluidoPorDefecto }));
    } else {
      normalizedIngredients = ingredientesBase.map((i: any) => {
        const selected = payload.ingredientes!.find((item) => item.nombre.toLowerCase() === i.nombre.toLowerCase());
        return { nombre: i.nombre, incluido: selected?.incluido ?? i.incluidoPorDefecto };
      });
    }

    return {
      id: itemId,
      productoId: payload.productoId,
      nombreProducto: selectedProduct.nombre,
      categoriaId: selectedCategory.id_categoria,
      categoriaNombre: selectedCategory.nombre,
      cantidad: payload.cantidad,
      observacion: payload.observacion.trim(),
      ingredientes: normalizedIngredients,
      precioUnitario,
      tiempoPreparacion,
      subtotal: precioUnitario * payload.cantidad,
    };
  }

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
  const menu = await getMenuFromAPI();
  if (menu.length > 0) {
    return menu.map((cat: any) => ({
      id: cat.id_categoria,
      nombre: cat.nombre,
    }));
  }

  await delay();
  return [...categories];
}

export async function listOrderProductsByCategoryMock(
  categoryId: number
): Promise<OrderCatalogProduct[]> {
  const menu = await getMenuFromAPI();
  if (menu.length > 0) {
    const category = menu.find((cat: any) => cat.id_categoria === categoryId);
    if (!category) return [];

    return category.productos
      .filter((prod: any) => prod.presentaciones && prod.presentaciones.length > 0)
      .map((prod: any) => {
      const presentacion = prod.presentaciones[0];
      const ingredientes = (presentacion.recetas_presentaciones || []).map((receta: any) => ({
        id: receta.insumo.id_insumo,
        nombre: receta.insumo.nombre,
        incluidoPorDefecto: true
      }));

      return {
        id: presentacion.id_presentacion_producto,
        categoryId: category.id_categoria,
        nombre: prod.nombre,
        descripcion: prod.descripcion || '',
        precio: Number(presentacion.precio || 0),
        tiempoPreparacion: Number(presentacion.tiempo_preparacion_minutos || 0),
        disponible: prod.disponible,
        ingredientes
      };
    });
  }

  await delay();
  return products
    .filter((product) => product.categoryId === categoryId && product.disponible)
    .map(cloneProduct);
}


export async function searchOrderCustomerByCiMock(
  ci: string
): Promise<TableOrderCustomer | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/clientes/ci/${ci}`);
    if (res.ok) {
      const data = await res.json();
      return {
        idUsuario: data.id_usuario,
        nombre: `${data.nombre} ${data.apellido || ''}`.trim(),
        telefono: data.telefono || '00000000',
        ci: String(data.usuario_ci),
      };
    }
  } catch (error) {
    console.error('API fail, using mock data for customer search', error);
  }

  await delay();
  const normalizedCi = normalizeCi(ci);
  const foundCustomer = registeredCustomersMock.find(
    (customer) => customer.ci === normalizedCi
  );

  return foundCustomer ? { ...foundCustomer } : null;
}

export async function listWaiterOrdersMock(): Promise<TableOrder[]> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/activos`);
    if (res.ok) {
      const data = await res.json();
      return data.map(mapBackendOrderToFrontend).filter((o: TableOrder) => o.estado !== 'PAGADO' && o.estado !== 'CANCELADO');
    }
  } catch (error) {
    console.error('API fail, using mock data for list waiter orders', error);
  }

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
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const mapped = mapBackendOrderToFrontend(data);
        if (mapped.estado === 'PAGADO' || mapped.estado === 'CANCELADO') return null;
        return mapped;
      }
      return null;
    }
  } catch (error) {
    console.error('API fail, using mock data for open order', error);
  }

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
  if (!customer.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio');
  }

  try {
    const openOrderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
    if (openOrderRes.ok) {
      const openOrder = await openOrderRes.json();
      if (openOrder) return mapBackendOrderToFrontend(openOrder);
    }

    const body = {
      id_mesa: tableId,
      id_usuario_mesero: 20, // Hardcoded mesero o sacar del contexto
      id_usuario_cliente: customer.idUsuario || null,
      observaciones: 'Pedido creado desde flujo de mesa'
    };

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const fullRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
      if (fullRes.ok) {
        const fullOrder = await fullRes.json();
        return mapBackendOrderToFrontend(fullOrder);
      }
    }
  } catch (error) {
    console.error('API fail, using mock data for save order customer', error);
  }

  await delay();

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
  const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
  if (!orderRes.ok) {
    throw new Error('Primero guarda los datos del cliente para crear el pedido o no hay conexión');
  }
  
  const order = await orderRes.json();
  if (!order) {
    throw new Error('No hay pedido activo en esta mesa');
  }

  const itemBody = {
    id_presentacion_producto: payload.productoId,
    cantidad: payload.cantidad,
    observaciones: payload.observacion
  };
  
  const addRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${order.id_pedido}/detalles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemBody)
  });
  
  if (!addRes.ok) {
    const errData = await addRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al agregar el detalle al pedido en la base de datos');
  }

  const fullRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
  if (fullRes.ok) {
    return mapBackendOrderToFrontend(await fullRes.json());
  }
  
  throw new Error('Error recuperando el pedido actualizado');
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

  const updatedItem = await buildItemFromPayload(itemId, payload);
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
  try {
    const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
    if (orderRes.ok) {
      const order = await orderRes.json();
      if (order) {
        const delRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${order.id_pedido}/detalles/${itemId}`, {
          method: 'DELETE'
        });
        if (delRes.ok) {
          const fullRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
          if (fullRes.ok) return mapBackendOrderToFrontend(await fullRes.json());
        }
      }
    }
  } catch (error) {
    console.error('API fail, using mock data for remove order item', error);
  }

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
  try {
    const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
    if (orderRes.ok) {
      const order = await orderRes.json();
      if (order) {
        const mapped = mapBackendOrderToFrontend(order);
        if (mapped.items.length === 0 && status !== 'CANCELADO') {
          throw new Error('Agrega al menos un item antes de cambiar el estado del pedido');
        }
        
        simulatedStatuses[order.id_pedido] = status;
        persistSimulatedStatuses();
        
        return mapBackendOrderToFrontend(order);
      }
    }
  } catch (error) {
    console.error('API fail, using mock data for update status', error);
  }

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
  try {
    const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/mesa/${tableId}`);
    if (orderRes.ok) {
      const order = await orderRes.json();
      if (order) {
        const mapped = mapBackendOrderToFrontend(order);
        if (mapped.items.length === 0) {
          throw new Error('No puedes solicitar cuenta sin items en el pedido');
        }
        if (mapped.estado !== 'ENTREGADO') {
          throw new Error('Primero marca el pedido como entregado en mesa');
        }
        return mapped;
      }
    }
  } catch (error) {
    console.error('API fail, using mock data for request bill', error);
  }

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
