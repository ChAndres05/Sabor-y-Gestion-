import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { getMockIngredientsForProduct } from '../../shared/mocks/menu-ingredients.mock';
import {
  addOrderItemToTableMock,
  getOpenOrderByTableMock,
  listOrderCategoriesMock,
  listOrderProductsByCategoryMock,
  removeOrderItemFromTableMock,
  updateOrderItemInTableMock,
} from '../../shared/mocks/table-orders.mock';
import { pusherClient } from '../../shared/utils/pusher';
import { getTableByIdMock } from '../../shared/mocks/tables.mock';
import type { AuthUser } from '../auth/types/auth.types';
import type { RestaurantTable } from '../tables/types/table.types';
import type {
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderItem,
  TableOrderStatus,
} from '../tables/types/table-order.types';

type FlowStep = 'cliente' | 'menu' | 'pedido';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type IngredientSelection = {
  id: number;
  nombre: string;
  incluido: boolean;
  incluidoPorDefecto: boolean;
};

interface ClientActiveOrderPageProps {
  user: AuthUser;
  tableId: number;
  onBack: () => void;
}

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function getOrderStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO': return 'Recibido';
    case 'EN_PREPARACION': return 'En preparación';
    case 'LISTO': return 'Listo';
    case 'EN_CAMINO': return 'En camino';
    case 'ENTREGADO': return 'Entregado';
    case 'PAGADO': return 'Pagado';
    case 'CANCELADO': return 'Cancelado';
  }
}

function getStatusBadgeClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO': return 'bg-process/10 text-process';
    case 'EN_PREPARACION': return 'bg-alert/10 text-alert';
    case 'LISTO':
    case 'EN_CAMINO': return 'bg-info/10 text-info';
    case 'ENTREGADO':
    case 'PAGADO': return 'bg-success/10 text-success';
    case 'CANCELADO': return 'bg-gray-200 text-gray-600';
  }
}

function getItemIcon(categoryId: number) {
  switch (categoryId) {
    case 1: return '🥗';
    case 2: return '🍽️';
    case 3: return '🥤';
    case 4: return '🍰';
    default: return '🍴';
  }
}

function buildDefaultIngredients(product: OrderCatalogProduct | null): IngredientSelection[] {
  if (!product) return [];
  
  // Si el producto ya tiene ingredientes (desde la API o el mock de catálogo), los usamos
  if (product.ingredientes && product.ingredientes.length > 0) {
    return product.ingredientes.map((ingredient) => ({
      id: ingredient.id,
      nombre: ingredient.nombre,
      incluido: ingredient.incluidoPorDefecto,
      incluidoPorDefecto: ingredient.incluidoPorDefecto,
    }));
  }

  // Si no tiene (por ejemplo, porque la BD está vacía), usamos el mock compartido para que "se vea bien"
  return getMockIngredientsForProduct(product.nombre).map(i => ({
    id: i.id,
    nombre: i.nombre,
    incluido: i.incluidoPorDefecto,
    incluidoPorDefecto: i.incluidoPorDefecto,
  }));
}

