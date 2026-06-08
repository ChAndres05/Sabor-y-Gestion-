import { test } from '@playwright/test';

import { abrirPrimeraMesaLibre } from '../flows/mesero.js';
import { abrirCocina } from '../flows/cocinero.js';
import { FuncionEntrega } from '../flows/mesero-2da.js';
// después del login del mesero...



test('Abrir todos los roles', async ({ browser }) => {
  test.setTimeout(0);

  // Cliente
  const clienteContext = await browser.newContext();
  const cliente = await clienteContext.newPage();

  // Mesero
  const meseroContext = await browser.newContext();
  const mesero = await meseroContext.newPage();

  // Cajero
  const cajeroContext = await browser.newContext();
  const cajero = await cajeroContext.newPage();

  // Cocina
  const cocinaContext = await browser.newContext();
  const cocina = await cocinaContext.newPage();

  // Admin
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();

  // ===== CLIENTE =====

  await cliente.goto(
    'https://sabor-y-gestion-frontend.vercel.app'
  );

  await cliente.locator('input').nth(0)
    .fill('cliente01');

  await cliente.locator('input[type="password"]')
    .fill('Test@123');

  await cliente.getByRole('button', {
    name: /iniciar sesión/i
  }).click();

  // ===== CAJERO =====

  await cajero.goto(
    'https://sabor-y-gestion-frontend.vercel.app'
  );

  await cajero.locator('input').nth(0)
    .fill('cajero01');

  await cajero.locator('input[type="password"]')
    .fill('Test@123');

  await cajero.getByRole('button', {
    name: /iniciar sesión/i
  }).click();

  // ===== COCINA =====

  await cocina.goto(
    'https://sabor-y-gestion-frontend.vercel.app'
  );

  await cocina.locator('input').nth(0)
    .fill('cocinero01');

  await cocina.locator('input[type="password"]')
    .fill('Test@123');

  await cocina.getByRole('button', {
    name: /iniciar sesión/i
  }).click();

  // ===== ADMIN =====

  await admin.goto(
    'https://sabor-y-gestion-frontend.vercel.app'
  );

  await admin.locator('input').nth(0)
    .fill('admin01');

  await admin.locator('input[type="password"]')
    .fill('Test@123');

  await admin.getByRole('button', {
    name: /iniciar sesión/i
  }).click();

// ===== MESERO =====

  await mesero.goto(
  'https://sabor-y-gestion-frontend.vercel.app'
  );
  await mesero.locator('input').nth(0)
  .fill('mesero01');
  await mesero.locator('input[type="password"]')
  .fill('Test@123');

  await mesero.getByRole('button', {
  name: /iniciar sesión/i
  }).click();
  
  await mesero.waitForTimeout(5000);

  const mesaSeleccionada = 
   await abrirPrimeraMesaLibre(mesero);

  await cocina.waitForTimeout(5000);

  await abrirCocina(cocina);

  
  await FuncionEntrega(mesero, mesaSeleccionada);

  await mesero.waitForTimeout(5000);


   console.log(
   await mesero.locator('body').textContent()
   );  

  console.log('Cliente:', await cliente.url());
  console.log('Mesero:', await mesero.url());
  console.log('Cajero:', await cajero.url());
  console.log('Cocina:', await cocina.url());
  console.log('Admin:', await admin.url());

  await new Promise(() => {});
});