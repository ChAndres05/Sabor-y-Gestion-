import type {
  AddOrderItemPayload,
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderCustomer,
  TableOrderItem,
} from '../../modules/tables/types/table-order.types';

let nextOrderId = 2;
let nextOrderItemId = 3;

const delay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
    descripcion: 'Lechuga, tomate y cebolla',
    precio: 25,
    tiempoPreparacion: 10,
    disponible: true,
  },
  {
    id: 2,
    categoryId: 1,
    nombre: 'Bruschettas',
    descripcion: 'Pan tostado con tomate y queso',
    precio: 30,
    tiempoPreparacion: 12,
    disponible: true,
  },
  {
    id: 3,
    categoryId: 2,
    nombre: 'Pique macho',
    descripcion: 'Carne, salchicha, huevo y papas',
    precio: 80,
    tiempoPreparacion: 30,
    disponible: true,
  },
  {
    id: 4,
    categoryId: 2,
    nombre: 'Parrilla de res',
    descripcion: 'Corte de res con guarnición',
    precio: 95,
    tiempoPreparacion: 35,
    disponible: true,
  },
  {
    id: 5,
    categoryId: 3,
    nombre: 'Coca Cola',
    descripcion: 'Bebida gaseosa',
    precio: 15,
    tiempoPreparacion: 2,
    disponible: true,
  },
  {
    id: 6,
    categoryId: 3,
    nombre: 'Jugo natural',
    descripcion: 'Jugo de fruta de temporada',
    precio: 18,
    tiempoPreparacion: 5,
    disponible: true,
  },
  {
    id: 7,
    categoryId: 4,
    nombre: 'Flan',
    descripcion: 'Postre casero',
    precio: 20,
    tiempoPreparacion: 8,
    disponible: true,
  },
  {
    id: 8,
    categoryId: 4,
    nombre: 'Brownie',
    descripcion: 'Brownie de chocolate',
    precio: 22,
    tiempoPreparacion: 8,
    disponible: true,
  },
];

let orders: TableOrder[] = [
  {
    id: 1,
    tableId: 2,
    estado: 'ABIERTO',
    customer: {
      nombre: 'Roberto García',
      telefono: '70011223',
      ci: '234531',
    },
    items: [
      {
        id: 1,
        productoId: 3,
        nombreProducto: 'Pique macho',
        categoriaId: 2,
        categoriaNombre: 'Platos principales',
        cantidad: 2,
        observacion: 'Sin locoto',
        precioUnitario: 80,
        tiempoPreparacion: 30,
        subtotal: 160,
      },
      {
        id: 2,
        productoId: 5,
        nombreProducto: 'Coca Cola',
        categoriaId: 3,
        categoriaNombre: 'Bebidas',
        cantidad: 2,
        observacion: '',
        precioUnitario: 15,
        tiempoPreparacion: 2,
        subtotal: 30,
      },
    ],
    total: 190,
    fechaCreacion: new Date().toISOString(),
  },
];

function findOrderIndexByTable(tableId: number) {
  return orders.findIndex(
    (order) =>
      order.tableId === tableId &&
      order.estado !== 'PAGADO' &&
      order.estado !== 'CANCELADO'
  );
}

function calculateTotal(items: TableOrderItem[]) {
  return items.reduce((acc, item) => acc + item.subtotal, 0);
}

export async function listOrderCategoriesMock(): Promise<OrderCatalogCategory[]> {
  await delay();
  return [...categories];
}

export async function listOrderProductsByCategoryMock(
  categoryId: number
): Promise<OrderCatalogProduct[]> {
  await delay();

  return products.filter(
    (product) => product.categoryId === categoryId && product.disponible
  );
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

  return order ? { ...order, items: [...order.items] } : null;
}

export async function saveOrderCustomerMock(
  tableId: number,
  customer: TableOrderCustomer
): Promise<TableOrder> {
  await delay();

  if (!customer.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio');
  }

  if (!customer.telefono.trim()) {
    throw new Error('El teléfono es obligatorio');
  }

  if (!customer.ci.trim()) {
    throw new Error('El CI es obligatorio');
  }

  const index = findOrderIndexByTable(tableId);

  if (index === -1) {
    const newOrder: TableOrder = {
      id: nextOrderId++,
      tableId,
      estado: 'ABIERTO',
      customer: {
        nombre: customer.nombre.trim(),
        telefono: customer.telefono.trim(),
        ci: customer.ci.trim(),
      },
      items: [],
      total: 0,
      fechaCreacion: new Date().toISOString(),
    };

    orders = [...orders, newOrder];
    return newOrder;
  }

  const currentOrder = orders[index];

  if (currentOrder.estado === 'CUENTA_SOLICITADA') {
    throw new Error('No puedes editar los datos cuando la cuenta ya fue solicitada');
  }

  const updatedOrder: TableOrder = {
    ...currentOrder,
    customer: {
      nombre: customer.nombre.trim(),
      telefono: customer.telefono.trim(),
      ci: customer.ci.trim(),
    },
  };

  orders = orders.map((order, orderIndex) =>
    orderIndex === index ? updatedOrder : order
  );

  return updatedOrder;
}

export async function addOrderItemToTableMock(
  tableId: number,
  payload: AddOrderItemPayload
): Promise<TableOrder> {
  await delay();

  const orderIndex = findOrderIndexByTable(tableId);

  if (orderIndex === -1) {
    throw new Error('Primero guarda los datos del cliente');
  }

  const currentOrder = orders[orderIndex];

  if (currentOrder.estado === 'CUENTA_SOLICITADA') {
    throw new Error('No puedes agregar items cuando la cuenta ya fue solicitada');
  }

  if (payload.cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
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
    throw new Error('El producto seleccionado no existe');
  }

  const newItem: TableOrderItem = {
    id: nextOrderItemId++,
    productoId: selectedProduct.id,
    nombreProducto: selectedProduct.nombre,
    categoriaId: selectedCategory.id,
    categoriaNombre: selectedCategory.nombre,
    cantidad: payload.cantidad,
    observacion: payload.observacion.trim(),
    precioUnitario: selectedProduct.precio,
    tiempoPreparacion: selectedProduct.tiempoPreparacion,
    subtotal: selectedProduct.precio * payload.cantidad,
  };

  const updatedItems = [...currentOrder.items, newItem];
  const updatedOrder: TableOrder = {
    ...currentOrder,
    items: updatedItems,
    total: calculateTotal(updatedItems),
  };

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );

  return updatedOrder;
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

  if (currentOrder.estado === 'CUENTA_SOLICITADA') {
    throw new Error('No puedes quitar items cuando la cuenta ya fue solicitada');
  }

  const updatedItems = currentOrder.items.filter((item) => item.id !== itemId);

  if (updatedItems.length === currentOrder.items.length) {
    throw new Error('Item no encontrado');
  }

  const updatedOrder: TableOrder = {
    ...currentOrder,
    items: updatedItems,
    total: calculateTotal(updatedItems),
  };

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );

  return updatedOrder;
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

  if (currentOrder.estado === 'CUENTA_SOLICITADA') {
    throw new Error('La cuenta ya fue solicitada');
  }

  const updatedOrder: TableOrder = {
    ...currentOrder,
    estado: 'CUENTA_SOLICITADA',
  };

  orders = orders.map((order, index) =>
    index === orderIndex ? updatedOrder : order
  );

  return updatedOrder;
}