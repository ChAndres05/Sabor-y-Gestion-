export interface MockIngredient {
  id: number;
  nombre: string;
  incluidoPorDefecto: boolean;
}

/**
 * Ingredientes por defecto para cualquier producto que no tenga 
 * ingredientes definidos en la base de datos (para fines de demostración).
 */
export const DEFAULT_MOCK_INGREDIENTS: MockIngredient[] = [
  { id: 101, nombre: 'Lechuga', incluidoPorDefecto: true },
  { id: 102, nombre: 'Tomate', incluidoPorDefecto: true },
  { id: 103, nombre: 'Pepino', incluidoPorDefecto: true },
  { id: 104, nombre: 'Cebolla', incluidoPorDefecto: false },
  { id: 105, nombre: 'Aceitunas', incluidoPorDefecto: false },
  { id: 106, nombre: 'Queso', incluidoPorDefecto: true },
  { id: 107, nombre: 'Aderezo', incluidoPorDefecto: true },
];

/**
 * Retorna ingredientes mockeados basados en el nombre del producto 
 * para dar más variedad si se desea, o los de por defecto.
 */
export function getMockIngredientsForProduct(productName: string): MockIngredient[] {
  const nameLower = productName.toLowerCase();
  
  if (nameLower.includes('burger') || nameLower.includes('hamburguesa')) {
    return [
      { id: 201, nombre: 'Carne', incluidoPorDefecto: true },
      { id: 202, nombre: 'Queso Cheddar', incluidoPorDefecto: true },
      { id: 203, nombre: 'Tocino', incluidoPorDefecto: true },
      { id: 204, nombre: 'Pepinillos', incluidoPorDefecto: true },
      { id: 205, nombre: 'Cebolla Caramelizada', incluidoPorDefecto: false },
      { id: 206, nombre: 'Mayonesa', incluidoPorDefecto: true },
    ];
  }
  
  if (nameLower.includes('pizza')) {
    return [
      { id: 301, nombre: 'Mozzarella', incluidoPorDefecto: true },
      { id: 302, nombre: 'Pepperoni', incluidoPorDefecto: true },
      { id: 303, nombre: 'Champiñones', incluidoPorDefecto: false },
      { id: 304, nombre: 'Pimentón', incluidoPorDefecto: false },
      { id: 305, nombre: 'Aceitunas Negras', incluidoPorDefecto: true },
    ];
  }

  // Por defecto retornamos la lista de ensalada que el usuario mostró en la imagen
  return [...DEFAULT_MOCK_INGREDIENTS];
}
