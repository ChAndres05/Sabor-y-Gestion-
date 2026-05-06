import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import type { AuthUser } from '../auth/types/auth.types';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory, MenuProduct } from '../menu/types/menu.types';
import { clientFlowApi } from '../../shared/api/client-flow.api';
import type { ClientOrderItem, ClientReservation } from '../../shared/types/client-flow.types';
import { getMockIngredientsForProduct } from '../../shared/mocks/menu-ingredients.mock';

type FlowStep = 'cliente' | 'menu' | 'pedido';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

interface BackendProduct {
  id?: number;
  id_producto?: number;
  categoryId?: number;
  id_categoria?: number;
  nombre: string;
  descripcion?: string;
  precio?: string | number;
  tiempo_preparacion?: string | number;
  tiempoPreparacion?: string | number;
  imagen_url?: string;
  imagen?: string;
  activo?: boolean;
  disponible?: boolean;
}

function mapProductFromBackend(product: BackendProduct): MenuProduct {
  return {
    id: Number(product.id_producto || product.id || 0),
    categoryId: Number(product.id_categoria || product.categoryId || 0),
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    precio: Number(product.precio) || 0,
    tiempoPreparacion:
      Number(product.tiempo_preparacion) || Number(product.tiempoPreparacion) || 0,
    imagen: product.imagen_url || product.imagen || null,
    activo: product.activo ?? true,
    disponible: product.disponible ?? true,
  };
}

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
    case 1:
      return '🥗';
    case 2:
      return '🍽️';
    case 3:
      return '🥤';
    case 4:
      return '🍰';
    default:
      return '🍴';
  }
}

