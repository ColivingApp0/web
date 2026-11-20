import { describe, expect, it } from 'vitest';
import { searchFiltersFromParams } from './search-params';

function params(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries);
}

describe('searchFiltersFromParams', () => {
  it('should combine free text with the city and keep availableOnly on by default', () => {
    expect(searchFiltersFromParams(params({ q: ' balcón ', ciudad: ' Medellín ' }))).toEqual({
      availableOnly: true,
      q: 'balcón',
      cityName: 'Medellín',
    });
  });

  it('should not fold a university into the free-text query', () => {
    expect(searchFiltersFromParams(params({ universidad: 'Universidad de Antioquia' }))).toEqual({
      availableOnly: true,
    });
  });

  it('should map prices, capacity, currency and sort', () => {
    expect(
      searchFiltersFromParams(
        params({
          minPrice: '500.000',
          maxPrice: '2.000.000',
          minCapacity: '2',
          currency: 'USD',
          sort: 'PRICE_DESC',
        }),
      ),
    ).toEqual({
      availableOnly: true,
      minPrice: 500000,
      maxPrice: 2000000,
      minCapacity: 2,
      currency: 'USD',
      sort: 'PRICE_DESC',
    });
  });

  it('should accept the legacy presupuesto param for the maximum price', () => {
    expect(searchFiltersFromParams(params({ presupuesto: '900000' })).maxPrice).toBe(900000);
  });

  it('should map enums and feature flags, ignoring invalid values', () => {
    expect(
      searchFiltersFromParams(
        params({
          bathroomType: 'PRIVADO',
          roomType: 'COMPARTIDA',
          airConditioning: 'true',
          fan: 'true',
          availableOnly: 'false',
          currency: 'EUR',
          sort: 'RANDOM',
        }),
      ),
    ).toEqual({
      availableOnly: false,
      bathroomType: 'PRIVADO',
      roomType: 'COMPARTIDA',
      airConditioning: true,
      fan: true,
    });
  });
});
