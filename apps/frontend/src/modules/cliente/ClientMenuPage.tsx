import { useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import ClientMenuProductCard from './components/ClientMenuProductCard';
import ClientLayout from './components/ClientLayout';
import { menuApi } from '../menu/menu.api';
import type { MenuCategory, MenuProduct } from '../menu/types/menu.types';
import type { ClientNavigationKey } from './types/client-flow.types';

interface ClientMenuPageProps {
  user: AuthUser;
  onLogout: () => void;
  onOpenProductDetail: (productId: number) => void;
  onNavigate: (screen: ClientNavigationKey) => void;
  onBack?: () => void;
}

function mapProductFromBackend(product: any): MenuProduct {
  return {
    id: product.id_producto || product.id,
    categoryId: product.id_categoria || product.categoryId,
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

export default function ClientMenuPage({
  user,
  onLogout,
  onOpenProductDetail,
  onNavigate,
  onBack,
}: ClientMenuPageProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [categoriesData, productsDataRaw] = await Promise.all([
          menuApi.getCategories('', 'activas'),
          menuApi.getProductos(),
        ]);

        const mappedProducts: MenuProduct[] = productsDataRaw.map(mapProductFromBackend);

        setCategories(categoriesData);
        setProducts(mappedProducts);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo cargar el menú'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const category = categories.find((item) => item.id === product.categoryId);
      if (!category) return false;

      const matchesCategory =
        selectedCategoryId === null || product.categoryId === selectedCategoryId;

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        product.nombre.toLowerCase().includes(normalizedSearch) ||
        product.descripcion.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, categories, selectedCategoryId, searchTerm]);

  return (
    <ClientLayout
      user={user}
      active="menu"
      title="Menú"
      subtitle="Explora nuestros platos disponibles y abre el detalle antes de pedir."
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0">
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar plato por nombre o descripción..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                selectedCategoryId === null ? 'bg-primary text-white' : 'bg-white text-text'
              }`}
            >
              Todas
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-primary text-white'
                    : 'bg-white text-text'
                }`}
              >
                {category.nombre}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-subtitle font-bold text-text">Platos</h2>
            <span className="text-[13px] font-medium text-gray-500">
              {filteredProducts.length} resultados
            </span>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-2xl bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando menú...
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">No se pudo cargar el menú</p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">{errorMessage}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <p className="text-[16px] font-semibold text-text">No se encontraron productos</p>
              <p className="mt-2 text-[14px] leading-6 text-gray-500">
                Prueba con otra búsqueda o cambia la categoría.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <ClientMenuProductCard
                  key={product.id}
                  product={product}
                  category={categories.find((category) => category.id === product.categoryId)}
                  onOpenDetail={() => onOpenProductDetail(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
