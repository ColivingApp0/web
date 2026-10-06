import {
  ColombiaCityResponse,
  ColombiaDepartmentResponse,
  ColombiaUniversityResponse,
  DIRECTORY_RESULT_LIMIT,
  DirectoryCity,
  cityLabel,
  externalWebsiteUrl,
  normalizeText,
  searchCities,
  searchUniversities,
  toDirectoryCities,
  toDirectoryUniversities,
} from './directory-models';

const CITIES: ColombiaCityResponse[] = [
  { id: 1, name: 'Medellín', departmentId: 2, population: 2500000 },
  { id: 2, name: 'Bogotá D.C.', departmentId: 5, population: 7901653 },
  { id: 3, name: 'Puerto Nare', departmentId: 2, population: null },
];
const DEPARTMENTS: ColombiaDepartmentResponse[] = [
  { id: 2, name: 'Antioquia' },
  { id: 5, name: 'Cundinamarca' },
];

describe('directory-models', () => {
  it('should join cities with their department name', () => {
    expect(toDirectoryCities(CITIES, DEPARTMENTS)[0]).toEqual({
      id: 1,
      name: 'Medellín',
      departmentName: 'Antioquia',
      population: 2500000,
    });
  });

  it('should leave the department name null when unknown or absent', () => {
    const cities = toDirectoryCities(
      [
        { id: 9, name: 'Sin departamento', departmentId: null, population: null },
        { id: 10, name: 'Departamento desconocido', departmentId: 99, population: null },
      ],
      DEPARTMENTS,
    );
    expect(cities.map((city) => city.departmentName)).toEqual([null, null]);
  });

  it('should normalize universities and resolve the city name', () => {
    const raw: ColombiaUniversityResponse[] = [
      {
        id: 3,
        name: 'UNIVERSIDAD DE ANTIOQUIA',
        legalNature: 'Departamental',
        academicCharacter: 'Universidad',
        website: 'www.udea.edu.co',
        isHighQualityAccredited: true,
        city: { id: 12, name: 'Medellín' },
      },
    ];
    expect(toDirectoryUniversities(raw)[0]).toEqual({
      id: 3,
      name: 'UNIVERSIDAD DE ANTIOQUIA',
      cityName: 'Medellín',
      legalNature: 'Departamental',
      academicCharacter: 'Universidad',
      website: 'www.udea.edu.co',
      highQualityAccredited: true,
    });
  });

  it('should treat a missing city or accreditation as absent/false', () => {
    const raw: ColombiaUniversityResponse[] = [
      {
        id: 4,
        name: 'INSTITUCIÓN SIN DATOS',
        legalNature: null,
        academicCharacter: null,
        website: null,
        isHighQualityAccredited: null,
        city: null,
      },
    ];
    const university = toDirectoryUniversities(raw)[0];
    expect(university.cityName).toBeNull();
    expect(university.highQualityAccredited).toBe(false);
  });

  it('should add the https scheme to a website without one', () => {
    expect(externalWebsiteUrl('www.unal.edu.co')).toBe('https://www.unal.edu.co');
    expect(externalWebsiteUrl('http://udea.edu.co')).toBe('http://udea.edu.co');
    expect(externalWebsiteUrl('  ')).toBeNull();
    expect(externalWebsiteUrl(null)).toBeNull();
  });

  it('should normalize accents and case', () => {
    expect(normalizeText('  Medellín ')).toBe('medellin');
  });

  describe('searchCities', () => {
    const cities = toDirectoryCities(CITIES, DEPARTMENTS);

    it('should return nothing for an empty query', () => {
      expect(searchCities(cities, '   ')).toEqual([]);
    });

    it('should match ignoring accents', () => {
      expect(searchCities(cities, 'medellin').map((city) => city.name)).toEqual(['Medellín']);
    });

    it('should match by department', () => {
      expect(searchCities(cities, 'antioquia').map((city) => city.name)).toEqual([
        'Medellín',
        'Puerto Nare',
      ]);
    });

    it('should prioritize entries starting with the term', () => {
      const list: DirectoryCity[] = [
        { id: 1, name: 'Sabaneta', departmentName: null, population: null },
        { id: 2, name: 'Santa Fe', departmentName: null, population: null },
        { id: 3, name: 'Santander de Quilichao', departmentName: null, population: null },
      ];
      expect(searchCities(list, 'santa').map((city) => city.name)).toEqual([
        'Santa Fe',
        'Santander de Quilichao',
      ]);
    });

    it('should cap the number of results', () => {
      const many: DirectoryCity[] = Array.from(
        { length: DIRECTORY_RESULT_LIMIT + 5 },
        (_, index) => ({
          id: index + 1,
          name: `Ciudad ${index + 1}`,
          departmentName: null,
          population: null,
        }),
      );
      expect(searchCities(many, 'ciudad')).toHaveLength(DIRECTORY_RESULT_LIMIT);
    });
  });

  describe('searchUniversities', () => {
    const universities = toDirectoryUniversities([
      {
        id: 1,
        name: 'UNIVERSIDAD DE ANTIOQUIA',
        legalNature: 'Departamental',
        academicCharacter: 'Universidad',
        website: 'www.udea.edu.co',
        isHighQualityAccredited: false,
        city: { id: 12, name: 'Medellín' },
      },
      {
        id: 2,
        name: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
        legalNature: 'Nacional',
        academicCharacter: 'Universidad',
        website: 'www.unal.edu.co',
        isHighQualityAccredited: true,
        city: { id: 167, name: 'Bogotá D.C.' },
      },
    ]);

    it('should match by the city where the institution is located', () => {
      expect(searchUniversities(universities, 'medellin').map((item) => item.id)).toEqual([1]);
    });

    it('should match by name ignoring case', () => {
      expect(searchUniversities(universities, 'nacional').map((item) => item.id)).toEqual([2]);
    });
  });

  it('should label a city with its department when known', () => {
    expect(
      cityLabel({ id: 1, name: 'Medellín', departmentName: 'Antioquia', population: null }),
    ).toBe('Medellín · Antioquia');
    expect(
      cityLabel({ id: 2, name: 'Sin departamento', departmentName: null, population: null }),
    ).toBe('Sin departamento');
  });
});
