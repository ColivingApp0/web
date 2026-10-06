import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DirectoryApi } from './directory-api';

const CITY_URL = 'https://api-colombia.com/api/v1/City';
const DEPARTMENT_URL = 'https://api-colombia.com/api/v1/Department';
const UNIVERSITY_URL = 'https://api-colombia.com/api/v1/HigherEducationInstitution';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(DirectoryApi), http: TestBed.inject(HttpTestingController) };
}

describe('DirectoryApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should request cities and departments and join them', async () => {
    const { api, http } = setup();
    const promise = api.cities();

    http
      .expectOne(CITY_URL)
      .flush([{ id: 1, name: 'Medellín', departmentId: 2, population: 2500000 }]);
    http.expectOne(DEPARTMENT_URL).flush([{ id: 2, name: 'Antioquia' }]);

    await expect(promise).resolves.toEqual([
      { id: 1, name: 'Medellín', departmentName: 'Antioquia', population: 2500000 },
    ]);
  });

  it('should cache the cities collection across calls', async () => {
    const { api, http } = setup();
    const first = api.cities();
    http.expectOne(CITY_URL).flush([]);
    http.expectOne(DEPARTMENT_URL).flush([]);
    await first;

    await expect(api.cities()).resolves.toEqual([]);
    http.expectNone(CITY_URL);
  });

  it('should normalize universities from the institution endpoint', async () => {
    const { api, http } = setup();
    const promise = api.universities();
    http.expectOne(UNIVERSITY_URL).flush([
      {
        id: 4,
        name: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
        legalNature: 'Nacional',
        academicCharacter: 'Universidad',
        website: 'www.unal.edu.co',
        isHighQualityAccredited: true,
        city: { id: 167, name: 'Bogotá D.C.' },
      },
    ]);

    await expect(promise).resolves.toEqual([
      {
        id: 4,
        name: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
        cityName: 'Bogotá D.C.',
        legalNature: 'Nacional',
        academicCharacter: 'Universidad',
        website: 'www.unal.edu.co',
        highQualityAccredited: true,
      },
    ]);
    http.expectNone(UNIVERSITY_URL);
  });

  it('should allow retrying after a failed load', async () => {
    const { api, http } = setup();

    const failing = api.cities();
    http.expectOne(CITY_URL).flush('boom', { status: 500, statusText: 'Server Error' });
    http.expectOne(DEPARTMENT_URL).flush([]);
    await expect(failing).rejects.toBeTruthy();

    const retry = api.cities();
    http.expectOne(CITY_URL).flush([]);
    http.expectOne(DEPARTMENT_URL).flush([]);
    await expect(retry).resolves.toEqual([]);
  });
});
