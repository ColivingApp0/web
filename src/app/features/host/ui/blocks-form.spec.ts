import { TestBed } from '@angular/core/testing';
import { HostApi } from '../data-access/host-api';
import { HostDayAvailability } from '../models/host-models';
import { HostBlocksForm } from './blocks-form';

const days: HostDayAvailability[] = [
  { date: '2026-11-01', state: 'DISPONIBLE', reserved: false },
  { date: '2026-11-02', state: 'BLOQUEADO', reserved: false },
];

function setup() {
  const api = {
    blockDates: vi.fn().mockResolvedValue(days),
    releaseDates: vi.fn().mockResolvedValue(days),
  };
  TestBed.configureTestingModule({
    imports: [HostBlocksForm],
    providers: [{ provide: HostApi, useValue: api }],
  });
  return { api };
}

function setRange(host: HTMLElement, from: string, to: string): void {
  const fromInput = host.querySelector<HTMLInputElement>('#host-blocks-from')!;
  fromInput.value = from;
  fromInput.dispatchEvent(new Event('input'));
  const toInput = host.querySelector<HTMLInputElement>('#host-blocks-to')!;
  toInput.value = to;
  toInput.dispatchEvent(new Event('input'));
}

describe('HostBlocksForm', () => {
  it('should block the selected range and render the resulting days', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostBlocksForm);
    fixture.componentRef.setInput('unitId', 'u1');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    setRange(host, '2026-11-01', '2026-11-05');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.blockDates).toHaveBeenCalledWith('u1', '2026-11-01', '2026-11-05'),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('No disponible'));
    expect(host.textContent).toContain('Fechas bloqueadas');
  });

  it('should reject an inverted range without calling the API', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostBlocksForm);
    fixture.componentRef.setInput('unitId', 'u1');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    setRange(host, '2026-11-10', '2026-11-05');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('posterior');
    expect(api.blockDates).not.toHaveBeenCalled();
  });

  it('should release host blocks on demand', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostBlocksForm);
    fixture.componentRef.setInput('unitId', 'u1');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    setRange(host, '2026-11-01', '2026-11-05');
    const release = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Liberar'),
    )!;
    release.click();

    await vi.waitFor(() =>
      expect(api.releaseDates).toHaveBeenCalledWith('u1', '2026-11-01', '2026-11-05'),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('liberaron los bloqueos'));
  });
});
