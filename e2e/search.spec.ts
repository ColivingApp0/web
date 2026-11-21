import { expect, test } from '@playwright/test';
import {
  applyFilters,
  ensureFiltersOpen,
  listingCount,
  login,
  openSearch,
  selectCity,
  selectUniversity,
  watchErrors,
} from './helpers';

test.describe('Descubrimiento y búsqueda', () => {
  test('la landing carga sin errores y ofrece rutas de exploración', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Explorar habitaciones/i }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('login de huésped y búsqueda con ciudad canónica Bogotá D.C.', async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, 'guest');
    await openSearch(page);
    expect(await listingCount(page)).toBeGreaterThan(0);

    await selectCity(page, 'Bogot', /Bogotá D\.C\./i);
    await applyFilters(page);

    expect(await listingCount(page)).toBeGreaterThan(0);
    await expect(page.getByText(/resultados? en Bogotá/i).first()).toBeVisible();
    expect(page.url()).toMatch(/ciudad=/);
    expect(errors.filter((error) => error.includes('pageerror'))).toEqual([]);
  });

  test('búsqueda por universidad resuelve la ciudad y devuelve resultados', async ({ page }) => {
    await login(page, 'guest');
    await openSearch(page);
    await selectUniversity(page, 'Universidad de los Andes', /Universidad de los Andes/i);
    await applyFilters(page);

    expect(await listingCount(page)).toBeGreaterThan(0);
    await expect(
      page
        .getByText(/cerca de universidad de los andes/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    expect(page.url()).toMatch(/universidad=/);
  });

  test('limpiar filtros recupera el catálogo completo', async ({ page }) => {
    await login(page, 'guest');
    await openSearch(page);
    const initial = await listingCount(page);
    await selectCity(page, 'Medell', /Medellín/i);
    await applyFilters(page);
    await ensureFiltersOpen(page);
    await page
      .getByRole('button', { name: /^Limpiar$/i })
      .first()
      .click();
    await page.waitForTimeout(1200);
    expect(await listingCount(page)).toBe(initial);
  });
});

test.describe('Detalle de habitación', () => {
  test('la acción principal está disponible sin recorrer toda la ficha en móvil', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Solo aplica a móvil');
    await login(page, 'guest');
    await openSearch(page);
    await page.locator('app-listing-card a').first().click();
    await page.waitForTimeout(2000);

    const bar = page.getByRole('region', { name: 'Solicitar una plaza' });
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan(400);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  });

  test('los precios y la acción de la tarjeta no se parten en escritorio', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Solo aplica a escritorio');
    await login(page, 'guest');
    await openSearch(page);
    const cards = page.locator('app-listing-card');
    expect(await cards.count()).toBeGreaterThan(0);
    const link = cards.first().getByRole('link', { name: /Ver habitación/i });
    const lines = await link.evaluate((element) => {
      // Contamos líneas del nodo de texto (el icono no debe contar como otra línea).
      const text = [...element.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      const range = document.createRange();
      range.selectNodeContents(text ?? element);
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
    });
    expect(lines).toBeLessThanOrEqual(1);
  });
});
