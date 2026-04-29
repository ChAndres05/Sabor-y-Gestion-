import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import {
  createProductMock,
  deleteProductMock,
  listProductsMock,
  toggleProductStatusMock,
  updateProductMock,
} from '../../shared/mocks/menu.mock';
import { CategoryCard } from './components/CategoryCard';
import { CategoryFormModal } from './components/CategoryFormModal';
import { ProductCard } from './components/ProductCard';
import { ProductFormModal } from './components/ProductFormModal';
import type {
  CategoryStatusFilter,
  MenuCategory,
  MenuCategoryFormValues,
  MenuProduct,
  MenuProductFormValues,
  MenuTab,
  ProductStatusFilter,
} from './types/menu.types';
import { menuApi } from './menu.api';

interface MenuManagementPageProps {
  onBack: () => void;
}

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

type ConfirmState =
  | {
      entity: 'category';
      type: 'toggle';
      category: MenuCategory;
    }
  | {
      entity: 'category';
      type: 'delete';
      category: MenuCategory;
    }
  | {
      entity: 'product';
      type: 'toggle';
      product: MenuProduct;
    }
  | {
      entity: 'product';
      type: 'delete';
      product: MenuProduct;
    }
  | null;

export default function MenuManagementPage({
  onBack,
}: MenuManagementPageProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>('categories');

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);

  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<CategoryStatusFilter>('ALL');

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productStatusFilter, setProductStatusFilter] =
    useState<ProductStatusFilter>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );
  const [isSubmittingCategoryForm, setIsSubmittingCategoryForm] =
    useState(false);

  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(
    null
  );
  const [isSubmittingProductForm, setIsSubmittingProductForm] =
    useState(false);

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [openProductActionMenuId, setOpenProductActionMenuId] = useState<
    number | null
  >(null);

  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadCategories = useCallback(async (search = '', status = 'ALL') => {
    setIsCategoriesLoading(true);

    try {
      // Enviamos la búsqueda y filtros al backend real
      const estadoApi = status === 'ACTIVE' ? 'activas' : status === 'INACTIVE' ? 'inactivas' : 'todas';
      const data = await menuApi.getCategories(search, estadoApi);
      setCategories(data);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cargar las categorías',
      });
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsProductsLoading(true);

    try {
      const data = await listProductsMock();
      setProducts(data);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cargar los productos',
      });
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Añadimos un pequeño retraso (debounce) para no saturar la API al escribir
    const timeout = setTimeout(() => {
      void loadCategories(searchTerm, statusFilter);
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadCategories, searchTerm, statusFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // La lista ya viene filtrada desde el backend, pasamos directo la variable
  const filteredCategories = categories;

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.nombre
        .toLowerCase()
        .includes(productSearchTerm.trim().toLowerCase());

      const matchesStatus =
        productStatusFilter === 'ALL'
          ? true
          : productStatusFilter === 'AVAILABLE'
            ? product.activo
            : !product.activo;

      const matchesCategory =
        selectedCategoryId === null
          ? true
          : product.categoryId === selectedCategoryId;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, productSearchTerm, productStatusFilter, selectedCategoryId]);

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  const handleCreateCategory = async (values: MenuCategoryFormValues) => {
    setIsSubmittingCategoryForm(true);

    try {
      await menuApi.createCategory(values);
      setIsCreateOpen(false);
      await loadCategories(searchTerm, statusFilter);
      setFeedback({
        type: 'success',
        message: 'Categoría creada correctamente',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo crear la categoría',
      });
    } finally {
      setIsSubmittingCategoryForm(false);
    }
  };

  const handleEditCategory = async (values: MenuCategoryFormValues) => {
    if (!editingCategory) return;

    setIsSubmittingCategoryForm(true);

    try {
      await menuApi.updateCategory(editingCategory.id, values);
      setEditingCategory(null);
      await loadCategories(searchTerm, statusFilter);
      setFeedback({
        type: 'success',
        message: 'Categoría actualizada correctamente',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la categoría',
      });
    } finally {
      setIsSubmittingCategoryForm(false);
    }
  };

  const handleCreateProduct = async (values: MenuProductFormValues) => {
    setIsSubmittingProductForm(true);

    try {
      await createProductMock(values);
      setIsCreateProductOpen(false);
      await Promise.all([loadProducts(), loadCategories(searchTerm, statusFilter)]);
      setFeedback({
        type: 'success',
        message: 'Producto creado correctamente',
      });
      setActiveTab('products');
      setSelectedCategoryId(values.categoryId);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo crear el producto',
      });
    } finally {
      setIsSubmittingProductForm(false);
    }
  };

  const handleEditProduct = async (values: MenuProductFormValues) => {
    if (!editingProduct) return;

    setIsSubmittingProductForm(true);

    try {
      await updateProductMock(editingProduct.id, values);
      setEditingProduct(null);
      await Promise.all([loadProducts(), loadCategories(searchTerm, statusFilter)]);
      setFeedback({
        type: 'success',
        message: 'Producto actualizado correctamente',
      });
      setSelectedCategoryId(values.categoryId);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el producto',
      });
    } finally {
      setIsSubmittingProductForm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;

    setIsConfirming(true);

    try {
      if (confirmState.entity === 'category') {
        if (confirmState.type === 'toggle') {
          await menuApi.updateCategory(confirmState.category.id, { activo: !confirmState.category.activo });
          setFeedback({
            type: 'success',
            message: confirmState.category.activo
              ? 'Categoría desactivada correctamente'
              : 'Categoría activada correctamente',
          });
        }

        if (confirmState.type === 'delete') {
          await menuApi.deleteCategory(confirmState.category.id);
          setFeedback({
            type: 'success',
            message: 'Categoría eliminada correctamente',
          });

          if (selectedCategoryId === confirmState.category.id) {
            setSelectedCategoryId(null);
          }
        }

        setOpenActionMenuId(null);
        await loadCategories(searchTerm, statusFilter);
      }

      if (confirmState.entity === 'product') {
        if (confirmState.type === 'toggle') {
          await toggleProductStatusMock(confirmState.product.id);
          setFeedback({
            type: 'success',
            message: confirmState.product.activo
              ? 'Producto desactivado correctamente'
              : 'Producto activado correctamente',
          });
        }

        if (confirmState.type === 'delete') {
          await deleteProductMock(confirmState.product.id);
          setFeedback({
            type: 'success',
            message: 'Producto eliminado correctamente',
          });
        }

        setOpenProductActionMenuId(null);
        await Promise.all([loadProducts(), loadCategories(searchTerm, statusFilter)]);
      }

      setConfirmState(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo completar la acción',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const openToggleConfirm = (category: MenuCategory) => {
    setOpenActionMenuId(null);
    setConfirmState({
      entity: 'category',
      type: 'toggle',
      category,
    });
  };

  const openDeleteConfirm = (category: MenuCategory) => {
    setOpenActionMenuId(null);
    setConfirmState({
      entity: 'category',
      type: 'delete',
      category,
    });
  };

  const openToggleProductConfirm = (product: MenuProduct) => {
    setOpenProductActionMenuId(null);
    setConfirmState({
      entity: 'product',
      type: 'toggle',
      product,
    });
  };

  const openDeleteProductConfirm = (product: MenuProduct) => {
    setOpenProductActionMenuId(null);
    setConfirmState({
      entity: 'product',
      type: 'delete',
      product,
    });
  };

  const handleViewProducts = (category: MenuCategory) => {
    setSelectedCategoryId(category.id);
    setActiveTab('products');
    setOpenActionMenuId(null);
  };

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-[28px] leading-none text-text"
          >
            ☰
          </button>

          <h1 className="text-title font-bold text-text">Gestión de menú</h1>
          <p className="mt-1 text-[14px] leading-5 text-gray-500">
            Administra las categorías y productos del restaurante
          </p>

          <div className="mt-4 flex rounded-2xl bg-white/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex-1 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors ${
                activeTab === 'categories'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Categorías
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex-1 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Productos
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 shrink-0 rounded-2xl px-4 py-3 text-[14px] font-medium ${
              feedback.type === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-alert/10 text-alert'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          {activeTab === 'categories' && (
            <section className="flex h-full flex-col overflow-hidden">
              <div className="shrink-0">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar categoría..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
                  />

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as CategoryStatusFilter
                        )
                      }
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
                    >
                      <option value="ALL">Todas</option>
                      <option value="ACTIVE">Activas</option>
                      <option value="INACTIVE">Inactivas</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover"
                    >
                      + Nueva categoría
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <h2 className="text-subtitle font-bold text-text">
                    Categorías
                  </h2>
                  <span className="text-[13px] font-medium text-gray-500">
                    {filteredCategories.length} resultados
                  </span>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {isCategoriesLoading ? (
                  <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
                    Cargando categorías...
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                    <p className="text-[16px] font-semibold text-text">
                      No se encontraron categorías
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-gray-500">
                      Prueba con otro nombre o cambia el filtro de estado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCategories.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        menuOpen={openActionMenuId === category.id}
                        onToggleMenu={() =>
                          setOpenActionMenuId((currentId) =>
                            currentId === category.id ? null : category.id
                          )
                        }
                        onEdit={() => {
                          setOpenActionMenuId(null);
                          setEditingCategory(category);
                        }}
                        onViewProducts={() => handleViewProducts(category)}
                    // ¡Devolvemos las aperturas visuales del Modal de Confirmación!
                    onToggleStatus={() => openToggleConfirm(category)}
                    onDelete={() => openDeleteConfirm(category)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'products' && (
            <section className="flex h-full flex-col overflow-hidden">
              <div className="shrink-0">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(event) => setProductSearchTerm(event.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
                  />

                  <select
                    value={selectedCategoryId === null ? 'ALL' : String(selectedCategoryId)}
                    onChange={(event) =>
                      setSelectedCategoryId(
                        event.target.value === 'ALL'
                          ? null
                          : Number(event.target.value)
                      )
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
                  >
                    <option value="ALL">Todas las categorías</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nombre}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <select
                      value={productStatusFilter}
                      onChange={(event) =>
                        setProductStatusFilter(
                          event.target.value as ProductStatusFilter
                        )
                      }
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
                    >
                      <option value="ALL">Todos</option>
                      <option value="AVAILABLE">Disponibles</option>
                      <option value="UNAVAILABLE">No disponibles</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCreateProductOpen(true)}
                      disabled={categories.length === 0}
                      className="rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      + Nuevo producto
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-subtitle font-bold text-text">
                      Productos
                    </h2>
                    <p className="mt-1 text-[13px] font-medium text-gray-500">
                      {selectedCategory
                        ? `Filtrando por ${selectedCategory.nombre}`
                        : 'Mostrando todas las categorías'}
                    </p>
                  </div>

                  <span className="text-[13px] font-medium text-gray-500">
                    {filteredProducts.length} resultados
                  </span>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {isProductsLoading ? (
                  <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
                    Cargando productos...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                    <p className="text-[16px] font-semibold text-text">
                      No se encontraron productos
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-gray-500">
                      {selectedCategory
                        ? 'Esta categoría aún no tiene productos registrados o no coincide con los filtros.'
                        : 'Prueba con otro nombre o cambia los filtros.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        category={categories.find(
                          (category) => category.id === product.categoryId
                        )}
                        menuOpen={openProductActionMenuId === product.id}
                        onToggleMenu={() =>
                          setOpenProductActionMenuId((currentId) =>
                            currentId === product.id ? null : product.id
                          )
                        }
                        onEdit={() => {
                          setOpenProductActionMenuId(null);
                          setEditingProduct(product);
                        }}
                        onToggleStatus={() => openToggleProductConfirm(product)}
                        onDelete={() => openDeleteProductConfirm(product)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <CategoryFormModal
        key={isCreateOpen ? 'create-open' : 'create-closed'}
        open={isCreateOpen}
        mode="create"
        isSubmitting={isSubmittingCategoryForm}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateCategory}
      />

      <CategoryFormModal
        key={editingCategory ? `edit-${editingCategory.id}` : 'edit-closed'}
        open={Boolean(editingCategory)}
        mode="edit"
        initialCategory={editingCategory}
        isSubmitting={isSubmittingCategoryForm}
        onClose={() => setEditingCategory(null)}
        onSubmit={handleEditCategory}
      />

      <ProductFormModal
        key={
          isCreateProductOpen
            ? `product-create-${selectedCategoryId ?? 'all'}`
            : 'product-create-closed'
        }
        open={isCreateProductOpen}
        mode="create"
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        isSubmitting={isSubmittingProductForm}
        onClose={() => setIsCreateProductOpen(false)}
        onSubmit={handleCreateProduct}
      />

      <ProductFormModal
        key={editingProduct ? `product-edit-${editingProduct.id}` : 'product-edit-closed'}
        open={Boolean(editingProduct)}
        mode="edit"
        categories={categories}
        initialProduct={editingProduct}
        isSubmitting={isSubmittingProductForm}
        onClose={() => setEditingProduct(null)}
        onSubmit={handleEditProduct}
      />

      <ConfirmModal
        open={Boolean(confirmState)}
        title={
          confirmState?.entity === 'category'
            ? confirmState.type === 'toggle'
              ? confirmState.category.activo
                ? '¿Desactivar categoría?'
                : '¿Activar categoría?'
              : '¿Eliminar categoría?'
            : confirmState?.type === 'toggle'
              ? confirmState.product.activo
                ? '¿Desactivar producto?'
                : '¿Activar producto?'
              : '¿Eliminar producto?'
        }
        description={
          confirmState?.entity === 'category'
            ? confirmState.type === 'toggle'
              ? confirmState.category.activo
                ? 'La categoría dejará de mostrarse para otros roles.'
                : 'La categoría volverá a mostrarse para otros roles.'
              : 'Esta acción no se puede deshacer.'
            : confirmState?.type === 'toggle'
              ? confirmState.product.activo
                ? 'El producto dejará de estar disponible para otros roles.'
                : 'El producto volverá a estar disponible para otros roles.'
              : 'Esta acción no se puede deshacer.'
        }
        confirmLabel={
          confirmState?.type === 'toggle'
            ? confirmState.entity === 'category'
              ? confirmState.category.activo
                ? 'Desactivar'
                : 'Activar'
              : confirmState.product.activo
                ? 'Desactivar'
                : 'Activar'
            : 'Eliminar'
        }
        isLoading={isConfirming}
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirmAction}
      />
    </main>
  );
}