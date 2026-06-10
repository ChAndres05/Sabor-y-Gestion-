import { test } from '@playwright/test';

test('Probar flujo cocina', async ({ browser }) => {
  test.setTimeout(0);

  const cocineroContext = await browser.newContext();
  const cocinero = await cocineroContext.newPage();

  console.log('🔐 Iniciando sesión como cocinero...');

  await cocinero.goto(
    'https://sabor-y-gestion-frontend.vercel.app'
  );

  await cocinero.locator('input').nth(0)
    .fill('cocinero01');

  await cocinero.locator('input[type="password"]')
    .fill('Test@123');

  await cocinero.getByRole('button', {
    name: /iniciar sesión/i
  }).click();

  await cocinero.waitForLoadState('networkidle');
  await cocinero.waitForTimeout(5000);

  console.log('🍳 Entrando a cocina');

  const circulos = cocinero.locator(
    'div.rounded-full.border-2'
  );

  console.log(
    'Pedidos encontrados:',
    await circulos.count()
  );

  // PASO 1
  // Marcar todos como PREPARANDO

  const total = await circulos.count();

  for (let i = 0; i < total; i++) {

    await circulos.nth(i).click();

    console.log(
      `✅ Pedido ${i + 1} marcado PREPARANDO`
    );

    await cocinero.waitForTimeout(3000);
  }

  await cocinero.waitForTimeout(5000);

  // PASO 2
  // Activar switches

  const switches = cocinero.locator(
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

    await cocinero.waitForTimeout(3000);
  }

  await cocinero.waitForTimeout(5000);

  // PASO 3
  // Presionar LISTO

  const listos = cocinero.getByRole('button', {
    name: 'LISTO'
    });

    console.log(
        'Botones LISTO:',
        await listos.count()
    );

    while (
    await listos.count() > 0
    ) {

    const boton = listos.first();

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

    await cocinero.waitForTimeout(5000);

    console.log(
        'LISTO restantes:',
        await listos.count()
    );
    }

  console.log('🏁 Fin prueba cocina');

  await cocinero.waitForTimeout(10000);
});