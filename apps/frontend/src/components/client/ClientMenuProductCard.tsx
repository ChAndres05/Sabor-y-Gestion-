import type { MenuCategory, MenuProduct } from '../../modules/menu/types/menu.types';

interface ClientMenuProductCardProps {
  product: MenuProduct;
  category?: MenuCategory;
  onOpenDetail: () => void;
}

export default function ClientMenuProductCard({ product, category, onOpenDetail }: ClientMenuProductCardProps) {
  return (
    <article 
      onClick={onOpenDetail}
      className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white p-3 shadow-sm transition-all hover:shadow-md active:scale-95"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-background">
          {product.imagen && (product.imagen.startsWith('http') || product.imagen.startsWith('/') || product.imagen.includes('.')) ? (
            <img 
              src={product.imagen} 
              alt={product.nombre} 
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[28px]">🍲</span>';
              }}
            />
          ) : (
            <span className="text-[28px]">{product.imagen || '🍲'}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-[15px] font-bold text-text group-hover:text-primary transition-colors">
            {product.nombre}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-gray-500">
            {category && (
              <>
                <span>{category.nombre}</span>
                <span>·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              Bs {product.precio.toFixed(2)}
            </span>
            <span>·</span>
            <span>{product.tiempoPreparacion} min</span>
          </div>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[18px] leading-none">+</span>
        </div>
      </div>
    </article>
  );
}
