import { Page } from '@playwright/test';

export async function FuncionEntrega(page: Page , mesaSeleccionada: string) {

  await page.waitForTimeout(5000);

  console.log(' Iniciando entrega');

  // Abrir menú hamburguesa
  await page.locator('button:has-text("☰")')
    .click();

  console.log('Menú abierto');

  await page.waitForTimeout(3000);

  // Ir a Gestión de pedidos
  await page.getByRole('button', {
    name: 'Gestionar pedidos'
  }).click();

  console.log('Gestión de pedidos abierta');

  await page.waitForTimeout(5000);

  console.log(
  'Buscando pedido de:',
    mesaSeleccionada
    );

    const tarjetaMesa = page.locator('div').filter({
    hasText: mesaSeleccionada
    }).first();

    await tarjetaMesa.scrollIntoViewIfNeeded();
        const confirmarEntrega =
    tarjetaMesa.getByRole('button', {
        name: /confirmar entrega/i
    });

    await confirmarEntrega.click();

  await page.waitForTimeout(5000);

  console.log('confirmar entrega del pedido');

   await page.waitForTimeout(5000);

   
  await page.getByRole('button', {
    name: 'confirmar'
  }).click();

  await page.waitForTimeout(5000);

  console.log('confirmar a entrega');


  await page.locator('button:has-text("☰")')
    .click();

  console.log('Menú abierto');

  await page.waitForTimeout(3000);

  // Ir a Gestión de pedidos
  await page.getByRole('button', {
    name: 'Gestionar mesas'
  }).click();

  console.log('Gestión de mesas');

  await page.waitForTimeout(5000);
  
  console.log(
    ' Buscando mesa:',
    mesaSeleccionada
    );

    const tarjeta = page.locator('div').filter({
    hasText: mesaSeleccionada
    }).first();

    await tarjeta.scrollIntoViewIfNeeded();

    const menuMesa = tarjeta.locator(
    'button:has-text("⋮")'
    );

    await menuMesa.click();

    console.log(
    ' Menú abierto para',
    mesaSeleccionada
    );

    await page.waitForTimeout(3000);

    await page.getByText(
    'Gestionar pedido'
    ).click();

    console.log(
    'Gestionando pedido de',
    mesaSeleccionada
    );
    await page.getByRole('button', {
    name: 'Solicitar cuenta'
    }).click();

    await page.waitForTimeout(5000);

    console.log('cuenta solicitada');
}