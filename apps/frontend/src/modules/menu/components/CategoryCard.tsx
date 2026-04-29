import type { MenuCategory } from '../types/menu.types';

interface CategoryCardProps {
  category: MenuCategory;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onViewProducts: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function CategoryCard({
  category,
  menuOpen,
  onToggleMenu,
  onEdit,
  onViewProducts,
  onToggleStatus,
  onDelete,
}: CategoryCardProps) {
  return (
    <div className="relative rounded-[1.5rem] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-text">{category.nombre}</p>

          <p className="mt-1 text-[14px] leading-6 text-gray-500">
            {category.descripcion || 'Sin descripción'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                category.activo
                  ? 'bg-success/10 text-success'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {category.activo ? 'Activa' : 'Inactiva'}
            </span>

            <span className="text-[12px] font-medium text-gray-500">
              {category.totalProductos}{' '}
              {category.totalProductos === 1 ? 'producto' : 'productos'}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            className="rounded-xl px-2 py-1 text-[22px] leading-none text-text transition-colors hover:bg-gray-100"
          >
            ⋮
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 min-w-[190px] rounded-2xl bg-white py-2 shadow-xl">
              <button
                type="button"
                onClick={onEdit}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium text-text transition-colors hover:bg-gray-50"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={onViewProducts}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium text-text transition-colors hover:bg-gray-50"
              >
                Ver productos
              </button>

              <button
                type="button"
                onClick={onToggleStatus}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium text-text transition-colors hover:bg-gray-50"
              >
                {category.activo ? 'Desactivar' : 'Activar'}
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={category.totalProductos > 0}
                className="block w-full px-4 py-3 text-left text-[14px] font-medium text-alert transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Eliminar
              </button>

              {category.totalProductos > 0 && (
                <p className="px-4 pb-2 text-[12px] leading-5 text-gray-400">
                  Solo puedes eliminar categorías sin productos asociados.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}