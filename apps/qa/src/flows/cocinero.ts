import { Page } from '@playwright/test';

export async function abrirCocina(page: Page) {

  await page.waitForTimeout(5000);

  console.log('🍳 Entrando a cocina');

  const circulos = page.locator(
    'div.rounded-full.border-2'
  );

  console.log(
    'Pedidos encontrados:',
    await circulos.count()
  );

  // PASO 1
  // Marcar PREPARANDO

  const total = await circulos.count();

  for (let i = 0; i < total; i++) {

    await circulos.nth(i).click();

    console.log(
      `✅ Pedido ${i + 1} marcado PREPARANDO`
    );

    await page.waitForTimeout(3000);
  }

  await page.waitForTimeout(5000);

  // PASO 2
  // Activar switches

  const switches = page.locator(
    'button.w-\\[46px\\].h-\\[24px\\]'
  );

  console.log(
    'Switches:',
    await switches.count()
  );

  const totalSwitches = await switches.count();

  for (let i = 0; i < totalSwitches; i++) {

    await switches.nth(i).click();

    console.log(
      `✅ Switch ${i + 1} activado`
    );

    await page.waitForTimeout(3000);
  }

  await page.waitForTimeout(5000);

  // PASO 3
  // Completar pedidos

  while (
    await page.getByRole('button', {
      name: 'LISTO'
    }).count() > 0
  ) {

    const boton = page.getByRole('button', {
      name: 'LISTO'
    }).first();

    console.log(
      'LISTO habilitado:',
      await boton.isEnabled()
    );

    if (!await boton.isEnabled()) {
      break;
    }

    await boton.click();

    console.log(
      '✅ Pedido completado'
    );

    await page.waitForTimeout(5000);

    console.log(
      'LISTO restantes:',
      await page.getByRole('button', {
        name: 'LISTO'
      }).count()
    );
  }

  console.log('🏁 Cocina terminada');
}