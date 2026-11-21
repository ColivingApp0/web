import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DirectoryApi } from '../../directory/data-access/directory-api';
import { DirectoryCity } from '../../directory/models/directory-models';
import { HostApi } from '../data-access/host-api';
import { HostProperty } from '../models/host-models';
import { PROPERTY_DRAFT_STORAGE_KEY } from '../state/property-draft-store';
import { HostPropertyWizard } from './property-wizard';

const CITIES: DirectoryCity[] = [
  { id: 1, name: 'Bogotá D.C.', departmentName: 'Cundinamarca', population: 7901653 },
  { id: 2, name: 'Medellín', departmentName: 'Antioquia', population: 2500000 },
];

const CREATED: HostProperty = {
  id: 'property-1',
  hostId: 'host-1',
  title: 'Casa Norte',
  description: 'Una casa tranquila.',
  cityId: null,
  cityName: 'Bogotá D.C.',
  neighborhood: 'Chapinero',
  address: 'Calle 1 # 2-3',
  amenities: ['WiFi', 'Piscina'],
  archived: false,
  photos: [],
};

function setup(cities: Promise<DirectoryCity[]> = Promise.resolve(CITIES)) {
  const api = {
    createProperty: vi.fn().mockResolvedValue(CREATED),
    updateProperty: vi.fn().mockResolvedValue(CREATED),
  };
  const directory = {
    cities: vi.fn().mockReturnValue(cities),
    universities: vi.fn().mockResolvedValue([]),
  };

  TestBed.configureTestingModule({
    imports: [HostPropertyWizard],
    providers: [
      { provide: HostApi, useValue: api },
      { provide: DirectoryApi, useValue: directory },
    ],
  });

  const fixture = TestBed.createComponent(HostPropertyWizard);
  return { api, directory, fixture, host: fixture.nativeElement as HTMLElement };
}

async function settle(fixture: ComponentFixture<HostPropertyWizard>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function buttonByText(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.replace(/\s+/g, ' ').trim().includes(label),
  );
  if (!button) throw new Error(`No se encontró el botón «${label}».`);
  return button;
}

async function type(
  fixture: ComponentFixture<HostPropertyWizard>,
  selector: string,
  value: string,
): Promise<HTMLInputElement> {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`No se encontró el campo ${selector}.`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
  return input;
}

function stepHeading(host: HTMLElement): string {
  return host.querySelector('#host-property-step-heading')?.textContent?.trim() ?? '';
}

async function goToLocation(fixture: ComponentFixture<HostPropertyWizard>): Promise<void> {
  await type(fixture, '#host-property-wizard-title', 'Casa Norte');
  buttonByText(fixture.nativeElement as HTMLElement, 'Continuar').click();
  await settle(fixture);
}

