import { describe, expect, it } from 'vitest';
import { amenityIcon, normalizeAmenityName } from './amenity-icon';

describe('amenityIcon', () => {
  it('mapea las amenidades más habituales por coincidencia exacta', () => {
    expect(amenityIcon('WiFi')).toBe('wifi');
    expect(amenityIcon('Aire acondicionado')).toBe('snowflake');
    expect(amenityIcon('Ventilador')).toBe('fan');
    expect(amenityIcon('Cocina equipada')).toBe('utensils');
    expect(amenityIcon('Lavandería')).toBe('washer');
    expect(amenityIcon('Zona de estudio')).toBe('desk');
    expect(amenityIcon('Parqueadero')).toBe('parking');
    expect(amenityIcon('Gimnasio')).toBe('dumbbell');
    expect(amenityIcon('Terraza')).toBe('sun');
    expect(amenityIcon('Sala')).toBe('sofa');
    expect(amenityIcon('Patio interior')).toBe('tree');
    expect(amenityIcon('Baño privado')).toBe('bath');
    expect(amenityIcon('Coworking')).toBe('laptop');
    expect(amenityIcon('TV')).toBe('tv');
    expect(amenityIcon('Ascensor')).toBe('elevator');
    expect(amenityIcon('Piscina')).toBe('pool');
    expect(amenityIcon('Mascotas')).toBe('paw');
    expect(amenityIcon('Calefacción')).toBe('heater');
    expect(amenityIcon('Agua caliente')).toBe('hot-water');
    expect(amenityIcon('Balcón')).toBe('balcony');
    expect(amenityIcon('Limpieza')).toBe('cleaning');
    expect(amenityIcon('Nevera')).toBe('fridge');
    expect(amenityIcon('Microondas')).toBe('microwave');
    expect(amenityIcon('Clóset')).toBe('wardrobe');
    expect(amenityIcon('Seguridad')).toBe('shield');
    expect(amenityIcon('Comedor')).toBe('dining');
    expect(amenityIcon('Ropa de cama')).toBe('bed');
    expect(amenityIcon('Escritorio')).toBe('desk');
  });

  it('ignora tildes, mayúsculas y espacios extra', () => {
    expect(amenityIcon('  AIRE  ACONDICIONADO ')).toBe('snowflake');
    expect(amenityIcon('Calefaccion')).toBe('heater');
    expect(amenityIcon('JARDÍN')).toBe('tree');
    expect(amenityIcon('Balcon')).toBe('balcony');
    expect(amenityIcon('Closet')).toBe('wardrobe');
    expect(normalizeAmenityName('  Ropa de Cama ')).toBe('ropa de cama');
  });

  it('resuelve sinónimos y variantes de escritura', () => {
    expect(amenityIcon('Internet')).toBe('wifi');
    expect(amenityIcon('Wi-Fi')).toBe('wifi');
    expect(amenityIcon('Estacionamiento')).toBe('parking');
    expect(amenityIcon('Garaje')).toBe('parking');
    expect(amenityIcon('Refrigerador')).toBe('fridge');
    expect(amenityIcon('Alberca')).toBe('pool');
    expect(amenityIcon('Zona de coworking')).toBe('laptop');
    expect(amenityIcon('Mesa de trabajo')).toBe('desk');
    expect(amenityIcon('Mascotas')).toBe('paw');
    expect(amenityIcon('Televisor')).toBe('tv');
    expect(amenityIcon('Vigilancia')).toBe('shield');
    expect(amenityIcon('Servicio de limpieza')).toBe('cleaning');
    expect(amenityIcon('Patio')).toBe('tree');
  });

  it('no confunde palabras parecidas por subcadenas', () => {
    expect(amenityIcon('Competencia')).toBe('check');
  });

  it('usa check como respaldo para textos libres o vacíos', () => {
    expect(amenityIcon('')).toBe('check');
    expect(amenityIcon('   ')).toBe('check');
    expect(amenityIcon('Amenidad exótica')).toBe('check');
  });
});
