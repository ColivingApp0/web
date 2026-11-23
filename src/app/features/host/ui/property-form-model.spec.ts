import { HostProperty } from '../models/host-models';
import {
  buildPropertyPayload,
  hasPropertyDraftContent,
  isValidPhotoUrl,
  normalizeAmenities,
  normalizePhotoUrls,
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
  it('conserva ciudad, servicios y fotos al abrir la edición', () => {
    const model = propertyFormModel({
      ...PROPERTY,
      photos: [{ id: 'photo-1', url: '/images/rooms/room-01.jpg', position: 0 }],
    });

    expect(model.cityId).toBe('city-uuid');
    expect(model.cityName).toBe('Bogotá');
    expect(model.amenities).toEqual(['WiFi', 'Terraza']);
    expect(model.photoUrls).toEqual(['/images/rooms/room-01.jpg']);
  });

  it('valida y normaliza los enlaces de fotos del alta', () => {
    expect(isValidPhotoUrl('/images/rooms/room-01.jpg')).toBe(true);
    expect(isValidPhotoUrl('https://cdn.example.com/foto.jpg')).toBe(true);
    expect(isValidPhotoUrl('ftp://example.com/foto.jpg')).toBe(false);
    expect(isValidPhotoUrl('  ')).toBe(false);

    expect(
      normalizePhotoUrls([
        ' /images/rooms/room-01.jpg ',
        '/images/rooms/room-01.jpg',
        'https://cdn.example.com/foto.jpg',
        'ftp://invalida',
        '',
      ]),
    ).toEqual(['/images/rooms/room-01.jpg', 'https://cdn.example.com/foto.jpg']);
  });

  it('considera las fotos como contenido del borrador', () => {
    expect(
      hasPropertyDraftContent({
        ...propertyFormModel(null),
        photoUrls: ['/images/rooms/room-01.jpg'],
      }),
    ).toBe(true);
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
