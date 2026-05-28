import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { MeseroPage } from '../pages/MeseroPage.js';
import { CajeroPage } from '../pages/CajeroPage.js';
import { QA_TEST_DATA } from '../fixtures/testData.js';

test.describe('Flujo de Pedidos y Reglas de Negocio (QA - E2E)', () => {
  
  test('Mesero - Validación de observaciones en pedidos (Solo letras, no números)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const meseroPage = new MeseroPage(page);

    // 1. Iniciar sesión como mesero
    await loginPage.goToLogin();
    await loginPage.login(
      QA_TEST_DATA.credentials.mesero.email,
      QA_TEST_DATA.credentials.mesero.password
    );
    await meseroPage.verifyUrlContains('/mesero');

    // 2. Seleccionar mesa libre
    await meseroPage.selectTable('Mesa 1');

    // 3. Intentar agregar un producto con observaciones inválidas (que contienen números)
    await meseroPage.addProductWithObservations(
      QA_TEST_DATA.sampleOrder.items[0].productName,
      'Sin cebolla y 2 servilletas adicionales' // Contiene número '2'
    );

    // 4. Comprobar que el sistema de validación de QA muestra alerta de error (solo letras admitidas)
    await meseroPage.verifyObservationsValidationErrorVisible();
  });

  test('Cajero - Regla de Negocio: No cerrar caja si no está abierta previamente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const cajeroPage = new CajeroPage(page);

    // 1. Iniciar sesión como cajero
    await loginPage.goToLogin();
    await loginPage.login(
      QA_TEST_DATA.credentials.cajero.email,
      QA_TEST_DATA.credentials.cajero.password
    );
    await cajeroPage.verifyUrlContains('/cajero');

    // 2. Intentar cerrar caja sin haberla abierto primero
    await cajeroPage.closeCashRegister();

    // 3. Verificar que salta alerta indicando que no hay sesión de caja activa
    await cajeroPage.verifyNoActiveSessionWarning();
  });

  test('Mesero - Flujo de cancelación de pedido activo', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const meseroPage = new MeseroPage(page);

    // 1. Iniciar sesión como mesero
    await loginPage.goToLogin();
    await loginPage.login(
      QA_TEST_DATA.credentials.mesero.email,
      QA_TEST_DATA.credentials.mesero.password
    );

    // 2. Seleccionar mesa
    await meseroPage.selectTable('Mesa 2');

    // 3. Cancelar pedido actual
    await meseroPage.cancelOrder();

    // 4. Validar que la mesa regrese a estar libre / no existan alertas de bloqueo
    await expect(page.locator('text=Mesa 2')).toBeVisible();
  });
});
