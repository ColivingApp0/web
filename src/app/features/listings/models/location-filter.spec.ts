import { describe, expect, it } from 'vitest';
import {
  DirectoryCity,
  DirectoryUniversity,
  canonicalCityName,
} from '../../directory/models/directory-models';
import {
  LocationFilter,
  cityLocation,
  locationChipLabel,
  locationQueryParams,
  locationResultsLabel,
  parseLocationParams,
  resolveCityLocation,
  resolveUniversityLocation,
  universityLocation,
} from './location-filter';

const MEDELLIN: DirectoryCity = {
  id: 1,
  name: 'Medellín',
  departmentName: 'Antioquia',
  population: 2500000,
};

const UDEA: DirectoryUniversity = {
  id: 3,
  name: 'UNIVERSIDAD DE ANTIOQUIA',
  cityName: 'Medellín',
  legalNature: 'Departamental',
  academicCharacter: 'Universidad',
  website: 'www.udea.edu.co',
  highQualityAccredited: true,
};

const SIN_CIUDAD: DirectoryUniversity = {
  id: 4,
  name: 'INSTITUCIÓN SIN SEDE',
  cityName: null,
  legalNature: null,
  academicCharacter: null,
  website: null,
  highQualityAccredited: false,
};

describe('location-filter', () => {
  describe('canonicalCityName', () => {
    it('should treat Bogotá D.C. and its variants as Bogotá', () => {
      expect(canonicalCityName('Bogotá D.C.')).toBe('Bogotá');
      expect(canonicalCityName('  bogota dc ')).toBe('Bogotá');
      expect(canonicalCityName('Distrito Capital')).toBe('Bogotá');
      expect(canonicalCityName('Santa Fe de Bogotá')).toBe('Bogotá');
    });

    it('should preserve other city names', () => {
      expect(canonicalCityName('Medellín')).toBe('Medellín');
      expect(canonicalCityName('Cali')).toBe('Cali');
      expect(canonicalCityName('Bogotá')).toBe('Bogotá');
    });

    it('should canonicalize the city sent to the backend', () => {
      const bogota: DirectoryCity = {
        id: 167,
        name: 'Bogotá D.C.',
        departmentName: 'Cundinamarca',
        population: 7901653,
      };
      expect(cityLocation(bogota)).toEqual({
        kind: 'city',
        name: 'Bogotá',
        cityName: 'Bogotá',
        detail: 'Cundinamarca',
      });
    });

    it('should map a university seat to the canonical city', () => {
      const andes: DirectoryUniversity = {
        id: 5,
        name: 'UNIVERSIDAD DE LOS ANDES',
        cityName: 'Bogotá D.C.',
        legalNature: null,
        academicCharacter: null,
        website: null,
        highQualityAccredited: true,
      };
      expect(universityLocation(andes).cityName).toBe('Bogotá');
      const fromUrl = parseLocationParams(null, 'Universidad de los Andes');
      expect(resolveUniversityLocation(fromUrl, [andes])?.cityName).toBe('Bogotá');
    });

    it('should resolve Bogotá D.C. from the URL to the canonical directory city', () => {
      const bogota: DirectoryCity = {
        id: 167,
        name: 'Bogotá D.C.',
        departmentName: 'Cundinamarca',
        population: 7901653,
      };
      const fromUrl = parseLocationParams('Bogotá D.C.', null);
      expect(resolveCityLocation(fromUrl, [bogota])?.cityName).toBe('Bogotá');
    });
  });

  describe('parseLocationParams', () => {
    it('should read a city from the URL and trim it', () => {
      expect(parseLocationParams('  Bogotá D.C. ', null)).toEqual({
        kind: 'city',
        name: 'Bogotá',
        cityName: 'Bogotá',
        detail: null,
      });
    });

    it('should read a university without a city until it is resolved', () => {
      expect(parseLocationParams(null, 'Universidad de Antioquia')).toEqual({
        kind: 'university',
        name: 'Universidad de Antioquia',
        cityName: null,
        detail: null,
      });
    });

    it('should prefer the city when both params are present', () => {
      expect(parseLocationParams('Medellín', 'Universidad de Antioquia')?.kind).toBe('city');
    });

    it('should ignore blank params', () => {
      expect(parseLocationParams('  ', '  ')).toBeNull();
      expect(parseLocationParams(null, null)).toBeNull();
    });
  });

  it('should serialize only one shareable location param', () => {
    expect(locationQueryParams(cityLocation(MEDELLIN))).toEqual({ ciudad: 'Medellín' });
    expect(locationQueryParams(universityLocation(UDEA))).toEqual({
      universidad: 'UNIVERSIDAD DE ANTIOQUIA',
    });
    expect(locationQueryParams(null)).toEqual({});
  });

  it('should resolve a university city ignoring accents and case', () => {
    const fromUrl = parseLocationParams(null, 'universidad de antioquia');
    expect(resolveUniversityLocation(fromUrl, [UDEA])).toEqual({
      kind: 'university',
      name: 'UNIVERSIDAD DE ANTIOQUIA',
      cityName: 'Medellín',
      detail: 'Medellín',
    });
  });

  it('should keep a university without city unresolved', () => {
    const fromUrl = parseLocationParams(null, 'INSTITUCIÓN SIN SEDE');
    const resolved = resolveUniversityLocation(fromUrl, [SIN_CIUDAD]);
    expect(resolved?.cityName).toBeNull();
  });

  it('should keep an unknown university unresolved', () => {
    const fromUrl = parseLocationParams(null, 'UNIVERSIDAD INEXISTENTE');
    expect(resolveUniversityLocation(fromUrl, [UDEA])).toBe(fromUrl);
  });

  it('should complete a city from the URL with its department', () => {
    const fromUrl = parseLocationParams('medellin', null);
    expect(resolveCityLocation(fromUrl, [MEDELLIN])).toEqual({
      kind: 'city',
      name: 'Medellín',
      cityName: 'Medellín',
      detail: 'Antioquia',
    });
  });

  it('should keep an unknown city as typed', () => {
    const fromUrl = parseLocationParams('Ciudad Inventada', null);
    expect(resolveCityLocation(fromUrl, [MEDELLIN])).toBe(fromUrl);
  });

  it('should label the selected chip for cities and universities', () => {
    const city: LocationFilter = {
      kind: 'city',
      name: 'Medellín',
      cityName: 'Medellín',
      detail: 'Antioquia',
    };
    const university: LocationFilter = {
      kind: 'university',
      name: 'UNIVERSIDAD DE ANTIOQUIA',
      cityName: 'Medellín',
      detail: 'Medellín',
    };
    expect(locationChipLabel(city)).toBe('En Medellín · Antioquia');
    expect(locationChipLabel({ ...city, detail: null })).toBe('En Medellín');
    expect(locationChipLabel(university)).toBe('Cerca de UNIVERSIDAD DE ANTIOQUIA · Medellín');
  });

  it('should summarize results by city or university', () => {
    const city: LocationFilter = {
      kind: 'city',
      name: 'Medellín',
      cityName: 'Medellín',
      detail: 'Antioquia',
    };
    const university: LocationFilter = {
      kind: 'university',
      name: 'UNIVERSIDAD DE ANTIOQUIA',
      cityName: 'Medellín',
      detail: 'Medellín',
    };
    expect(locationResultsLabel(1, city)).toBe('1 resultado en Medellín');
    expect(locationResultsLabel(5, city)).toBe('5 resultados en Medellín');
    expect(locationResultsLabel(2, university)).toBe(
      '2 resultados cerca de UNIVERSIDAD DE ANTIOQUIA',
    );
  });
});
