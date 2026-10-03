import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { CatalogsPage } from './catalogs-page';

const CITY = {
  id: 'k1',
  category: 'CIUDAD' as const,
  code: 'MEDELLIN',
  name: 'Medellín',
  description: null,
  parentId: null,
  active: true,
  createdAt: '2026-10-03T10:00:00Z',
  updatedAt: '2026-10-03T10:00:00Z',
};

const INSTITUTION = {
  ...CITY,
  id: 'i1',
  category: 'INSTITUCION' as const,
  code: 'UNAB',
  name: 'UNAB',
};

function setup(query: Record<string, string> = {}) {
  const api = {
    listCatalog: vi
      .fn()
      .mockImplementation((category: string) =>
        Promise.resolve(category === 'INSTITUCION' ? [INSTITUTION] : [CITY]),
      ),
    createCatalogEntry: vi.fn().mockResolvedValue(CITY),
    updateCatalogEntry: vi.fn().mockResolvedValue({ ...CITY, name: 'Medellín (Antioquia)' }),
    deactivateCatalogEntry: vi.fn().mockResolvedValue({ ...CITY, active: false }),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [CatalogsPage],
    providers: [
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api, router };
}

describe('CatalogsPage', () => {
  it('should default to cities, a flat category without parent', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.listCatalog).toHaveBeenCalledWith('CIUDAD', true);
    expect(host.textContent).toContain('MEDELLIN');
    expect(host.querySelector('#catalog-parent')).toBeNull();
    expect(host.textContent).toContain('Activa');
  });

  it('should ask for the parent of a hierarchical category', async () => {
    const { api } = setup({ categoria: 'FACULTAD' });
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(api.listCatalog).toHaveBeenCalledWith('INSTITUCION', true));
    await vi.waitFor(() => expect(host.querySelector('#catalog-parent')).not.toBeNull());
    const parent = host.querySelector<HTMLSelectElement>('#catalog-parent')!;
    expect(Array.from(parent.querySelectorAll('option')).length).toBe(2);

    const code = host.querySelector<HTMLInputElement>('#catalog-code')!;
    code.value = 'ingenieria';
    code.dispatchEvent(new Event('input'));
    const name = host.querySelector<HTMLInputElement>('#catalog-name')!;
    name.value = 'Ingeniería';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear entrada'))!
      .click();
    await fixture.whenStable();

    expect(host.textContent).toContain('como padre');
    expect(api.createCatalogEntry).not.toHaveBeenCalled();
  });

  it('should create an entry with the real body and report duplicate codes', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const fill = (selector: string, value: string) => {
      const control = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      control.value = value;
      control.dispatchEvent(new Event('input'));
    };
    fill('#catalog-code', 'bogota');
    fill('#catalog-name', 'Bogotá');
    fill('#catalog-description', 'Capital');
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear entrada'))!
      .click();

    await vi.waitFor(() =>
      expect(api.createCatalogEntry).toHaveBeenCalledWith('CIUDAD', {
        code: 'bogota',
        name: 'Bogotá',
        description: 'Capital',
        parentId: null,
      }),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('creada en Ciudades'));

    api.createCatalogEntry.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'A CIUDAD entry with that code already exists' },
      }),
    );
    fill('#catalog-code', 'medellin');
    fill('#catalog-name', 'Medellín otra vez');
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear entrada'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('already exists'));
  });

  it('should surface the real field errors of the server on create', async () => {
    const { api } = setup();
    api.createCatalogEntry.mockRejectedValue(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          fieldErrors: { parentId: 'parentId is required for hierarchical categories' },
        },
      }),
    );
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const fill = (selector: string, value: string) => {
      const control = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      control.value = value;
      control.dispatchEvent(new Event('input'));
    };
    fill('#catalog-code', 'medellin');
    fill('#catalog-name', 'Medellín');
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear entrada'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('VALIDATION_ERROR'));
    expect(host.textContent).toContain('parentId');
    expect(host.textContent).toContain('is required for hierarchical categories');
  });

  it('should require confirmation before deactivating an entry', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Desactivar')!
      .click();
    await fixture.whenStable();

    expect(api.deactivateCatalogEntry).not.toHaveBeenCalled();
    expect(host.textContent).toContain('¿Desactivar «Medellín»?');

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Confirmar desactivación'))!
      .click();

    await vi.waitFor(() => expect(api.deactivateCatalogEntry).toHaveBeenCalledWith('CIUDAD', 'k1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Entrada desactivada'));
    expect(api.listCatalog).toHaveBeenCalledTimes(2);
  });

  it('should switch category through the URL', async () => {
    const { router } = setup();
    const fixture = TestBed.createComponent(CatalogsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const select = host.querySelector<HTMLSelectElement>('#catalog-category')!;
    select.value = 'SERVICIO';
    select.dispatchEvent(new Event('change'));

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { categoria: 'SERVICIO' } }),
    );
  });
});
