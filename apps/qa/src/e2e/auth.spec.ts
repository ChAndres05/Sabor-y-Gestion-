import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { QA_TEST_DATA } from '../fixtures/testData.js';

test.describe('Autenticación y Autorización (QA - E2E)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goToLogin();
  });

  test('Debería denegar el acceso con credenciales inválidas', async () => {
    await loginPage.login(
      QA_TEST_DATA.credentials.invalid.email,
      QA_TEST_DATA.credentials.invalid.password
    );
    
    const errorMsg = await loginPage.getErrorMessageText();
    expect(errorMsg.toLowerCase()).toContain('inválid');
  });

  test('Debería iniciar sesión y redirigir correctamente a un Mesero', async () => {
    await loginPage.login(
      QA_TEST_DATA.credentials.mesero.email,
      QA_TEST_DATA.credentials.mesero.password
    );

    // Verifica redirección correcta al panel de mesero
    await loginPage.verifyUrlContains('/mesero');
  });

  test('Debería iniciar sesión y redirigir correctamente a un Cajero', async () => {
    await loginPage.login(
      QA_TEST_DATA.credentials.cajero.email,
      QA_TEST_DATA.credentials.cajero.password
    );

    // Verifica redirección correcta al panel de cajero
    await loginPage.verifyUrlContains('/cajero');
  });

  test('Debería permitir cerrar sesión correctamente', async () => {
    await loginPage.login(
      QA_TEST_DATA.credentials.mesero.email,
      QA_TEST_DATA.credentials.mesero.password
    );
    await loginPage.verifyUrlContains('/mesero');

    // Ejecuta el cierre de sesión
    await loginPage.logout();
    await loginPage.verifyUrlContains('/login');
  });
});
