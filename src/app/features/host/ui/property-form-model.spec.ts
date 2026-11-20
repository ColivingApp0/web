import { HostProperty } from '../models/host-models';
import {
  buildPropertyPayload,
  normalizeAmenities,
  propertyFormModel,
  toggleAmenity,
} from './property-form-model';

const PROPERTY: HostProperty = {
  id: 'property-1',
  hostId: 'host-1',
  title: 'Casa Norte',
  description: 'Una casa tranquila.',
  cityId: 'city-uuid',
  cityName: 'Bogotá D.C.',
  neighborhood: 'Chapinero',
  address: 'Calle 1 # 2-3',
  amenities: ['WiFi', 'Terraza'],
  archived: false,
  photos: [],
};

describe('property-form-model', () => {
  it('conserva ciudad y servicios al abrir la edición', () => {
    const model = propertyFormModel(PROPERTY);

    expect(model.cityId).toBe('city-uuid');
    expect(model.cityName).toBe('Bogotá');
    expect(model.amenities).toEqual(['WiFi', 'Terraza']);
  });

  it('normaliza el payload y respeta cityId al editar', () => {
    const payload = buildPropertyPayload({
      ...propertyFormModel(PROPERTY),
      title: '  Casa Norte  ',
      description: '   ',
      neighborhood: '',
      amenities: [' WiFi ', 'wifi', 'Terraza', ''],
    });

    expect(payload).toEqual({
      title: 'Casa Norte',
      description: null,
      cityId: 'city-uuid',
      cityName: 'Bogotá',
      neighborhood: null,
      address: 'Calle 1 # 2-3',
      amenities: ['WiFi', 'Terraza'],
    });
  });

  it('quita duplicados al añadir servicios sin distinguir mayúsculas', () => {
    expect(normalizeAmenities(['WiFi', 'wifi', ' WiFi ', ''])).toEqual(['WiFi']);
    expect(toggleAmenity(['WiFi', 'Terraza'], 'wifi')).toEqual(['Terraza']);
    expect(toggleAmenity(['WiFi'], 'Jardín')).toEqual(['WiFi', 'Jardín']);
  });
});
