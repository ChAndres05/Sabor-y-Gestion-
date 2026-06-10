import { Page } from '@playwright/test';

export async function abrirPrimeraMesaLibre(page: Page) {

  console.log('🚀 Entrando');

  await page.waitForTimeout(3000);

  // Filtrar solo disponibles
  await page.locator('input[type="checkbox"]').check();

  console.log('✅ Filtro aplicado');

  await page.waitForTimeout(3000);

  const opciones = page.locator('button:has-text("⋮")');

  console.log(
    'Botones ⋮ encontrados:',
    await opciones.count()
  );
  const mesaSeleccionada =
   (await page
      .getByText(/Mesa\s+\d+/i)
      .first()
      .textContent()) || 'Mesa desconocida';

  console.log(
    'Mesa seleccionada:',
    mesaSeleccionada
  );

  await opciones.first().click();

  console.log('✅ Menú abierto');

  await page.waitForTimeout(5000);

  await page.getByText('Gestionar pedido').click();

  console.log('✅ Gestionar pedido');

  await page.waitForTimeout(5000);

  // CI
  await page
    .locator('input[placeholder="Ej. 5678123"]')
    .fill('5000005');

  console.log('✅ CI ingresado');

  await page.waitForTimeout(1000);

  // Buscar
  await page.getByRole('button', {
    name: 'Buscar'
  }).click();

  console.log('✅ Cliente buscado');

  await page.waitForTimeout(1000);

  // Abrir pedido
  await page.getByRole('button', {
    name: 'Abrir pedido'
  }).click();

  console.log('✅ Pedido abierto');

  await page.waitForTimeout(5000);

  await page.getByRole('button', {
    name: 'confirmar'
  }).click();

  await page.waitForTimeout(5000);

  console.log('entrar a pedido');

  await page.getByRole('button', {
    name: 'Hamburguesas'
  }).click();

  console.log('seccion hamburguesa');

  const agregar = page.locator('button:has-text("+ Agregar")');

  console.log(
    'Botones agregar:',
    await agregar.count()
  );

  await agregar.first().click();

  console.log('✅ Producto agregado');

  await page.waitForTimeout(5000);

  console.log('agregar');

  await page.waitForTimeout(3000);

  const cantidad = page.locator('input[type="number"]');

  await cantidad.clear();

  await page.waitForTimeout(2000);

  await cantidad.fill('2');

  console.log('✅ Cantidad = 2');

  await page.waitForTimeout(5000);

  await page.getByRole('button', {
    name: 'Crear'
  }).click();

  await page.waitForTimeout(5000);

  console.log('crear pedido');

  await page.waitForTimeout(5000);

  await page.getByRole('button', {
    name: 'confirmar'
  }).click();

  await page.waitForTimeout(5000);

  console.log('confirmar a pedido');

  await page.getByRole('button', {
    name: 'Enviar a cocina'
  }).click();

  await page.waitForTimeout(5000);

  console.log('envio cocina');

  await page.getByRole('button', {
    name: 'confirmar'
  }).click();

  await page.waitForTimeout(5000);

  console.log('confirmar a pedido');

  await page.getByRole('button', {
    name: /volver a mesas/i
  }).click();

  await page.locator('button')
    .filter({
      hasText: '☰'
    })
    .first()
    .click();

  await page.getByRole('button', {
    name: 'Gestionar pedidos'
  }).click();

  await page.waitForTimeout(5000);

  console.log('envio pedidos');
  return mesaSeleccionada;
}