export default function ClientReservationOrderPage({
  user,
  reservationId,
  onBack,
  onNavigateToOrders,
}: ClientReservationOrderPageProps) {
  const [activeStep, setActiveStep] = useState<FlowStep>('cliente');
  const [reservation, setReservation] = useState<ClientReservation | null>(null);
  
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [allProducts, setAllProducts] = useState<MenuProduct[]>([]);
  
  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  // Client Order Ingredient matches the API needs: { name: string, included: boolean }
  const [ingredientSelections, setIngredientSelections] = useState<{ name: string; included: boolean }[]>([]);

  // Cart state
  const [cartItems, setCartItems] = useState<ClientOrderItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      try {
        const [categoriesData, reservationsData] = await Promise.all([
          menuApi.getCategories('', 'activas'),
          clientFlowApi.listReservations(user.id),
        ]);

        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setSelectedCategoryId(categoriesData[0].id);
        }

        const currentReservation = reservationsData.find((r: ClientReservation) => r.id === reservationId);
        if (currentReservation) {
          setReservation(currentReservation);
        } else {
          throw new Error('No se encontró la reserva indicada.');
        }

      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'Error de carga',
          message: error instanceof Error ? error.message : 'No se pudo inicializar la página.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void loadPage();
  }, [user.id, reservationId]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedCategoryId) return;
      try {
        const rawProducts: BackendProduct[] = await menuApi.getProductos();
        const mappedProducts = rawProducts.map(mapProductFromBackend);
        setAllProducts(mappedProducts);
        const filtered = mappedProducts.filter((p: MenuProduct) => p.categoryId === selectedCategoryId && p.activo && p.disponible);
        setProducts(filtered);
        
        // Auto-select first product of category if modal is open
        if (isItemModalOpen && filtered.length > 0) {
          setSelectedProductId(filtered[0].id);
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'Error al cargar menú',
          message: error instanceof Error ? error.message : 'No se pudieron cargar los platos.',
        });
      }
    };
    void loadProducts();
  }, [selectedCategoryId, isItemModalOpen]);

  const selectedProduct = useMemo(() => {
    return allProducts.find(p => p.id === selectedProductId) || null;
  }, [allProducts, selectedProductId]);

  useEffect(() => {
    if (isItemModalOpen && selectedProduct) {
      setIngredientSelections(buildDefaultIngredients(selectedProduct));
    }
  }, [selectedProductId, isItemModalOpen, selectedProduct]);

  const cartSubtotal = useMemo(() => cartItems.reduce((acc, item) => acc + item.subtotal, 0), [cartItems]);

  const buildDefaultIngredients = (product: MenuProduct | null) => {
    if (!product) return [];
    
    // Obtenemos los ingredientes del mock compartido para asegurar consistencia
    const mockIngredients = getMockIngredientsForProduct(product.nombre);
    
    return mockIngredients.map(i => ({
      name: i.nombre,
      included: i.incluidoPorDefecto
    }));
  };



  const openProductModal = (product: MenuProduct) => {
    setSelectedCategoryId(product.categoryId);
    setSelectedProductId(product.id);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(product));
    setIsItemModalOpen(true);
  };

  const handleToggleIngredient = (name: string) => {
    setIngredientSelections(prev => prev.map(i => i.name === name ? { ...i, included: !i.included } : i));
  };

  const hasCustomIngredients = ingredientSelections.some(i => i.included === false); // In this mock, default is usually true
  const removedFromSelection = ingredientSelections.filter(i => !i.included);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const qty = Number(quantity);
    if (qty <= 0) return;

    const newItem: ClientOrderItem = {
      id: Date.now(), // ID temporal para el carrito local
      name: selectedProduct.nombre,
      quantity: qty,
      unitPrice: selectedProduct.precio,
      subtotal: selectedProduct.precio * qty,
      notes: observation,
      ingredients: ingredientSelections,
    };

    setCartItems(current => [...current, newItem]);
    setIsItemModalOpen(false);
    
    setFeedback({
      type: 'success',
      title: 'Plato agregado',
      message: `${qty} x ${selectedProduct.nombre} agregado al pedido.`,
    });
  };

  const handleRemoveFromCart = (itemId: number) => {
    setCartItems(current => current.filter(i => i.id !== itemId));
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await clientFlowApi.createPreparedReservationOrder({
        userId: user.id,
        reservationId: reservationId,
        items: cartItems,
        notes: 'Pedido gestionado desde el flujo avanzado de cliente.',
      });
      
      setFeedback({
        type: 'success',
        title: 'Pedido enviado',
        message: 'El pedido ha sido enlazado a tu reserva y se preparará para esa hora.',
      });
      
      // Wait a moment and navigate to orders
      setTimeout(() => {
        onNavigateToOrders();
      }, 2000);
      
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error al enviar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
          <p className="text-gray-500">Cargando flujo de pedido...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white px-4 py-2 text-[12px] font-bold text-primary shadow-sm"
          >
            Mis reservas
          </button>
        </div>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Gestionar reserva</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            {reservation ? `Mesa ${reservation.tableNumber} · ${reservation.date} ${reservation.time} · ${user.nombre}` : ''}
          </p>
        </header>

        <div className="mb-4 rounded-2xl bg-white/60 p-1 shadow-sm md:w-max">
          <div className="grid grid-cols-3 gap-1 md:flex md:gap-2">
            {(['cliente', 'menu', 'pedido'] as const).map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(step)}
                className={`rounded-xl px-3 py-2 text-[12px] font-bold capitalize transition-colors md:px-6 ${
                  activeStep === step
                    ? 'bg-white text-text shadow-sm'
                    : 'text-gray-500 hover:bg-white/60'
                }`}
              >
                {step === 'menu' ? 'Menú' : step === 'pedido' ? `Mi Pedido (${cartItems.length})` : step}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 'cliente' && (
          <section className="rounded-[1.5rem] bg-white p-5 shadow-sm md:max-w-xl">
            <h2 className="text-[20px] font-bold text-text">Mis Datos</h2>
            <p className="mt-1 text-[13px] leading-5 text-gray-500">
              Datos verificados automáticamente para esta reserva.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-background p-4">
                <p className="text-[14px] font-bold text-text">{user.nombre} {user.apellido}</p>
                <p className="text-[13px] text-gray-500">{user.correo}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStep('menu')}
                className="w-full rounded-xl bg-primary px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Comenzar pedido
              </button>
            </div>
          </section>
        )}

        {activeStep === 'menu' && (
          <section className="space-y-4">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
              <h2 className="text-[20px] font-bold text-text">Categorías</h2>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`shrink-0 rounded-xl px-4 py-3 text-[12px] font-bold ${
                      selectedCategoryId === category.id
                        ? 'bg-primary text-white'
                        : 'bg-background text-text hover:bg-black/5'
                    }`}
                  >
                    {category.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.length === 0 && (
                <p className="text-[14px] text-gray-500 p-4">No hay productos en esta categoría.</p>
              )}
              {products.map((product) => (
                <article key={product.id} className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-[48px_1fr_auto] gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-[22px] overflow-hidden">
                      {product.imagen && (product.imagen.startsWith('http') || product.imagen.startsWith('/') || product.imagen.includes('.')) ? (
                        <img src={product.imagen} alt={product.nombre} className="h-full w-full object-cover" />
                      ) : (
                        getItemIcon(product.categoryId)
                      )}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-text">{product.nombre}</h3>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-gray-500">{product.descripcion}</p>
                      <p className="mt-1 text-[12px] font-bold text-primary">
                        {formatCurrency(product.precio)} · {product.tiempoPreparacion} min
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProductModal(product)}
                      className="self-start rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-white hover:bg-primary-hover"
                    >
                      + Agregar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeStep === 'pedido' && (
          <section className="space-y-4">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
              <h2 className="text-[20px] font-bold text-text">Mi Pedido</h2>
              
              {cartItems.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-background p-6 text-center">
                  <p className="text-[14px] text-gray-500">Aún no has agregado platos a tu reserva.</p>
                  <button
                    type="button"
                    onClick={() => setActiveStep('menu')}
                    className="mt-4 rounded-xl border border-primary px-5 py-2 text-[13px] font-bold text-primary hover:bg-primary/5"
                  >
                    Ir al Menú
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-2xl bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-bold text-text">{item.quantity} x {item.name}</p>
                          {(item.ingredients ?? []).some(i => !i.included) && (
                            <p className="text-[12px] text-alert">
                              Sin: {(item.ingredients ?? []).filter(i => !i.included).map(i => i.name).join(', ')}
                            </p>
                          )}
                          {item.notes && <p className="text-[12px] italic text-gray-500">"{item.notes}"</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-bold text-primary">{formatCurrency(item.subtotal)}</p>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="mt-1 text-[12px] font-bold text-alert hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-[16px] font-bold text-text">Total</span>
                    <span className="text-[20px] font-bold text-primary">{formatCurrency(cartSubtotal)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSubmitOrder()}
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-2xl bg-primary px-5 py-4 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {isSubmitting ? 'Enviando...' : 'Confirmar Pedido a Cocina'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-[390px] bg-white rounded-[1.5rem] p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-[20px] font-bold">Nuevo pedido</h2>
                <p className="text-[13px] text-gray-500">Agrega producto, cantidad, observaciones e ingredientes.</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="h-8 w-8 bg-text text-white rounded-full flex items-center justify-center font-bold">×</button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold">Categoría</label>
                <select 
                  value={selectedCategoryId} 
                  onChange={e => setSelectedCategoryId(Number(e.target.value))} 
                  className="rounded-xl border border-gray-300 p-3 text-[14px]"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold">Producto</label>
                <select 
                  value={selectedProductId} 
                  onChange={e => setSelectedProductId(Number(e.target.value))} 
                  className="rounded-xl border border-gray-300 p-3 text-[14px]"
                >
                  {allProducts.filter(p => p.categoryId === selectedCategoryId).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-bold">Observación</label>
                  <input 
                    type="text" 
                    value={observation} 
                    onChange={e => setObservation(e.target.value)} 
                    placeholder="Ej. Sin locoto" 
                    className="rounded-xl border border-gray-300 p-3 text-[14px]" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-bold">Cantidad</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    className="rounded-xl border border-gray-300 p-3 text-center text-[14px]" 
                  />
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
                    <div key={i.name} className="flex justify-between items-center p-3 border-b last:border-b-0 border-gray-200">
                      <span className={`text-[13px] font-bold ${i.included ? 'text-text' : 'text-gray-400 line-through'}`}>{i.name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleToggleIngredient(i.name)} 
                        className={`relative h-6 w-11 rounded-full transition-colors ${i.included ? 'bg-success' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${i.included ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                {removedFromSelection.length > 0 && (
                  <p className="mt-2 text-[11px] text-alert font-bold">
                    Cocina verá: {removedFromSelection.map(i => `sin ${i.name.toLowerCase()}`).join(', ')}
                  </p>
                )}
              </div>

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