export default function ClientActiveOrderPage({ user, tableId, onBack }: ClientActiveOrderPageProps) {
  const [activeStep, setActiveStep] = useState<FlowStep>('menu');
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [categories, setCategories] = useState<OrderCatalogCategory[]>([]);
  const [products, setProducts] = useState<OrderCatalogProduct[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [ingredientSelections, setIngredientSelections] = useState<IngredientSelection[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const skipNextIngredientHydration = useRef(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const isBillRequested = table?.estado === 'CUENTA_SOLICITADA';
  const canEditItems =
    Boolean(order) &&
    !isBillRequested &&
    order?.estado !== 'PAGADO' &&
    order?.estado !== 'CANCELADO';

  const refreshPageState = useCallback(async () => {
    const latestOrder = await getOpenOrderByTableMock(tableId);
    setOrder(latestOrder);
  }, [tableId]);

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      try {
        const [tableData, categoriesData, orderData] = await Promise.all([
          getTableByIdMock(tableId),
          listOrderCategoriesMock(),
          getOpenOrderByTableMock(tableId),
        ]);
        setTable(tableData);
        setCategories(categoriesData);
        setOrder(orderData);
        setSelectedCategoryId(categoriesData[0]?.id ?? 0);
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'Error',
          message: error instanceof Error ? error.message : 'Error al cargar pedido',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void loadPage();

    const channel = pusherClient.subscribe('orders-channel');
    channel.bind('order-updated', () => { void refreshPageState(); });
    return () => {
      channel.unbind('order-updated');
      pusherClient.unsubscribe('orders-channel');
    };
  }, [tableId, refreshPageState]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedCategoryId) return;
      try {
        const categoryProducts = await listOrderProductsByCategoryMock(selectedCategoryId);
        setProducts(categoryProducts);
        if (!skipNextIngredientHydration.current) {
          setSelectedProductId(categoryProducts[0]?.id ?? 0);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };
    void loadProducts();
  }, [selectedCategoryId]);

  useEffect(() => {
    if (skipNextIngredientHydration.current) {
      skipNextIngredientHydration.current = false;
      return;
    }
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  }, [selectedProduct]);

  const resetItemForm = () => {
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  };

  const openProductModal = (product: OrderCatalogProduct) => {
    setSelectedCategoryId(product.categoryId);
    setSelectedProductId(product.id);
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(product));
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    setIsSavingItem(true);
    try {
      const payload = {
        categoriaId: selectedCategoryId,
        productoId: selectedProductId,
        cantidad: Number(quantity),
        observacion: observation,
        ingredientes: ingredientSelections.map(i => ({ nombre: i.nombre, incluido: i.incluido })),
      };
      if (editingItemId) {
        await updateOrderItemInTableMock(tableId, editingItemId, payload);
      } else {
        await addOrderItemToTableMock(tableId, payload);
      }
      await refreshPageState();
      resetItemForm();
      setIsItemModalOpen(false);
      setActiveStep('pedido');
      setFeedback({ type: 'success', title: 'Éxito', message: 'Pedido actualizado' });
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo guardar' });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleStartEditItem = (item: TableOrderItem) => {
    skipNextIngredientHydration.current = true;
    setEditingItemId(item.id);
    setSelectedCategoryId(item.categoriaId);
    setSelectedProductId(item.productoId);
    setQuantity(String(item.cantidad));
    setObservation(item.observacion);
    setIngredientSelections(item.ingredientes.map((i, idx) => ({
      id: idx + 1,
      nombre: i.nombre,
      incluido: i.incluido,
      incluidoPorDefecto: i.incluido
    })));
    setIsItemModalOpen(true);
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeOrderItemFromTableMock(tableId, itemId);
      await refreshPageState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleIngredient = (id: number) => {
    setIngredientSelections(prev => prev.map(i => i.id === id ? { ...i, incluido: !i.incluido } : i));
  };

  const hasCustomIngredients = ingredientSelections.some(i => i.incluido !== i.incluidoPorDefecto);
  const removedFromSelection = ingredientSelections.filter(i => !i.incluido);

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
        <header className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={onBack} className="text-[28px] leading-none text-text">←</button>
            <button type="button" onClick={onBack} className="rounded-full bg-white px-4 py-2 text-[12px] font-bold text-primary shadow-sm">Mis pedidos</button>
          </div>
          <h1 className="text-title font-bold text-text">Gestionar pedido</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            Mesa {table?.numero ?? tableId} · {order?.estado === 'REGISTRADO' ? 'Registrado' : 'Ocupada'} · {user.nombre}
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">Cargando...</div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-white/60 p-1 shadow-sm md:w-max">
              <div className="grid grid-cols-3 gap-1 md:flex md:gap-2">
                {(['cliente', 'menu', 'pedido'] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(step)}
                    className={`rounded-xl px-3 py-2 text-[12px] font-bold capitalize transition-colors ${
                      activeStep === step ? 'bg-white text-text shadow-sm' : 'text-gray-500 hover:bg-white/60'
                    }`}
                  >
                    {step === 'cliente' ? 'Cliente' : step === 'menu' ? 'Menú' : 'Pedido'}
                  </button>
                ))}
              </div>
            </div>

            {activeStep === 'cliente' && (
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <h3 className="font-bold mb-2">Datos del cliente</h3>
                <p className="text-[14px]">Nombre: {order?.customer.nombre ?? user.nombre}</p>
                <p className="text-[14px]">CI: {order?.customer.ci || 'No registrado'}</p>
              </div>
            )}

            {activeStep === 'menu' && (
              <section className="space-y-4">
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <h2 className="text-[20px] font-bold mb-3">Categorías</h2>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`shrink-0 rounded-xl px-4 py-3 text-[12px] font-bold ${
                          selectedCategoryId === c.id ? 'bg-primary text-white' : 'bg-background text-text'
                        }`}
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {products.map((p) => (
                    <article key={p.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center bg-background rounded-xl text-[22px] overflow-hidden">
                          {p.imagen && (p.imagen.startsWith('http') || p.imagen.startsWith('/') || p.imagen.includes('.')) ? (
                            <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                          ) : (
                            getItemIcon(p.categoryId)
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-[15px]">{p.nombre}</h4>
                          <p className="text-[12px] text-gray-500">{formatCurrency(p.precio)} · {p.tiempoPreparacion} min</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => openProductModal(p)} disabled={!canEditItems} className="rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60">+ Agregar</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeStep === 'pedido' && (
              <section className="space-y-4">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-sm flex justify-between items-center">
                  <div>
                    <h2 className="text-[20px] font-bold">Pedido actual</h2>
                    <p className="text-[13px] text-gray-500">{order?.customer.nombre} · Mesa {table?.numero}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusBadgeClass(order?.estado || 'REGISTRADO')}`}>
                    {getOrderStatusLabel(order?.estado || 'REGISTRADO')}
                  </span>
                </div>

                {order?.items.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex justify-between">
                      <div className="flex gap-3">
                        <div className="h-11 w-11 flex items-center justify-center bg-background rounded-xl text-[20px]">{getItemIcon(item.categoriaId)}</div>
                        <div>
                          <h4 className="font-bold text-[15px]">{item.nombreProducto}</h4>
                          <p className="text-[12px] text-gray-500">{item.cantidad}x · {formatCurrency(item.precioUnitario)} c/u</p>
                          {item.observacion && <p className="text-[12px] font-semibold text-primary">Nota: {item.observacion}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canEditItems && (
                          <>
                            <button onClick={() => handleStartEditItem(item)} className="h-8 w-8 rounded-lg bg-background text-[15px]">✎</button>
                            <button onClick={() => handleRemoveItem(item.id)} className="h-8 w-8 rounded-lg bg-alert/10 text-[15px] text-alert">🗑</button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                <div className="rounded-[1.5rem] bg-white p-5 shadow-sm flex justify-between items-center">
                  <span className="font-bold">Total</span>
                  <span className="text-[22px] font-bold text-primary">{formatCurrency(order?.total || 0)}</span>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-[390px] bg-white rounded-[1.5rem] p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-[20px] font-bold">{editingItemId ? 'Editar item' : 'Nuevo pedido'}</h2>
                <p className="text-[13px] text-gray-500">Agrega producto, cantidad, observaciones e ingredientes.</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="h-8 w-8 bg-text text-white rounded-full flex items-center justify-center font-bold">×</button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold">Categoría</label>
                <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(Number(e.target.value))} className="rounded-xl border border-gray-300 p-3 text-[14px]">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold">Producto</label>
                <select value={selectedProductId} onChange={e => setSelectedProductId(Number(e.target.value))} className="rounded-xl border border-gray-300 p-3 text-[14px]">
                  {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-bold">Observación</label>
                  <input type="text" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Ej. Sin locoto" className="rounded-xl border border-gray-300 p-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-bold">Cantidad</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="rounded-xl border border-gray-300 p-3 text-center text-[14px]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-xl p-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Precio</p>
                  <p className="font-bold text-text">{selectedProduct ? formatCurrency(selectedProduct.precio) : 'Bs 0.00'}</p>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Tiempo</p>
                  <p className="font-bold text-text">{selectedProduct ? `${selectedProduct.tiempoPreparacion} min` : '0 min'}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-[13px] font-bold">Ingredientes</p>
                    <p className="text-[12px] text-gray-500">Switch activo = lleva.</p>
                  </div>
                  <span className={`relative h-6 w-11 rounded-full ${hasCustomIngredients ? 'bg-success' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${hasCustomIngredients ? 'left-6' : 'left-1'}`} />
                  </span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {ingredientSelections.map(i => (
                    <div key={i.id} className="flex justify-between items-center p-3 border-b last:border-b-0 border-gray-200">
                      <span className={`text-[13px] font-bold ${i.incluido ? 'text-text' : 'text-gray-400 line-through'}`}>{i.nombre}</span>
                      <button type="button" onClick={() => handleToggleIngredient(i.id)} className={`relative h-6 w-11 rounded-full ${i.incluido ? 'bg-success' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${i.incluido ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                  {ingredientSelections.length === 0 && <p className="p-3 text-[12px] text-gray-500">Sin ingredientes configurados.</p>}
                </div>
                {removedFromSelection.length > 0 && <p className="text-[12px] font-bold text-alert mt-2">Cocina verá: {removedFromSelection.map(i => `sin ${i.nombre.toLowerCase()}`).join(', ')}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="rounded-xl border border-text p-3 text-[13px] font-bold text-text">Cancelar</button>
                <button type="button" onClick={() => void handleSaveItem()} disabled={isSavingItem} className="rounded-xl bg-primary p-3 text-[13px] font-bold text-white disabled:opacity-60">
                  {isSavingItem ? 'Guardando...' : editingItemId ? 'Listo' : 'Crear'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <FeedbackModal open={Boolean(feedback)} title={feedback?.title ?? ''} message={feedback?.message ?? ''} type={feedback?.type ?? 'info'} onClose={() => setFeedback(null)} />
    </main>
  );
}
