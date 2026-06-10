import { getMockIngredientsForProduct } from './menu-ingredients.mock';

export interface CocinaIngredient {
  nombre: string;
  incluido: boolean;
}

const LOCAL_STORAGE_KEY = 'gestionysabor_kitchen_ingredients';

/**
 * Saves the selected ingredients for a kitchen item to localStorage.
 * This ensures that when a waiter or client creates/updates an order,
 * the kitchen monitor can read the exact choices.
 */
export function saveIngredientsForKitchenItem(itemId: number, ingredients: CocinaIngredient[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    data[itemId] = ingredients;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving kitchen ingredients:', e);
  }
}

/**
 * Retrieves the ingredients for a kitchen item.
 * If there are no saved ingredients in localStorage, it falls back to
 * default mock ingredients for the product, with a simulated exclusion
 * on even-numbered item IDs to show a realistic kitchen monitor view.
 */
export function getIngredientsForKitchenItem(itemId: number, productName: string): CocinaIngredient[] {
  if (typeof window !== 'undefined') {
    try {
      const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      if (data[itemId]) {
        return data[itemId] as CocinaIngredient[];
      }
    } catch (e) {
      console.error('Error reading kitchen ingredients:', e);
    }
  }

  // Fallback to default mock ingredients based on product name
  const baseIngredients = getMockIngredientsForProduct(productName);
  
  // For demonstration/mock purposes in the kitchen view,
  // we simulate a custom exclusion for even item IDs
  const isEven = itemId % 2 === 0;
  return baseIngredients.map((ing) => {
    let incluido = ing.incluidoPorDefecto;
    // Exclude certain ingredients for even IDs to simulate custom orders
    if (isEven && (
      ing.nombre.toLowerCase().includes('cebolla') || 
      ing.nombre.toLowerCase().includes('pepinillo') || 
      ing.nombre.toLowerCase().includes('champiñon')
    )) {
      incluido = false;
    }
    return {
      nombre: ing.nombre,
      incluido
    };
  });
}
