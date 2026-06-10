import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import type { AuthUser } from '../auth/types/auth.types';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory } from '../menu/types/menu.types';
import { mapProductFromBackend, type BackendProduct } from '../../shared/mappers/menu.mapper';
import { clientFlowApi } from '../../shared/api/client-flow.api';
import type { ClientOrderItem, ClientReservation } from '../../shared/types/client-flow.types';
import type { OrderCatalogProduct } from '../tables/types/table-order.types';

type FlowStep = 'cliente' | 'menu' | 'pedido';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

interface ClientReservationOrderPageProps {
  user: AuthUser;
  reservationId: number;
  onBack: () => void;
  onNavigateToOrders: () => void;
}

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
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

/**
 * 🛡️ LIMPIEZA: Leemos los ingredientes limpios desde el mapper de base de datos
 */
function buildDefaultIngredients(product: OrderCatalogProduct | null) {
  if (!product) return [];
  const backendIngredients = product.ingredientes ?? [];
  
  return backendIngredients.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    incluido: i.incluidoPorDefecto,
    incluidoPorDefecto: i.incluidoPorDefecto,
  }));
}

export default function ClientReservationOrderPage({
  user,
  reservationId,
  onBack,
  onNavigateToOrders,
}: ClientReservationOrderPageProps) {
  const [activeStep, setActiveStep] = useState<FlowStep>('menu');
  const [reservation, setReservation] = useState<ClientReservation | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<OrderCatalogProduct[]>([]);
  const [allProducts, setAllProducts] = useState<OrderCatalogProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  
  // 🛡️ SOLUCIÓN LINTER: Eliminado el "any"
  const [ingredientSelections, setIngredientSelections] = useState<{ id?: number; nombre: string; incluido: boolean; incluidoPorDefecto: boolean }[]>([]);
  
  const [cart, setCart] = useState<ClientOrderItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) || null,
    [allProducts, selectedProductId]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // 🛡️ SOLUCIÓN TS: listReservations en lugar de getReservationById
        const [reservations, catsData, prodsDataRaw] = await Promise.all([
          clientFlowApi.listReservations(user.id),
          menuApi.getCategories('', 'activas'),
          menuApi.getProductos(),
        ]);

        const resData = reservations.find(r => r.id === reservationId) || null;
        setReservation(resData);
        setCategories(catsData);
        
        const mappedProducts = (prodsDataRaw as BackendProduct[])
          .map(mapProductFromBackend)
          .filter(p => p.disponible);
        
        setAllProducts(mappedProducts);

        if (catsData.length > 0) {
          const firstCatId = catsData[0].id;
          setSelectedCategoryId(firstCatId);
          setProducts(mappedProducts.filter((p) => p.categoryId === firstCatId));
        }
      } catch (error) {
        console.error(error);
        setFeedback({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar los datos de la reserva.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void loadInitialData();
  }, [reservationId, user.id]);

  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = allProducts.filter((p) => p.categoryId === selectedCategoryId);
      setProducts(filtered);
      // 🛡️ SOLUCIÓN LINTER: Agregamos selectedProductId al array de dependencias
      if (filtered.length > 0 && !filtered.some(p => p.id === selectedProductId)) {
        setSelectedProductId(filtered[0].id);
      }
    }
  }, [selectedCategoryId, allProducts, selectedProductId]);

  useEffect(() => {
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  }, [selectedProduct]);

  const openProductModal = (product: OrderCatalogProduct) => {
    setSelectedProductId(product.id);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(product));
    setIsItemModalOpen(true);
  };

  const handleToggleIngredient = (nombre: string) => {
    setIngredientSelections((prev) =>
      prev.map((i) => (i.nombre === nombre ? { ...i, incluido: !i.incluido } : i))
    );
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // 🛡️ SOLUCIÓN TS: Construimos exactamente lo que exige `ClientOrderItem`
    const newItem: ClientOrderItem = {
      id: selectedProduct.id, 
      presentacionId: selectedProduct.presentacionId,
      name: selectedProduct.nombre,
      quantity: Number(quantity),
      unitPrice: selectedProduct.precio,
      subtotal: selectedProduct.precio * Number(quantity),
      notes: observation,
      ingredients: ingredientSelections.map((i) => ({
        name: i.nombre,
        included: i.incluido,
      })),
    };

    setCart((prev) => [...prev, newItem]);
    setIsItemModalOpen(false);
    setActiveStep('pedido');
    setFeedback({
      type: 'success',
      title: 'Agregado',
      message: `${selectedProduct.nombre} se añadió a tu pedido anticipado.`,
    });
  };

  const handleRemoveFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveOrder = async () => {
    if (cart.length === 0) return;
    setIsSaving(true);
    try {
      // 🛡️ SOLUCIÓN TS: Llamamos al endpoint y estructura correctos según tu API
      await clientFlowApi.createPreparedReservationOrder({
        userId: user.id,
        reservationId: reservationId,
        items: cart,
        notes: 'Pedido preparado desde la web',
      });

      setFeedback({
        type: 'success',
        title: '¡Pedido guardado!',
        message: 'Tu pedido anticipado ha sido registrado correctamente.',
      });
      setTimeout(() => onNavigateToOrders(), 2000);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: 'error',
        title: 'Error al guardar',
        message: 'No se pudo registrar el pedido. Intenta de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  if (isLoading) {
    return <div className="p-10 text-center">Cargando menú de reserva...</div>;
  }

  return (
    <main className="min-h-full bg-background pb-24 text-text">
      <header className="bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-primary">
            <span>←</span> Volver
          </button>
          <h1 className="text-2xl font-bold">Pedido Anticipado</h1>
          <p className="text-sm text-gray-500">Reserva #{reservationId} • {reservation?.date}</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveStep('menu')}
            className={`pb-4 text-sm font-bold transition-all ${activeStep === 'menu' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}
          >
            Explorar Menú
          </button>
          <button
            onClick={() => setActiveStep('pedido')}
            className={`pb-4 text-sm font-bold transition-all ${activeStep === 'pedido' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}
          >
            Mi Selección ({cart.length})
          </button>
        </div>

        {activeStep === 'menu' ? (
          <section>
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`shrink-0 rounded-full px-6 py-2 text-xs font-bold transition-colors ${selectedCategoryId === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background text-2xl">
                      {product.imagen ? <img src={product.imagen} alt={product.nombre} className="h-full w-full rounded-2xl object-cover" /> : getItemIcon(product.categoryId)}
                    </div>
                    <div>
                      <h3 className="font-bold">{product.nombre}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-400">{product.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{formatCurrency(product.precio)}</span>
                    <button onClick={() => openProductModal(product)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-2xl">
            {cart.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-gray-400">No has seleccionado nada aún.</p>
                <button onClick={() => setActiveStep('menu')} className="mt-4 text-sm font-bold text-primary underline">
                  Ir al menú
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, idx) => {
                  const removed = (item.ingredients || []).filter(i => !i.included);
                  return (
                    <div key={`${item.id}-${idx}`} className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-xl">
                          🍽️
                        </div>
                        <div>
                          <h4 className="font-bold">{item.name} <span className="text-gray-400">x{item.quantity}</span></h4>
                          {removed.length > 0 && (
                            <p className="text-[11px] font-bold text-alert">
                              Sin {removed.map(i => i.name.toLowerCase()).join(', ')}
                            </p>
                          )}
                          {item.notes && <p className="text-[11px] text-primary italic">Nota: {item.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold">{formatCurrency(item.subtotal)}</span>
                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-alert hover:opacity-70">✕</button>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <span className="font-bold text-gray-500">Total anticipado</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">
                    * El pago se realizará en el establecimiento el día de tu reserva.
                  </p>
                  <button
                    disabled={isSaving}
                    onClick={handleSaveOrder}
                    className="mt-6 w-full rounded-2xl bg-primary py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Confirmar Selección'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Personalizar</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="h-8 w-8 rounded-full bg-background text-gray-500 transition-colors hover:bg-gray-200">✕</button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-bold text-gray-400 uppercase">Cantidad</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity(q => Math.max(1, Number(q) - 1).toString())} className="h-10 w-10 rounded-xl bg-background font-bold">-</button>
                    <span className="w-8 text-center font-bold">{quantity}</span>
                    <button onClick={() => setQuantity(q => (Number(q) + 1).toString())} className="h-10 w-10 rounded-xl bg-background font-bold">+</button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-bold text-gray-400 uppercase">Observación</label>
                  <input
                    type="text"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Ej. Sin cebolla"
                    className="w-full rounded-xl bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {ingredientSelections.length > 0 && (
                <div>
                  <label className="mb-3 block text-xs font-bold text-gray-400 uppercase">Ingredientes incluidos</label>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                    {ingredientSelections.map((i) => (
                      <div key={i.nombre} className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
                        <span className={`text-sm font-medium ${i.incluido ? 'text-text' : 'text-gray-300 line-through'}`}>{i.nombre}</span>
                        <button
                          onClick={() => handleToggleIngredient(i.nombre)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${i.incluido ? 'bg-success' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${i.incluido ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {ingredientSelections.filter(i => !i.incluido).length > 0 && (
                    <p className="mt-2 text-[11px] text-alert font-bold">
                      Cocina verá: {ingredientSelections.filter(i => !i.incluido).map(i => `sin ${i.nombre.toLowerCase()}`).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-4 w-full rounded-2xl bg-primary px-5 py-4 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Agregar por {selectedProduct ? formatCurrency(selectedProduct.precio * Number(quantity)) : 'Bs 0.00'}
              </button>
            </div>
          </section>
        </div>
      )}

      <FeedbackModal
        open={Boolean(feedback)}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        type={feedback?.type ?? 'info'}
        onClose={() => setFeedback(null)}
      />
    </main>
  );
}
