import { TestBed } from '@angular/core/testing';
import { HostApi } from '../data-access/host-api';
import { HostProperty } from '../models/host-models';
import { HostPropertyForm } from './property-form';

const existing: HostProperty = {
  id: 'p1',
  hostId: 'h1',
  title: 'Edificio Aurora',
  description: null,
  cityId: 'city-1',
  address: null,
  amenities: ['WiFi'],
  archived: false,
};

function setup() {
  const api = {
    createProperty: vi.fn().mockResolvedValue({ ...existing, cityId: null }),
    updateProperty: vi.fn().mockResolvedValue(existing),
  };
  TestBed.configureTestingModule({
    imports: [HostPropertyForm],
    providers: [{ provide: HostApi, useValue: api }],
  });
  return { api };
}

function fill(host: HTMLElement, id: string, value: string): void {
  const input = host.querySelector<HTMLInputElement>(id);
  if (input) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
}

describe('HostPropertyForm', () => {
  it('should create a property with the full payload (no city reference)', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostPropertyForm);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    fill(host, '#host-property-title', 'Torre M3');
    fill(host, '#host-property-amenities', 'WiFi, Cocina');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.createProperty).toHaveBeenCalledWith({
        title: 'Torre M3',
        description: null,
        address: null,
        amenities: ['WiFi', 'Cocina'],
      }),
    );
  });

  it('should preserve the loaded city when editing (full-send PATCH)', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostPropertyForm);
    fixture.componentRef.setInput('property', existing);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    fill(host, '#host-property-title', 'Edificio Aurora 2');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.updateProperty).toHaveBeenCalledWith('p1', {
        title: 'Edificio Aurora 2',
        description: null,
        address: null,
        amenities: ['WiFi'],
        cityId: 'city-1',
      }),
    );
  });

  it('should require a title', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostPropertyForm);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(api.createProperty).not.toHaveBeenCalled();
    expect(host.textContent).toContain('El título es obligatorio.');
  });
});
