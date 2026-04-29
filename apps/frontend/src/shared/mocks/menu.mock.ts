import type {
  MenuCategory,
  MenuCategoryFormValues,
} from '../../modules/menu/types/menu.types';

let nextCategoryId = 6;

const delay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

let categories: MenuCategory[] = [
  {
    id: 1,
    nombre: 'Entradas',
    descripcion: 'Platos para iniciar',
    activo: true,
    totalProductos: 3,
  },
  {
    id: 2,
    nombre: 'Platos principales',
    descripcion: 'Platos fuertes del restaurante',
    activo: true,
    totalProductos: 5,
  },
  {
    id: 3,
    nombre: 'Bebidas',
    descripcion: 'Bebidas frías y calientes',
    activo: true,
    totalProductos: 4,
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
    totalProductos: 2,
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

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

  const exists = categories.some(
    (category) => normalizeText(category.nombre) === normalizeText(nombre)
  );

  if (exists) {
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

  const exists = categories.some(
    (category) =>
      category.id !== categoryId &&
      normalizeText(category.nombre) === normalizeText(nombre)
  );

  if (exists) {
    throw new Error('La categoría ya existe');
  }

  const foundCategory = categories.find((category) => category.id === categoryId);

  if (!foundCategory) {
    throw new Error('Categoría no encontrada');
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

  if (foundCategory.totalProductos > 0) {
    throw new Error(
      'No se puede eliminar la categoría porque tiene productos asociados'
    );
  }

  categories = categories.filter((category) => category.id !== categoryId);
}