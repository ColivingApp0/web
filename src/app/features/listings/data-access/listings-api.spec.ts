import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ListingsApi } from './listings-api';

const SEARCH_URL = '/api/v1/search/listings';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(ListingsApi), http: TestBed.inject(HttpTestingController) };
}

describe('ListingsApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should send the city name combined with free text and filters', async () => {
    const { api, http } = setup();
    const promise = api.list({ q: 'balcón', cityName: 'Medellín', minPrice: 500000 });

    const request = http.expectOne((candidate) => candidate.url === SEARCH_URL);
    expect(request.request.params.get('q')).toBe('balcón');
    expect(request.request.params.get('cityName')).toBe('Medellín');
    expect(request.request.params.get('minPrice')).toBe('500000');
    request.flush([]);

    await expect(promise).resolves.toEqual([]);
  });

  it('should omit cityName when there is no location filter', async () => {
    const { api, http } = setup();
    const promise = api.list({ availableOnly: true });

    const request = http.expectOne((candidate) => candidate.url === SEARCH_URL);
    expect(request.request.params.has('cityName')).toBe(false);
    request.flush([]);

    await promise;
  });
});