describe('HostPropertyWizard', () => {
  beforeEach(() => {
    localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
  });

  it('bloquea el avance sin nombre y conserva lo escrito al retroceder', async () => {
    const { fixture, host } = setup();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Datos básicos');
    expect(host.querySelector('[aria-current="step"]')?.textContent).toContain('Datos básicos');

    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Datos básicos');
    expect(host.textContent).toContain('El nombre de la propiedad es obligatorio');
    expect(host.querySelector('[aria-current="step"]')?.textContent).toContain('Datos básicos');

    const title = await type(fixture, '#host-property-wizard-title', 'Casa Norte');
    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Ubicación');
    expect(host.querySelector('[aria-current="step"]')?.textContent).toContain('Ubicación');
    expect(document.activeElement).toBe(host.querySelector('#host-property-step-heading'));

    buttonByText(host, 'Atrás').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Datos básicos');
    expect(title.value).toBe('Casa Norte');
  });

  it('guarda el borrador en localStorage y lo recupera al reabrir el alta', async () => {
    const first = setup();
    await settle(first.fixture);

    await type(first.fixture, '#host-property-wizard-title', 'Casa Norte');
    buttonByText(first.host, 'Continuar').click();
    await settle(first.fixture);
    await type(first.fixture, '#host-property-wizard-city', 'Bogotá D.C.');
    await type(first.fixture, '#host-property-wizard-neighborhood', 'Chapinero');
    await settle(first.fixture);

    const stored = JSON.parse(localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY) ?? '{}');
    expect(stored.version).toBe(2);
    expect(stored.model.title).toBe('Casa Norte');
    expect(stored.model.neighborhood).toBe('Chapinero');
    expect(stored.step).toBe(1);

    first.fixture.destroy();

    const second = TestBed.createComponent(HostPropertyWizard);
    await settle(second);
    const reopened = second.nativeElement as HTMLElement;

    expect(reopened.textContent).toContain('Recuperamos tu borrador');
    expect(reopened.querySelector<HTMLInputElement>('#host-property-wizard-city')?.value).toBe(
      'Bogotá D.C.',
    );
    expect(
      reopened.querySelector<HTMLInputElement>('#host-property-wizard-neighborhood')?.value,
    ).toBe('Chapinero');
    expect(stepHeading(reopened)).toBe('Ubicación');

    buttonByText(reopened, 'Descartar borrador').click();
    await settle(second);
    expect(localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY)).toBeNull();
    second.destroy();

    const third = TestBed.createComponent(HostPropertyWizard);
    await settle(third);
    const clean = third.nativeElement as HTMLElement;
    expect(clean.textContent).not.toContain('Recuperamos tu borrador');
    expect(clean.querySelector<HTMLInputElement>('#host-property-wizard-title')?.value).toBe('');
  });

  it('exige ciudad y barrio en el paso de ubicación', async () => {
    const { api, fixture, host } = setup();
    await settle(fixture);

    await goToLocation(fixture);
    expect(stepHeading(host)).toBe('Ubicación');

    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Ubicación');
    expect(host.textContent).toContain('La ciudad es obligatoria');
    expect(host.querySelector('[aria-current="step"]')?.textContent).toContain('Ubicación');

    await type(fixture, '#host-property-wizard-city', 'Cali');
    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Ubicación');
    expect(host.textContent).toContain('El barrio o zona es obligatorio');
    expect(api.createProperty).not.toHaveBeenCalled();
  });

  it('recorre los cuatro pasos y crea la propiedad con servicios sugeridos y propios', async () => {
    const { api, fixture, host } = setup();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    await settle(fixture);

    await type(fixture, '#host-property-wizard-title', 'Casa Norte');
    await type(fixture, '#host-property-wizard-description', 'Una casa tranquila.');
    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    const city = await type(fixture, '#host-property-wizard-city', 'Bogot');
    await vi.waitFor(() => expect(host.querySelectorAll('[role="option"]')).toHaveLength(1));
    const option = host.querySelector<HTMLElement>('[role="option"]')!;
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(city.value).toBe('Bogotá');

    await type(fixture, '#host-property-wizard-neighborhood', 'Chapinero');
    await type(fixture, '#host-property-wizard-address', 'Calle 1 # 2-3');
    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Servicios y zonas comunes');
    buttonByText(host, 'WiFi').click();
    await settle(fixture);
    expect(buttonByText(host, 'WiFi').getAttribute('aria-label')).toBe('Quitar WiFi');

    await type(fixture, '#host-property-custom-amenity', 'Piscina');
    buttonByText(host, 'Añadir').click();
    await settle(fixture);
    expect(host.textContent).toContain('Piscina');
    expect(host.textContent).toContain('2 servicios seleccionados');

    buttonByText(host, 'Continuar').click();
    await settle(fixture);

    expect(stepHeading(host)).toBe('Revisión');
    expect(host.textContent).toContain('Casa Norte');
    expect(host.textContent).toContain('Bogotá · Chapinero');
    expect(host.textContent).toContain(
      'Dirección exacta (solo para ti, no se publica): Calle 1 # 2-3',
    );
    expect(host.textContent).toContain('WiFi');
    expect(host.textContent).toContain('Piscina');

    buttonByText(host, 'Crear propiedad').click();
    await vi.waitFor(() => expect(api.createProperty).toHaveBeenCalledTimes(1));

    expect(api.createProperty).toHaveBeenCalledWith({
      title: 'Casa Norte',
      description: 'Una casa tranquila.',
      cityId: null,
      cityName: 'Bogotá',
      neighborhood: 'Chapinero',
      address: 'Calle 1 # 2-3',
      amenities: ['WiFi', 'Piscina'],
    });
    expect(saved).toHaveBeenCalledWith(CREATED);
  });

  it('permite escribir la ciudad a mano si el directorio no está disponible', async () => {
    const { api, fixture, host } = setup(Promise.reject(new Error('sin conexión')));
    await settle(fixture);

    await goToLocation(fixture);
    expect(stepHeading(host)).toBe('Ubicación');
    await vi.waitFor(() => expect(host.textContent).toContain('Escribe la ciudad manualmente'));

    await type(fixture, '#host-property-wizard-city', 'Cali');
    await type(fixture, '#host-property-wizard-neighborhood', 'Granada');
    buttonByText(host, 'Continuar').click();
    await settle(fixture);
    expect(stepHeading(host)).toBe('Servicios y zonas comunes');

    buttonByText(host, 'Continuar').click();
    await settle(fixture);
    buttonByText(host, 'Crear propiedad').click();

    await vi.waitFor(() => expect(api.createProperty).toHaveBeenCalledTimes(1));
    expect(api.createProperty).toHaveBeenCalledWith(
      expect.objectContaining({ cityName: 'Cali', amenities: [] }),
    );
  });
});
