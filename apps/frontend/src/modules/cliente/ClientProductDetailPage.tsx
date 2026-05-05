import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import ClientLayout from './components/ClientLayout';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory, MenuProduct } from '../menu/types/menu.types';
import type { ClientNavigationKey } from './types/client-flow.types';

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

  return (
    <ClientLayout
      user={user}
      active="menu"
      title="Detalle del plato"
      subtitle="Información lista para conectar con carrito, reserva o pedido futuro."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
      maxWidthClassName="max-w-md"
    >
      <div className="h-full overflow-y-auto pr-1">
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
          <article className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-background">
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

            <div className="mt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                {category.nombre}
              </p>

              <h1 className="mt-2 text-[24px] font-bold text-text">{product.nombre}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[20px] font-bold text-primary">
                  {formatPrice(product.precio)}
                </span>

                <span className="text-[14px] font-medium text-gray-500">
                  Tiempo estimado: {product.tiempoPreparacion} min
                </span>

                <span
                  className={`text-[14px] font-semibold ${
                    product.disponible && product.activo ? 'text-success' : 'text-alert'
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

              <div className="mt-5 rounded-2xl bg-background p-4 text-[13px] leading-5 text-gray-600">
                Flujo preparado: el cliente puede añadir este plato a un carrito, a una reserva o a un pedido cuando backend exponga ese endpoint.
              </div>

              <button
                type="button"
                onClick={onBack}
                className="mt-6 w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Volver al menú
              </button>
            </div>
          </article>
        )}
      </div>
    </ClientLayout>
  );
}
