import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import ClientLayout from '../../components/client/ClientLayout';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory, MenuProduct } from '../menu/types/menu.types';
import { mapProductFromBackend } from '../../shared/mappers/menu.mapper';
import type { ClientNavigationKey } from '../../shared/types/client-flow.types';
import { useCartStore } from '../../store/cartStore';

interface ClientProductDetailPageProps {
  user: AuthUser;
  productId: number;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (screen: ClientNavigationKey) => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

export default function ClientProductDetailPage({
  user,
  productId,
  onBack,
  onLogout,
  onNavigate,
}: ClientProductDetailPageProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Cart-related state
  const [quantity, setQuantity] = useState(1);
  const [customIngredients, setCustomIngredients] = useState<Array<{ nombre: string; incluido: boolean }>>([]);
  const [observation, setObservation] = useState('');
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [categoriesData, productsDataRaw] = await Promise.all([
          menuApi.getCategories('', 'activas'),
          menuApi.getProductos(),
        ]);

        setCategories(categoriesData);
        setProducts(productsDataRaw.map(mapProductFromBackend));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo cargar el detalle del producto'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [products, productId]
  );

  const category = useMemo(
    () => categories.find((item) => item.id === product?.categoryId),
    [categories, product]
  );

  // Initialize customized ingredients once product finishes loading
  useEffect(() => {
    if (product?.ingredientes) {
      setCustomIngredients(
        product.ingredientes.map((ing) => ({
          nombre: ing.nombre,
          incluido: ing.incluidoPorDefecto !== false,
        }))
      );
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productoId: product.id,
      presentacionId: product.presentacionId,
      nombre: product.nombre,
      precioUnitario: product.precio,
      cantidad: quantity,
      observacion: observation.trim(),
      ingredientes: customIngredients,
      imagen: product.imagen,
    });

    setShowAddedFeedback(true);
    setTimeout(() => {
      setShowAddedFeedback(false);
      onBack();
    }, 1500);
  };

  return (
    <ClientLayout
      user={user}
      active="menu"
      title="Detalle del plato"
      subtitle="Personaliza tus ingredientes y agrégalo directamente al carrito."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
      maxWidthClassName="max-w-5xl"
    >
      <div className="h-full overflow-y-auto pr-1 pb-6">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
            Cargando detalle del plato...
          </div>
        ) : errorMessage || !product || !category ? (
          <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-sm">
            <p className="text-[18px] font-bold text-text">No se pudo mostrar el plato</p>
            <p className="mt-2 text-[14px] leading-6 text-gray-500">
              {errorMessage || 'El producto no está disponible en este momento.'}
            </p>

            <button
              type="button"
              onClick={onBack}
              className="mt-5 rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Volver al menú
            </button>
          </div>
        ) : (
          <article className="rounded-[1.75rem] bg-white p-5 md:p-8 shadow-sm relative overflow-hidden">
            {showAddedFeedback && (
              <div className="absolute inset-0 bg-success/95 z-10 flex flex-col items-center justify-center text-white animate-fade-in">
                <span className="text-[48px] mb-2">✨🛒✨</span>
                <p className="text-[20px] font-bold">¡Agregado al carrito!</p>
                <p className="text-[13px] text-white/85 mt-1">Regresando al menú...</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              {/* Product Image Column */}
              <div className="w-full">
                <div className="flex h-64 md:h-96 w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-background md:sticky md:top-0">
                  {product.imagen ? (
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[72px]">🍽️</span>
                  )}
                </div>
              </div>

              {/* Product Info Column */}
              <div className="flex flex-col justify-between h-full">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                    {category.nombre}
                  </p>

                  <h1 className="mt-2 text-[24px] lg:text-[28px] font-bold text-text">{product.nombre}</h1>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[20px] font-bold text-primary">
                      {formatPrice(product.precio)}
                    </span>

                    <span className="text-[14px] font-medium text-gray-500">
                      Tiempo estimado: {product.tiempoPreparacion} min
                    </span>

                    <span
                      className={`text-[14px] font-semibold ${product.disponible && product.activo ? 'text-success' : 'text-alert'
                        }`}
                    >
                      {product.disponible && product.activo ? 'Disponible' : 'No disponible'}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h2 className="text-[16px] font-bold text-text">Descripción</h2>
                    <p className="mt-2 text-[14px] leading-7 text-gray-600">
                      {product.descripcion || 'Sin descripción registrada'}
                    </p>
                  </div>

                  {customIngredients.length > 0 && (
                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <h2 className="text-[16px] font-bold text-text mb-3">Personalizar ingredientes</h2>
                      <div className="grid grid-cols-2 gap-2">
                        {customIngredients.map((ing, idx) => (
                          <label key={idx} className="flex items-center gap-2 rounded-xl border border-gray-100 p-2 bg-background hover:bg-black/5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ing.incluido}
                              onChange={(e) => {
                                const next = [...customIngredients];
                                next[idx].incluido = e.target.checked;
                                setCustomIngredients(next);
                              }}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-[13px] font-medium text-gray-700 select-none">{ing.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <h2 className="text-[16px] font-bold text-text mb-2">Notas especiales</h2>
                    <textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Ej. Sin cebolla, aderezo aparte, bien cocido..."
                      rows={2}
                      className="w-full rounded-2xl border border-gray-200 bg-background p-3 text-[13px] outline-none focus:border-primary focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100">
                  {product.disponible && product.activo ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center rounded-2xl bg-background p-1 border border-gray-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="h-9 w-9 rounded-xl bg-white text-[18px] font-bold flex items-center justify-center hover:bg-gray-100 border border-gray-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 text-[14px] font-bold text-text w-10 text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          className="h-9 w-9 rounded-xl bg-white text-[18px] font-bold flex items-center justify-center hover:bg-gray-100 border border-gray-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 rounded-2xl bg-primary h-12 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <span>Agregar · {formatPrice(product.precio * quantity)}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-alert font-bold py-2">
                      Producto no disponible para pedidos actualmente
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-4 w-full rounded-2xl border border-gray-300 py-3 text-[14px] font-semibold text-text transition-colors hover:bg-black/5 cursor-pointer"
                  >
                    Volver al menú
                  </button>
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
    </ClientLayout>
  );
}
