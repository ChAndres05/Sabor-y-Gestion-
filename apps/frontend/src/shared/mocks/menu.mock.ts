import type {
  MenuCategory,
  MenuCategoryFormValues,
  MenuProduct,
  MenuProductFormValues,
} from '../../modules/menu/types/menu.types';

let nextCategoryId = 6;
let nextProductId = 8;

const delay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeImage(value: string | null) {
  if (!value) return null;

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

let categories: MenuCategory[] = [
  {
    id: 1,
    nombre: 'Entradas',
    descripcion: 'Platos para iniciar',
    activo: true,
    totalProductos: 0,
  },
  {
    id: 2,
    nombre: 'Platos principales',
    descripcion: 'Platos fuertes del restaurante',
    activo: true,
    totalProductos: 0,
  },
  {
    id: 3,
    nombre: 'Bebidas',
    descripcion: 'Bebidas frías y calientes',
    activo: true,
    totalProductos: 0,
  },
  {
    id: 4,
    nombre: 'Postres',
    descripcion: 'Postres y dulces',
    activo: false,
    totalProductos: 0,
  },
  {
    id: 5,
    nombre: 'Comida rápida',
    descripcion: 'Opciones rápidas para servir',
    activo: true,
    totalProductos: 0,
  },
];

let products: MenuProduct[] = [
  {
    id: 1,
    categoryId: 2,
    nombre: 'Pique Macho Especial',
    descripcion:
      'Carne, salchicha, huevo y papas con el sabor tradicional de la casa.',
    precio: 45,
    tiempoPreparacion: 25,
    imagen: null,
    activo: true,
  },
  {
    id: 2,
    categoryId: 2,
    nombre: 'Parrilla de res',
    descripcion: 'Finas láminas con guarnición especial.',
    precio: 55,
    tiempoPreparacion: 30,
    imagen: null,
    activo: true,
  },
  {
    id: 3,
    categoryId: 3,
    nombre: 'Huari 620ml',
    descripcion: 'Cerveza en botella para acompañar el plato.',
    precio: 25,
    tiempoPreparacion: 2,
    imagen: null,
    activo: true,
  },
  {
    id: 4,
    categoryId: 1,
    nombre: 'Ensalada fresca',
    descripcion: 'Lechuga, tomate y cebolla.',
    precio: 20,
    tiempoPreparacion: 10,
    imagen: null,
    activo: true,
  },
  {
    id: 5,
    categoryId: 1,
    nombre: 'Verduras salteadas',
    descripcion: 'Hongos portobello salteados con cebolla y berenjena.',
    precio: 24,
    tiempoPreparacion: 15,
    imagen: null,
    activo: true,
  },
  {
    id: 6,
    categoryId: 4,
    nombre: 'Helado artesanal',
    descripcion: 'Postre frío de temporada.',
    precio: 18,
    tiempoPreparacion: 5,
    imagen: null,
    activo: false,
  },
  {
    id: 7,
    categoryId: 5,
    nombre: 'Hamburguesa clásica',
    descripcion: 'Pan brioche, carne y queso.',
    precio: 35,
    tiempoPreparacion: 20,
    imagen: null,
    activo: true,
  },
];

function syncCategoryTotals() {
  categories = categories.map((category) => {
    const totalProductos = products.filter(
      (product) => product.categoryId === category.id
    ).length;

    return {
      ...category,
      totalProductos,
    };
  });
}

syncCategoryTotals();

/* =========================
   CATEGORÍAS
========================= */

export async function listCategoriesMock(): Promise<MenuCategory[]> {
  await delay();
  return [...categories].sort((a, b) => a.id - b.id);
}

export async function createCategoryMock(
  payload: MenuCategoryFormValues
): Promise<MenuCategory> {
  await delay();

  const nombre = payload.nombre.trim();

  if (!nombre) {
    throw new Error('El nombre de la categoría es obligatorio');
  }

  const alreadyExists = categories.some(
    (category) => normalizeText(category.nombre) === normalizeText(nombre)
  );

  if (alreadyExists) {
    throw new Error('La categoría ya existe');
  }

  const newCategory: MenuCategory = {
    id: nextCategoryId++,
    nombre,
    descripcion: payload.descripcion.trim(),
    activo: payload.activo,
    totalProductos: 0,
  };

  categories = [...categories, newCategory];
  return newCategory;
}

export async function updateCategoryMock(
  categoryId: number,
  payload: MenuCategoryFormValues
): Promise<MenuCategory> {
  await delay();

  const nombre = payload.nombre.trim();

  if (!nombre) {
    throw new Error('El nombre de la categoría es obligatorio');
  }

  const foundCategory = categories.find((category) => category.id === categoryId);

  if (!foundCategory) {
    throw new Error('Categoría no encontrada');
  }

  const alreadyExists = categories.some(
    (category) =>
      category.id !== categoryId &&
      normalizeText(category.nombre) === normalizeText(nombre)
  );

  if (alreadyExists) {
    throw new Error('La categoría ya existe');
  }

  const updatedCategory: MenuCategory = {
    ...foundCategory,
    nombre,
    descripcion: payload.descripcion.trim(),
    activo: payload.activo,
  };

  categories = categories.map((category) =>
    category.id === categoryId ? updatedCategory : category
  );

  return updatedCategory;
}

export async function toggleCategoryStatusMock(
  categoryId: number
): Promise<MenuCategory> {
  await delay();

  const foundCategory = categories.find((category) => category.id === categoryId);

  if (!foundCategory) {
    throw new Error('Categoría no encontrada');
  }

  const updatedCategory: MenuCategory = {
    ...foundCategory,
    activo: !foundCategory.activo,
  };

  categories = categories.map((category) =>
    category.id === categoryId ? updatedCategory : category
  );

  return updatedCategory;
}

export async function deleteCategoryMock(categoryId: number): Promise<void> {
  await delay();

  const foundCategory = categories.find((category) => category.id === categoryId);

  if (!foundCategory) {
    throw new Error('Categoría no encontrada');
  }

  const hasProducts = products.some((product) => product.categoryId === categoryId);

  if (hasProducts) {
    throw new Error(
      'No se puede eliminar la categoría porque tiene productos asociados'
    );
  }

  categories = categories.filter((category) => category.id !== categoryId);
}

/* =========================
   PRODUCTOS
========================= */

export async function listProductsMock(): Promise<MenuProduct[]> {
  await delay();
  return [...products].sort((a, b) => a.id - b.id);
}

export async function createProductMock(
  payload: MenuProductFormValues
): Promise<MenuProduct> {
  await delay();

  const nombre = payload.nombre.trim();
  const descripcion = payload.descripcion.trim();

  if (!payload.categoryId) {
    throw new Error('Debes seleccionar una categoría');
  }

  const foundCategory = categories.find(
    (category) => category.id === payload.categoryId
  );

  if (!foundCategory) {
    throw new Error('La categoría seleccionada no existe');
  }

  if (!nombre) {
    throw new Error('El nombre del producto es obligatorio');
  }

  if (payload.precio <= 0) {
    throw new Error('El precio debe ser mayor a 0');
  }

  if (payload.tiempoPreparacion <= 0) {
    throw new Error('El tiempo de preparación debe ser mayor a 0');
  }

  const alreadyExists = products.some(
    (product) =>
      product.categoryId === payload.categoryId &&
      normalizeText(product.nombre) === normalizeText(nombre)
  );

  if (alreadyExists) {
    throw new Error('Ya existe un producto con ese nombre en la categoría');
  }

  const newProduct: MenuProduct = {
    id: nextProductId++,
    categoryId: payload.categoryId,
    nombre,
    descripcion,
    precio: payload.precio,
    tiempoPreparacion: payload.tiempoPreparacion,
    imagen: normalizeImage(payload.imagen),
    activo: payload.activo,
  };

  products = [...products, newProduct];
  syncCategoryTotals();

  return newProduct;
}

export async function updateProductMock(
  productId: number,
  payload: MenuProductFormValues
): Promise<MenuProduct> {
  await delay();

  const nombre = payload.nombre.trim();
  const descripcion = payload.descripcion.trim();

  const foundProduct = products.find((product) => product.id === productId);

  if (!foundProduct) {
    throw new Error('Producto no encontrado');
  }

  const foundCategory = categories.find(
    (category) => category.id === payload.categoryId
  );

  if (!foundCategory) {
    throw new Error('La categoría seleccionada no existe');
  }

  if (!nombre) {
    throw new Error('El nombre del producto es obligatorio');
  }

  if (payload.precio <= 0) {
    throw new Error('El precio debe ser mayor a 0');
  }

  if (payload.tiempoPreparacion <= 0) {
    throw new Error('El tiempo de preparación debe ser mayor a 0');
  }

  const alreadyExists = products.some(
    (product) =>
      product.id !== productId &&
      product.categoryId === payload.categoryId &&
      normalizeText(product.nombre) === normalizeText(nombre)
  );

  if (alreadyExists) {
    throw new Error('Ya existe un producto con ese nombre en la categoría');
  }

  const updatedProduct: MenuProduct = {
    ...foundProduct,
    categoryId: payload.categoryId,
    nombre,
    descripcion,
    precio: payload.precio,
    tiempoPreparacion: payload.tiempoPreparacion,
    imagen: normalizeImage(payload.imagen),
    activo: payload.activo,
  };

  products = products.map((product) =>
    product.id === productId ? updatedProduct : product
  );

  syncCategoryTotals();

  return updatedProduct;
}

export async function toggleProductStatusMock(
  productId: number
): Promise<MenuProduct> {
  await delay();

  const foundProduct = products.find((product) => product.id === productId);

  if (!foundProduct) {
    throw new Error('Producto no encontrado');
  }

  const updatedProduct: MenuProduct = {
    ...foundProduct,
    activo: !foundProduct.activo,
  };

  products = products.map((product) =>
    product.id === productId ? updatedProduct : product
  );

  return updatedProduct;
}

export async function deleteProductMock(productId: number): Promise<void> {
  await delay();

  const foundProduct = products.find((product) => product.id === productId);

  if (!foundProduct) {
    throw new Error('Producto no encontrado');
  }

  products = products.filter((product) => product.id !== productId);
  syncCategoryTotals();
}