import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory, MenuProduct } from '../menu/types/menu.types';

interface ClientProductDetailPageProps {
  user: AuthUser;
  productId: number;
  onBack: () => void;
  onLogout: () => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

export default function ClientProductDetailPage({
  user,
  productId,
  onBack,
  onLogout,
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedProducts: MenuProduct[] = productsDataRaw.map((p: any) => ({
          id: p.id_producto || p.id,
          categoryId: p.id_categoria || p.categoryId,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          precio: Number(p.precio) || 0,
          tiempoPreparacion: Number(p.tiempo_preparacion) || 0,
          imagen: p.imagen_url || p.imagen || null,
          activo: p.activo ?? true,
          disponible: p.disponible ?? true,
        }));

        setCategories(categoriesData);
        setProducts(mappedProducts);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el detalle del producto'
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
        <p className="text-content">Cargando detalle del plato...</p>
      </main>
    );
  }

  if (errorMessage || !product || !category) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 text-center shadow-sm">
          <p className="text-[18px] font-bold text-text">
            No se pudo mostrar el plato
          </p>
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
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
        <div className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-[28px] leading-none text-text"
            >
              ←
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl bg-white px-4 py-2 text-[14px] font-semibold text-text shadow-sm transition-colors hover:bg-black/5"
            >
              Salir
            </button>
          </div>

          <p className="mt-4 text-[14px] font-medium text-gray-500">
            Hola, {user.nombre}
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
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

              <h1 className="mt-2 text-[24px] font-bold text-text">
                {product.nombre}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[20px] font-bold text-primary">
                  {formatPrice(product.precio)}
                </span>

                <span className="text-[14px] font-medium text-gray-500">
                  Tiempo de preparación: {product.tiempoPreparacion} min
                </span>

                <span
                  className={`text-[14px] font-semibold ${
                    product.activo ? 'text-success' : 'text-alert'
                  }`}
                >
                  {product.activo ? 'Disponible' : 'No disponible'}
                </span>
              </div>

              <div className="mt-5">
                <h2 className="text-[16px] font-bold text-text">Descripción</h2>
                <p className="mt-2 text-[14px] leading-7 text-gray-600">
                  {product.descripcion || 'Sin descripción registrada'}
                </p>
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
        </div>
      </div>
    </main>
  );
}