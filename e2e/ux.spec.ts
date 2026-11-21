import { expect, test } from '@playwright/test';
import { listingCount, login, openSearch } from './helpers';

test.describe('Estados de error y recuperación', () => {
  test('una ruta inexistente muestra una página 404 real', async ({ page }) => {
    await page.goto('/ruta-que-no-existe', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(
      page.getByText(/404|no encontrada|no existe|no encontramos/i).first(),
    ).toBeVisible();
  });

  test('una habitación inexistente explica el problema y permite volver', async ({ page }) => {
    await login(page, 'guest');
    await page.goto('/alojamientos/no-existe', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/no encontramos|no existe|no disponible|no se pudo/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /Explorar|Volver|buscar/i }).first()).toBeVisible();
  });

  test('recuperación: mensaje genérico sin exponer logs internos', async ({ page }) => {
    await page.goto('/recuperar', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type=email]').waitFor();
    await page.locator('input[type=email]').fill('persona-inexistente@example.com');
    await page.getByRole('button', { name: /Enviar instrucciones/i }).click();
    await expect(
      page.getByText(/revisa tu correo|recibirás las instrucciones/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/logs del servidor|dev-email|token=/i)).toHaveCount(0);
  });
});

test.describe('Descubrimiento', () => {
  test('las tarjetas de la landing llevan a búsquedas filtradas', async ({ page }) => {
    await login(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cardLinks = page.locator('a[href*="/alojamientos?"]');
    expect(await cardLinks.count()).toBeGreaterThan(0);
  });

  test('el directorio permite abrir la búsqueda de una ciudad', async ({ page }) => {
    await login(page, 'guest');
    await page.goto('/directorio', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/Buscar ciudad/i).fill('Bogot');
    const result = page.getByRole('link', { name: /Ver habitaciones/i }).first();
    await expect(result).toBeVisible({ timeout: 20_000 });
    await result.click();
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/\/alojamientos\?.*ciudad=/);
  });
});

test.describe('Móvil', () => {
  test('no hay desbordamiento horizontal y los filtros se pueden aplicar', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo aplica a móvil');
    await login(page, 'guest');
    await openSearch(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBeFalsy();

    await page.getByRole('button', { name: /Filtros/i }).click();
    const apply = page.getByRole('button', { name: /Aplicar filtros/i });
    const box = await apply.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(844);
  });

  test('el catálogo se mantiene usable a 390 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo aplica a móvil');
    await login(page, 'guest');
    await openSearch(page);
    expect(await listingCount(page)).toBeGreaterThan(0);
  });
});
