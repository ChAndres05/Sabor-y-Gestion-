import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemIngredient {
  nombre: string;
  incluido: boolean;
}

export interface CartItem {
  id: string; // unique item key
  productoId: number;
  presentacionId?: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  observacion: string;
  ingredientes: CartItemIngredient[];
  imagen?: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          // Check if item with same product ID, ingredients, and observations already exists
          const existingItemIndex = state.items.findIndex(
            (item) =>
              item.productoId === newItem.productoId &&
              item.observacion === newItem.observacion &&
              JSON.stringify(item.ingredientes) === JSON.stringify(newItem.ingredientes)
          );

          if (existingItemIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].cantidad += newItem.cantidad;
            return { items: updatedItems };
          }

          const id = `${newItem.productoId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return { items: [...state.items, { ...newItem, id }] };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) => (item.id === itemId ? { ...item, cantidad: Math.max(1, quantity) } : item))
            .filter((item) => item.cantidad > 0),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'sabor-gestion-cart', // localStorage key
    }
  )
);
