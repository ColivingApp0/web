import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { DocumentsPage } from './documents-page';

registerLocaleData(localeEsCo);

const PENDING = {
  id: 'd1',
  type: 'IDENTIDAD' as const,
  status: 'PENDIENTE' as const,
  uploadedAt: '2026-10-03T10:00:00Z',
  reviewedAt: null,
  reviewReason: null,
};

const RESOLVED = {
  id: 'd2',
  type: 'CERTIFICADO_ACADEMICO' as const,
  status: 'APROBADO' as const,
  uploadedAt: '2026-10-01T10:00:00Z',
  reviewedAt: '2026-10-02T10:00:00Z',
  reviewReason: null,
};

function setup(query: Record<string, string> = {}) {
  const api = {
    listDocuments: vi.fn().mockResolvedValue([PENDING, RESOLVED]),
    approveDocument: vi.fn().mockResolvedValue(null),
    rejectDocument: vi.fn().mockResolvedValue(null),
    requestDocumentCorrection: vi.fn().mockResolvedValue(null),
  };
  TestBed.configureTestingModule({
    imports: [DocumentsPage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api };
}

describe('DocumentsPage', () => {
  it('should list the documents and only offer review on pending ones', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DocumentsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.listDocuments).toHaveBeenCalledWith(null);
    expect(host.textContent).toContain('Identidad');
    expect(host.textContent).toContain('Certificado académico');
    expect(host.textContent).toContain('Pendiente');
    expect(host.textContent).toContain('Este documento ya está resuelto');
    expect(
      Array.from(host.querySelectorAll('button')).filter((b) => b.textContent?.includes('Aprobar'))
        .length,
    ).toBe(1);
  });

  it('should read the status filter from the URL', async () => {
    const { api } = setup({ estado: 'PENDIENTE' });
    TestBed.createComponent(DocumentsPage);
    await vi.waitFor(() => expect(api.listDocuments).toHaveBeenCalledWith('PENDIENTE'));
  });

  it('should approve through the real endpoint and reload', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DocumentsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Aprobar'))!
      .click();

    await vi.waitFor(() => expect(api.approveDocument).toHaveBeenCalledWith('d1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Documento aprobado.'));
    expect(api.listDocuments).toHaveBeenCalledTimes(2);
  });

  it('should demand a reason to reject and send it when provided', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DocumentsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Rechazar')!
      .click();
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Rechazar documento'))!
      .click();
    await fixture.whenStable();
    expect(host.textContent).toContain('Falta completar');
    expect(api.rejectDocument).not.toHaveBeenCalled();

    const area = host.querySelector<HTMLTextAreaElement>('#document-reason')!;
    area.value = '  Documento ilegible  ';
    area.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Rechazar documento'))!
      .click();

    await vi.waitFor(() =>
      expect(api.rejectDocument).toHaveBeenCalledWith('d1', 'Documento ilegible'),
    );
  });

  it('should report the state conflict of an impossible transition', async () => {
    const { api } = setup();
    api.approveDocument.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: {
          code: 'CONFLICT',
          message: 'Document IDENTIDAD is not pending (current status = APROBADO)',
        },
      }),
    );
    const fixture = TestBed.createComponent(DocumentsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Aprobar'))!
      .click();

    await vi.waitFor(() =>
      expect(host.textContent).toContain('La acción no es posible en el estado actual'),
    );
    expect(host.textContent).toContain('is not pending');
  });

  it('should explain a generic internal error without internal detail', async () => {
    const { api } = setup();
    api.approveDocument.mockRejectedValue(
      new HttpErrorResponse({
        status: 500,
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
      }),
    );
    const fixture = TestBed.createComponent(DocumentsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Aprobar'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('error interno (500)'));
  });
});
