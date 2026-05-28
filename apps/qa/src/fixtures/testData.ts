/**
 * Test Data and Mock Credentials for Sabor y Gestión QA Testing
 */
export const QA_TEST_DATA = {
  // Mock credentials for each system role
  credentials: {
    admin: {
      email: 'admin@saborygestion.com',
      password: 'Password123!',
      name: 'Admin Principal'
    },
    mesero: {
      email: 'mesero@saborygestion.com',
      password: 'Password123!',
      name: 'Juan Mesero'
    },
    cajero: {
      email: 'cajero@saborygestion.com',
      password: 'Password123!',
      name: 'Maria Cajera'
    },
    cocina: {
      email: 'cocinero@saborygestion.com',
      password: 'Password123!',
      name: 'Chef Carlos'
    },
    invalid: {
      email: 'hacker@saborygestion.com',
      password: 'wrongpassword',
    }
  },

  // Mock restaurant configuration
  tables: [
    { id: 1, name: 'Mesa 1', capacity: 4 },
    { id: 2, name: 'Mesa 2', capacity: 2 },
    { id: 3, name: 'Mesa 3', capacity: 6 }
  ],

  // Mock menu products for QA testing
  menuProducts: {
    valid: {
      name: 'Lomo Saltado Premium',
      description: 'Delicioso lomo saltado con carne premium, cebolla, tomate y papas fritas crujientes.',
      price: 15.50,
      categoryId: 1 // Platos Fuertes
    },
    invalidSymbols: {
      name: 'Lomo Saltado @#$%',
      description: 'Descripción inválida con caracteres @#$%',
      price: -5.00
    },
    gibberishName: {
      name: 'asdfghjklqwerty',
      description: 'asd fgh jkl qwe rty',
      price: 10.00
    }
  },

  // Sample order for waiters
  sampleOrder: {
    table: 'Mesa 1',
    items: [
      { productName: 'Lomo Saltado', quantity: 2, observations: 'Término medio, sin cebolla' },
      { productName: 'Inca Kola 1L', quantity: 1, observations: 'Helada' }
    ]
  }
};
