import { expect, test } from '@playwright/test';
import { login, watchErrors } from './helpers';

test.describe('Alta de propiedad multipaso', () => {
  test('exige ubicación antes de crear y conserva el estado entre pasos', async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, 'host');
    await page.goto('/anfitrion', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Nueva propiedad/i }).click();

    await expect(page.getByRole('heading', { name: /Datos básicos/i })).toBeVisible();
    await page.getByLabel(/Nombre de la propiedad/i).fill('Propiedad de prueba UX');
    await page.getByRole('button', { name: /Continuar/i }).click();

    await expect(page.getByRole('heading', { name: /Ubicación/i })).toBeVisible();
    // Sin ciudad/barrio no debe avanzar ni marcar el paso como completado.
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.getByText(/ciudad/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ubicación/i })).toBeVisible();

    await page.getByLabel('Ciudad', { exact: true }).fill('Bogot');
    const city = page.getByRole('option', { name: /Bogotá/i }).first();
    await city.waitFor({ timeout: 20_000 });
    await city.click();
    await page.getByLabel(/Barrio o zona/i).fill('Chapinero');
    await page.getByRole('button', { name: /Continuar/i }).click();

    await expect(page.getByRole('heading', { name: /Servicios/i })).toBeVisible();
    await page.getByRole('button', { name: /WiFi/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    await expect(page.getByRole('heading', { name: /Revisión/i })).toBeVisible();
    await expect(page.getByText('Bogotá · Chapinero')).toBeVisible();
    await expect(page.getByRole('button', { name: /Crear propiedad/i })).toBeEnabled();
    expect(errors.filter((error) => error.includes('pageerror'))).toEqual([]);
  });

  test('el botón de crear no está disponible si falta la ubicación', async ({ page }) => {
    await login(page, 'host');
    await page.goto('/anfitrion', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Nueva propiedad/i }).click();
    await page.getByLabel(/Nombre de la propiedad/i).fill('Sin ubicación UX');
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.getByRole('heading', { name: /Ubicación/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Crear propiedad/i })).toHaveCount(0);
  });
});

test.describe('Solicitudes recibidas', () => {
  test('aceptar una solicitud pide confirmación con resumen', async ({ page }) => {
    test.skip(process.env.RUN_DESTRUCTIVE !== '1', 'Requiere entorno controlado');
    await login(page, 'host');
    await page.goto('/anfitrion/reservas', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: /^Aceptar$/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/ocupa una plaza/i).first()).toBeVisible();
  });
});
