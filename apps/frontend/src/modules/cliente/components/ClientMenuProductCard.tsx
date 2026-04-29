import type { MenuCategory, MenuProduct } from '../../menu/types/menu.types';

interface ClientMenuProductCardProps {
  product: MenuProduct;
  category?: MenuCategory;
  onOpenDetail: () => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

export default function ClientMenuProductCard({
  product,
  category,
  onOpenDetail,
}: ClientMenuProductCardProps) {
  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full rounded-[1.5rem] bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-background">
          {product.imagen ? (
            <img
              src={product.imagen}
              alt={product.nombre}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[28px]">🍽️</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-bold text-text">
            {product.nombre}
          </p>

          {category && (
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
              {category.nombre}
            </p>
          )}

          <p className="mt-2 line-clamp-2 text-[14px] leading-5 text-gray-600">
            {product.descripcion || 'Sin descripción registrada'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[16px] font-bold text-primary">
              {formatPrice(product.precio)}
            </span>

            <span className="text-[13px] font-medium text-gray-500">
              {product.tiempoPreparacion} min
            </span>

            <span
              className={`text-[13px] font-semibold ${
                product.activo ? 'text-success' : 'text-alert'
              }`}
            >
              {product.activo ? 'Disponible' : 'No disponible'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}