import { expect, type Page } from '@playwright/test';

export const CREDENTIALS = {
  guest: { email: 'huesped01@colivin.dev', password: 'Guest123!' },
  host: { email: 'ana@colivin.dev', password: 'Host123!' },
  admin: { email: 'admin@coliving.local', password: 'Admin123!' },
} as const;

export type Role = keyof typeof CREDENTIALS;

/** Errores de consola/página que delatan una app rota. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Inicia sesión por la UI y espera a salir de la pantalla de acceso. */
export async function login(page: Page, role: Role = 'guest'): Promise<void> {
  const { email, password } = CREDENTIALS[role];
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=email]').waitFor({ timeout: 20_000 });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: /^Entrar$/ }).click();
  await expect(page).not.toHaveURL(/\/entrar/, { timeout: 15_000 });
  // El guard de roles se evalúa cuando la sesión ya está cargada: esperamos a
  // que la shell autenticada pinte su contenido antes de navegar.
  await page.locator('main h1, main h2').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
}

/** Abre la búsqueda y espera a que termine la carga inicial. */
export async function openSearch(page: Page): Promise<void> {
  await page.goto('/alojamientos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('app-listing-card, h1', { timeout: 20_000 });
  await page.waitForTimeout(800);
}

/** En móvil el panel de filtros está plegado por defecto. */
export async function ensureFiltersOpen(page: Page): Promise<void> {
  const input = page.getByLabel('Buscar ciudad');
  if (!(await input.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Filtros/i }).click();
    await input.waitFor({ timeout: 10_000 });
  }
}

/** Pulsa “Aplicar filtros” solo si sigue visible (la ubicación ya auto-aplica). */
export async function applyFilters(page: Page): Promise<void> {
  const apply = page.getByRole('button', { name: /Aplicar filtros/i });
  if ((await apply.count()) > 0) {
    // La ubicación puede auto-aplicar y cerrar el panel entre la comprobación
    // y el clic; si eso ocurre, el filtro ya está aplicado.
    await apply.click({ timeout: 1500 }).catch(() => undefined);
  }
  await page.waitForTimeout(1200);
}

/** Selecciona una ciudad en el combobox de ubicación. */
export async function selectCity(page: Page, text: string, optionName: RegExp): Promise<void> {
  await ensureFiltersOpen(page);
  const input = page.getByLabel('Buscar ciudad');
  await input.fill(text);
  const option = page.getByRole('option', { name: optionName }).first();
  await option.waitFor({ timeout: 20_000 });
  await option.click();
}

/** Selecciona una universidad en el combobox de ubicación. */
export async function selectUniversity(
  page: Page,
  text: string,
  optionName: RegExp,
): Promise<void> {
  await ensureFiltersOpen(page);
  await page.getByRole('radio', { name: 'Universidad' }).check({ force: true });
  const input = page.getByLabel('Buscar universidad');
  await input.fill(text);
  const option = page.getByRole('option', { name: optionName }).first();
  await option.waitFor({ timeout: 20_000 });
  await option.click();
}

export async function listingCount(page: Page): Promise<number> {
  return page.locator('app-listing-card').count();
}

/** Comprueba que un texto visible no esté partido en varias líneas. */
export async function isSingleLine(page: Page, selector: string): Promise<boolean> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length <= 1;
    });
}
