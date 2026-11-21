import { expect, test } from '@playwright/test';
import { applyFilters, ensureFiltersOpen, listingCount, login, openSearch } from './helpers';

test.describe('Regresiones de la ronda 2', () => {
  test('el borrador del alta se recupera al reabrir', async ({ page }) => {
    await login(page, 'host');
    await page.goto('/anfitrion', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Nueva propiedad/i }).click();
    await page.getByLabel(/Nombre de la propiedad/i).fill('Borrador QA');

    // El borrador se guarda al cambiar; cerramos el alta.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /^Cancelar$/i }).click();
    await page.waitForTimeout(1000);

    const draft = page.getByText(/Borrador guardado/i).first();
    await expect(draft).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole('button', { name: /Continuar/i })
      .first()
      .click();
    await expect(page.getByLabel(/Nombre de la propiedad/i)).toHaveValue('Borrador QA');

    // Limpiamos el borrador para no dejar estado en el navegador.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /^Cancelar$/i }).click();
    await page.waitForTimeout(500);
    const discard = page.getByRole('button', { name: /Descartar/i }).first();
    if (await discard.isVisible().catch(() => false)) await discard.click();
  });

  test('escribir la ciudad y aplicar filtra aunque no se elija la sugerencia', async ({ page }) => {
    await login(page, 'guest');
    await openSearch(page);
    await ensureFiltersOpen(page);
    await page.getByLabel('Buscar ciudad').fill('Bogotá D.C.');
    // Esperamos a que el directorio resuelva la coincidencia, sin elegirla.
    await page
      .getByRole('option', { name: /Bogotá/i })
      .first()
      .waitFor({ timeout: 20_000 });
    await applyFilters(page);

    expect(await listingCount(page)).toBeGreaterThan(0);
    expect(page.url()).toMatch(/ciudad=/);
  });
});
