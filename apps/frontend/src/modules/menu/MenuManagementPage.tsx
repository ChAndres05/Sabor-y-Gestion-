import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import {
  createCategoryMock,
  deleteCategoryMock,
  listCategoriesMock,
  toggleCategoryStatusMock,
  updateCategoryMock,
} from '../../shared/mocks/menu.mock';
import { CategoryCard } from './components/CategoryCard';
import { CategoryFormModal } from './components/CategoryFormModal';
import type {
  CategoryStatusFilter,
  MenuCategory,
  MenuCategoryFormValues,
  MenuTab,
} from './types/menu.types';

interface MenuManagementPageProps {
  onBack: () => void;
}

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

type ConfirmState =
  | {
      type: 'toggle';
      category: MenuCategory;
    }
  | {
      type: 'delete';
      category: MenuCategory;
    }
  | null;

export default function MenuManagementPage({
  onBack,
}: MenuManagementPageProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>('categories');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<CategoryStatusFilter>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await listCategoriesMock();
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.nombre
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
            ? category.activo
            : !category.activo;

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, statusFilter]);

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  const handleCreateCategory = async (values: MenuCategoryFormValues) => {
    setIsSubmittingForm(true);

    try {
      await createCategoryMock(values);
      setIsCreateOpen(false);
      await loadCategories();
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
      setIsSubmittingForm(false);
    }
  };

  const handleEditCategory = async (values: MenuCategoryFormValues) => {
    if (!editingCategory) return;

    setIsSubmittingForm(true);

    try {
      await updateCategoryMock(editingCategory.id, values);
      setEditingCategory(null);
      await loadCategories();
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
      setIsSubmittingForm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;

    setIsConfirming(true);

    try {
      if (confirmState.type === 'toggle') {
        await toggleCategoryStatusMock(confirmState.category.id);
        setFeedback({
          type: 'success',
          message: confirmState.category.activo
            ? 'Categoría desactivada correctamente'
            : 'Categoría activada correctamente',
        });
      }

      if (confirmState.type === 'delete') {
        await deleteCategoryMock(confirmState.category.id);
        setFeedback({
          type: 'success',
          message: 'Categoría eliminada correctamente',
        });

        if (selectedCategoryId === confirmState.category.id) {
          setSelectedCategoryId(null);
        }
      }

      setConfirmState(null);
      setOpenActionMenuId(null);
      await loadCategories();
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
      type: 'toggle',
      category,
    });
  };

  const openDeleteConfirm = (category: MenuCategory) => {
    setOpenActionMenuId(null);
    setConfirmState({
      type: 'delete',
      category,
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
                {isLoading ? (
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
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-subtitle font-bold text-text">
                      Productos
                    </h2>
                    <p className="mt-1 text-[14px] leading-6 text-gray-500">
                      Esta pestaña quedará lista en el siguiente paso.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className="rounded-2xl border border-gray-300 px-4 py-2 text-[14px] font-semibold text-text transition-colors hover:bg-gray-50"
                  >
                    Volver
                  </button>
                </div>

                {selectedCategory ? (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-3">
                    <p className="text-[13px] font-medium uppercase tracking-wide text-gray-500">
                      Categoría seleccionada
                    </p>
                    <p className="mt-1 text-[16px] font-bold text-text">
                      {selectedCategory.nombre}
                    </p>

                    <p className="mt-1 text-[14px] leading-6 text-gray-500">
                      {selectedCategory.totalProductos > 0
                        ? `${selectedCategory.totalProductos} productos registrados`
                        : 'Esta categoría no tiene productos aún'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-3">
                    <p className="text-[14px] leading-6 text-gray-500">
                      Aquí mostraremos todos los productos y sus filtros en el
                      siguiente paso.
                    </p>
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
        isSubmitting={isSubmittingForm}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateCategory}
      />

      <CategoryFormModal
        key={editingCategory ? `edit-${editingCategory.id}` : 'edit-closed'}
        open={Boolean(editingCategory)}
        mode="edit"
        initialCategory={editingCategory}
        isSubmitting={isSubmittingForm}
        onClose={() => setEditingCategory(null)}
        onSubmit={handleEditCategory}
      />

      <ConfirmModal
        open={Boolean(confirmState)}
        title={
          confirmState?.type === 'toggle'
            ? confirmState.category.activo
              ? '¿Desactivar categoría?'
              : '¿Activar categoría?'
            : '¿Eliminar categoría?'
        }
        description={
          confirmState?.type === 'toggle'
            ? confirmState.category.activo
              ? 'La categoría dejará de mostrarse para otros roles.'
              : 'La categoría volverá a mostrarse para otros roles.'
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel={
          confirmState?.type === 'toggle'
            ? confirmState.category.activo
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