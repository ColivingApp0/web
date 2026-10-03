import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminApi } from '../data-access/admin-api';
import { AdminDashboardPage } from './admin-dashboard-page';

registerLocaleData(localeEsCo);

function setup(metrics: unknown = null) {
  const api = {
    metrics: vi.fn().mockResolvedValue(
      metrics ?? {
        totalCases: 2,
        openCases: 0,
        inReviewCases: 0,
        resolvedCases: 1,
        rejectedCases: 1,
        averageResolutionHours: 1.21,
        openPublicationReports: 0,
      },
    ),
  };
  TestBed.configureTestingModule({
    imports: [AdminDashboardPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api };
}

describe('AdminDashboardPage', () => {
  it('should show the real queue indicators and the admin surfaces', async () => {
    setup();
    const fixture = TestBed.createComponent(AdminDashboardPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const text = host.textContent ?? '';

    expect(text).toContain('Administración');
    expect(text).toContain('Indicadores de la cola de casos');
    expect(text).toContain('1,21 h');
    expect(text).toContain('Casos y disputas');
    expect(text).toContain('Verificación de documentos');
    expect(text).toContain('Moderación de publicaciones');
    expect(text).toContain('Catálogos');
    expect(text).toContain('Reglas de beneficio');
    expect(host.querySelectorAll('a[href^="/admin/"]').length).toBe(5);
  });

  it('should explain the missing average when no case is closed yet', async () => {
    setup({
      totalCases: 1,
      openCases: 1,
      inReviewCases: 0,
      resolvedCases: 0,
      rejectedCases: 0,
      averageResolutionHours: null,
      openPublicationReports: 0,
    });
    const fixture = TestBed.createComponent(AdminDashboardPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Sin casos cerrados todavía',
    );
  });

  it('should surface a server failure with a retry', async () => {
    const { api } = setup();
    api.metrics.mockRejectedValue(
      new HttpErrorResponse({ status: 500, error: { error: 'Internal Server Error' } }),
    );
    const fixture = TestBed.createComponent(AdminDashboardPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(host.textContent).toContain('Error inesperado'));
    expect(
      Array.from(host.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Reintentar'),
      ),
    ).toBe(true);
  });
});
