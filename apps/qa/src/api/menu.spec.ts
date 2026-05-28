import { test, expect } from '@playwright/test';
import { QA_TEST_DATA } from '../fixtures/testData.js';

test.describe('API - Validación de Datos en Menú y Categorías (QA - API)', () => {
  const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

  test('Debería retornar todas las categorías del menú correctamente', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/menu/categories`);
    
    // El endpoint debería estar activo y responder de forma exitosa
    expect(response.status()).toBe(200);
    
    const categories = await response.json();
    expect(Array.isArray(categories)).toBeTruthy();
  });

  test('Debería crear una categoría con nombre válido', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/menu/categories`, {
      data: {
        name: 'Platos Criollos',
        description: 'Deliciosa variedad de platos tradicionales criollos.'
      }
    });

    // Debería ser exitoso (201 Created o 200 OK)
    expect([200, 201]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe('Platos Criollos');
  });

  test('Debería rechazar categoría con símbolos prohibidos en nombre (Seguridad e Integridad)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/menu/categories`, {
      data: {
        name: QA_TEST_DATA.menuProducts.invalidSymbols.name,
        description: QA_TEST_DATA.menuProducts.invalidSymbols.description
      }
    });

    // Regla de Negocio: Debe ser rechazado (400 Bad Request) por validación estricta
    expect(response.status()).toBe(400);
    
    const errorBody = await response.json();
    expect(errorBody.error.toLowerCase()).toContain('símbolos');
  });

  test('Debería rechazar nombres "gibberish" / masheos de teclado (Control de Calidad)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/menu/categories`, {
      data: {
        name: QA_TEST_DATA.menuProducts.gibberishName.name,
        description: QA_TEST_DATA.menuProducts.gibberishName.description
      }
    });

    // Regla de Negocio: Rechazo por masheo de teclado detectado
    expect(response.status()).toBe(400);
    
    const errorBody = await response.json();
    expect(errorBody.error.toLowerCase()).toContain('inválido');
  });
});
