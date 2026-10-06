import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DirectoryApi } from '../data-access/directory-api';
import { DirectoryCity, DirectoryUniversity } from '../models/directory-models';
import { DirectoryPage } from './directory-page';

const CITIES: DirectoryCity[] = [
  { id: 1, name: 'Medellín', departmentName: 'Antioquia', population: 2500000 },
  { id: 2, name: 'Bogotá D.C.', departmentName: 'Cundinamarca', population: 7901653 },
];

const UNIVERSITIES: DirectoryUniversity[] = [
  {
    id: 3,
    name: 'UNIVERSIDAD DE ANTIOQUIA',
    cityName: 'Medellín',
    legalNature: 'Departamental',
    academicCharacter: 'Universidad',
    website: 'www.udea.edu.co',
    highQualityAccredited: true,
  },
];

function setup() {
  const api = {
    cities: vi.fn().mockResolvedValue(CITIES),
    universities: vi.fn().mockResolvedValue(UNIVERSITIES),
  };
  TestBed.configureTestingModule({
    imports: [DirectoryPage],
    providers: [provideRouter([]), { provide: DirectoryApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(DirectoryPage);
  return { api, fixture, host: fixture.nativeElement as HTMLElement };
}

describe('DirectoryPage', () => {
  it('should invite the user to search before typing', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    expect(host.textContent).toContain('Escribe el nombre');
  });

  it('should search cities ignoring accents', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    const input = host.querySelector<HTMLInputElement>('#directory-query')!;
    input.value = 'medellin';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await vi.waitFor(() => expect(host.querySelectorAll('li')).toHaveLength(1));
    expect(host.textContent).toContain('Medellín');
    expect(host.textContent).not.toContain('Bogotá D.C.');
  });

  it('should switch to universities and search by city', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    const radio = host.querySelector<HTMLInputElement>('input[value="universities"]')!;
    radio.click();
    radio.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const input = host.querySelector<HTMLInputElement>('#directory-query')!;
    input.value = 'antioquia';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await vi.waitFor(() => expect(host.querySelectorAll('li')).toHaveLength(1));
    expect(host.textContent).toContain('UNIVERSIDAD DE ANTIOQUIA');
    expect(host.querySelector<HTMLAnchorElement>('li a')?.getAttribute('href')).toBe(
      'https://www.udea.edu.co',
    );
  });

  it('should show the empty state when nothing matches', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    const input = host.querySelector<HTMLInputElement>('#directory-query')!;
    input.value = 'zzzz';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await vi.waitFor(() => expect(host.textContent).toContain('Sin coincidencias'));
  });

  it('should surface a load error and allow retrying', async () => {
    const api = {
      cities: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(CITIES),
      universities: vi.fn().mockResolvedValue(UNIVERSITIES),
    };
    TestBed.configureTestingModule({
      imports: [DirectoryPage],
      providers: [provideRouter([]), { provide: DirectoryApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(DirectoryPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(host.textContent).toContain('error inesperado'));

    const retry = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reintentar'),
    );
    expect(retry).toBeTruthy();
    retry!.click();
    await fixture.whenStable();

    await vi.waitFor(() => expect(api.cities).toHaveBeenCalledTimes(2));
  });
});
