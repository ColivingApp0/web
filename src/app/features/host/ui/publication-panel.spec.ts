import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HostApi } from '../data-access/host-api';
import { HostPublication } from '../models/host-models';
import { HostPublicationPanel } from './publication-panel';

const publication: HostPublication = {
  id: 'p1',
  unitId: 'u1',
  title: 'Loft centro',
  status: 'BORRADOR',
  services: [],
  applicableRuleCodes: [],
};

function setup() {
  const api = {
    createPublication: vi.fn().mockResolvedValue(publication),
    runPublicationAction: vi.fn().mockResolvedValue({ ...publication, status: 'PUBLICADA' }),
  };
  TestBed.configureTestingModule({
    imports: [HostPublicationPanel],
    providers: [provideRouter([]), { provide: HostApi, useValue: api }],
  });
  return { api };
}

describe('HostPublicationPanel', () => {
  it('should create a publication from the draft form', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostPublicationPanel);
    fixture.componentRef.setInput('unitId', 'u1');
    const created = vi.fn();
    fixture.componentInstance.created.subscribe(created);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const title = host.querySelector<HTMLInputElement>('#host-publication-title')!;
    title.value = 'Loft centro';
    title.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(api.createPublication).toHaveBeenCalledWith('u1', 'Loft centro'));
    await vi.waitFor(() => expect(created).toHaveBeenCalled());
  });

  it('should explain the known limitation when the unit already has a publication', async () => {
    const { api } = setup();
    api.createPublication.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'Unit already has a publication' },
      }),
    );
    const fixture = TestBed.createComponent(HostPublicationPanel);
    fixture.componentRef.setInput('unitId', 'u1');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const title = host.querySelector<HTMLInputElement>('#host-publication-title')!;
    title.value = 'Loft centro';
    title.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(host.textContent).toContain('ya tiene una publicación'));
    expect(host.textContent).toContain('limitación conocida');
  });

  it('should run transitions and emit the updated publication', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostPublicationPanel);
    fixture.componentRef.setInput('unitId', 'u1');
    fixture.componentRef.setInput('publication', publication);
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const publish = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Publicar'),
    )!;
    publish.click();

    await vi.waitFor(() => expect(api.runPublicationAction).toHaveBeenCalledWith('p1', 'publish'));
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
  });

  it('should surface the verification gate with a link when publishing conflicts', async () => {
    const { api } = setup();
    api.runPublicationAction.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'Host identity is not verified; cannot publish' },
      }),
    );
    const fixture = TestBed.createComponent(HostPublicationPanel);
    fixture.componentRef.setInput('unitId', 'u1');
    fixture.componentRef.setInput('publication', publication);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const publish = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Publicar'),
    )!;
    publish.click();

    await vi.waitFor(() => expect(host.textContent).toContain('verificación completa'));
    expect(host.textContent).toContain('Revisar mi verificación');
  });
});
