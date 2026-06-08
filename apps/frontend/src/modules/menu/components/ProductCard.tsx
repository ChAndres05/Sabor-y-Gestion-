import type { MenuCategory, MenuProduct } from '../types/menu.types';

interface ProductCardProps {
  product: MenuProduct;
  category?: MenuCategory;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} Bs`;
}

export function ProductCard({
  product,
  category,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleStatus,
  onDelete,
}: ProductCardProps) {
  return (
    <article className="relative rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm">
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

        <div className="min-w-0 flex-1 pr-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-bold text-text">
                {product.nombre}
              </h3>

              {category && (
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                  {category.nombre}
                </p>
              )}
            </div>
          </div>

          <p className="mt-2 line-clamp-3 text-[14px] leading-5 text-gray-600">
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

      <button
        type="button"
        onClick={onToggleMenu}
        className="absolute right-3 top-3 rounded-full px-2 py-1 text-[20px] leading-none text-text transition-colors hover:bg-black/5"
      >
        ⋮
      </button>

      {menuOpen && (
        <div className="absolute right-3 top-12 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
          <button
            type="button"
            onClick={onEdit}
            className="w-full px-4 py-3 text-left text-[14px] font-medium text-text transition-colors hover:bg-black/5"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={onToggleStatus}
            className="w-full px-4 py-3 text-left text-[14px] font-medium text-text transition-colors hover:bg-black/5"
          >
            {product.activo ? 'Desactivar' : 'Activar'}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="w-full px-4 py-3 text-left text-[14px] font-medium text-alert transition-colors hover:bg-alert/5"
          >
            Eliminar
          </button>
        </div>
      )}
    </article>
  );
}