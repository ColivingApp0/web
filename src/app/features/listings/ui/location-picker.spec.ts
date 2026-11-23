import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DirectoryApi } from '../../directory/data-access/directory-api';
import { DirectoryCity, DirectoryUniversity } from '../../directory/models/directory-models';
import { LocationFilter } from '../models/location-filter';
import { LocationPicker } from './location-picker';

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
  {
    id: 4,
    name: 'INSTITUCIÓN SIN SEDE',
    cityName: null,
    legalNature: null,
    academicCharacter: null,
    website: null,
    highQualityAccredited: false,
  },
];

function setup() {
  const api = {
    cities: vi.fn().mockResolvedValue(CITIES),
    universities: vi.fn().mockResolvedValue(UNIVERSITIES),
  };
  TestBed.configureTestingModule({
    imports: [LocationPicker],
    providers: [{ provide: DirectoryApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(LocationPicker);
  const emitted: (LocationFilter | null)[] = [];
  fixture.componentInstance.locationChange.subscribe((location) => emitted.push(location));
  return { api, fixture, emitted, host: fixture.nativeElement as HTMLElement };
}

async function type(host: HTMLElement, value: string): Promise<HTMLInputElement> {
  const input = host.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  return input;
}

describe('LocationPicker', () => {
  it('should list cities ignoring accents and emit the selected city', async () => {
    const { fixture, emitted, host } = setup();
    await fixture.whenStable();

    await type(host, 'medellin');
    await fixture.whenStable();

    await vi.waitFor(() => expect(host.querySelectorAll('[role="option"]')).toHaveLength(1));
    host.querySelector<HTMLElement>('[role="option"]')!.click();

    expect(emitted).toEqual([
      {
        kind: 'city',
        name: 'Medellín',
        cityName: 'Medellín',
        detail: 'Antioquia',
      },
    ]);
  });

  it('should select the active option with the keyboard', async () => {
    const { fixture, emitted, host } = setup();
    await fixture.whenStable();

    const input = await type(host, 'bogota');
    await fixture.whenStable();
    await vi.waitFor(() => expect(host.querySelectorAll('[role="option"]')).toHaveLength(1));

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(emitted[0]?.name).toBe('Bogotá');
  });

  it('should resolve a university to its city', async () => {
    const { fixture, emitted, host } = setup();
    await fixture.whenStable();

    const radio = host.querySelector<HTMLInputElement>('input[value="university"]')!;
    radio.click();
    radio.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    await type(host, 'antioquia');
    await fixture.whenStable();
    await vi.waitFor(() => expect(host.querySelectorAll('[role="option"]')).toHaveLength(1));
    host.querySelector<HTMLElement>('[role="option"]')!.click();

    expect(emitted[0]).toMatchObject({
      kind: 'university',
      name: 'UNIVERSIDAD DE ANTIOQUIA',
      cityName: 'Medellín',
    });
  });

  it('should warn and not filter when the university has no city', async () => {
    const { fixture, emitted, host } = setup();
    await fixture.whenStable();

    const radio = host.querySelector<HTMLInputElement>('input[value="university"]')!;
    radio.click();
    radio.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    await type(host, 'sin sede');
    await fixture.whenStable();
    await vi.waitFor(() => expect(host.querySelectorAll('[role="option"]')).toHaveLength(1));
    host.querySelector<HTMLElement>('[role="option"]')!.click();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(host.textContent).toContain('No tenemos la ciudad');
  });

  it('should resolve a typed city on apply, including Bogotá D.C.', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    await type(host, 'Bogotá D.C.');
    await fixture.whenStable();

    expect(fixture.componentInstance.hasPendingQuery()).toBe(true);
    expect(fixture.componentInstance.resolveTypedLocation()).toMatchObject({
      kind: 'city',
      name: 'Bogotá',
      cityName: 'Bogotá',
    });
    expect(fixture.componentInstance.hasPendingQuery()).toBe(false);
  });

  it('should filter by a typed city even when the directory does not know it', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    await type(host, 'Pereira');
    await fixture.whenStable();

    expect(fixture.componentInstance.resolveTypedLocation()).toMatchObject({
      kind: 'city',
      name: 'Pereira',
      cityName: 'Pereira',
    });
    expect(fixture.componentInstance.hasPendingQuery()).toBe(false);
  });

  it('should not resolve an ambiguous typed city', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    await type(host, 'd');
    await fixture.whenStable();

    expect(fixture.componentInstance.resolveTypedLocation()).toBeNull();
    fixture.detectChanges();
    expect(host.textContent).toContain('varias coincidencias');
  });

  it('should close the list with Escape', async () => {
    const { fixture, host } = setup();
    await fixture.whenStable();

    const input = await type(host, 'medellin');
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
