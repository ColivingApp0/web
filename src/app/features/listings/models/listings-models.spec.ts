import { describe, expect, it } from 'vitest';
import { MONTHLY_PRICE_MAX, bathroomLabel, priceUnitLabel, roomTypeLabel } from './listings-models';

describe('monthly listing model', () => {
  it('expresses prices and units without nights', () => {
    expect(priceUnitLabel('POR_PERSONA')).toBe('por persona');
    expect(priceUnitLabel('POR_HABITACION')).toBe('por habitación');
    expect(MONTHLY_PRICE_MAX).toBeGreaterThan(0);
  });

  it('labels room and bathroom types', () => {
    expect(roomTypeLabel('COMPARTIDA')).toBe('Habitación compartida');
    expect(roomTypeLabel('INDIVIDUAL')).toBe('Habitación individual');
    expect(bathroomLabel('PRIVADO')).toBe('Baño privado');
    expect(bathroomLabel('COMPARTIDO')).toBe('Baño compartido');
  });
});
