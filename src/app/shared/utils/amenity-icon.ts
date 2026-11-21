import type { IconName } from '../ui/icon';

interface AmenityIconRule {
  readonly icon: IconName;
  /** Palabras o frases ya normalizadas (sin tildes ni mayúsculas). */
  readonly keywords: readonly string[];
}

/** Etiquetas habituales, útiles para sugerir amenidades en formularios. */
export const AMENITY_SUGGESTIONS: readonly string[] = [
  'WiFi',
  'Aire acondicionado',
  'Ventilador',
  'Calefacción',
  'Agua caliente',
  'Cocina equipada',
  'Nevera',
  'Microondas',
  'Lavandería',
  'Zona de estudio',
  'Coworking',
  'Sala',
  'Comedor',
  'TV',
  'Balcón',
  'Terraza',
  'Patio interior',
  'Jardín',
  'Parqueadero',
  'Gimnasio',
  'Piscina',
  'Ascensor',
  'Baño privado',
  'Clóset',
  'Ropa de cama',
  'Limpieza',
  'Seguridad',
  'Mascotas',
];

/**
 * Normaliza el nombre de una amenidad para compararlo: sin tildes, en
 * minúsculas, sin puntuación y con espacios simples.
 */
export function normalizeAmenityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** El orden importa: las frases específicas van antes que sus palabras sueltas. */
const RULES: readonly AmenityIconRule[] = [
  {
    icon: 'bed',
    keywords: [
      'ropa de cama',
      'sabanas',
      'sabana',
      'cobijas',
      'edredon',
      'almohada',
      'almohadas',
      'cama',
    ],
  },
  {
    icon: 'hot-water',
    keywords: ['agua caliente', 'ducha caliente', 'calentador de agua'],
  },
  {
    icon: 'snowflake',
    keywords: ['aire acondicionado', 'aire', 'climatizacion', 'climatizado'],
  },
  { icon: 'fan', keywords: ['ventilador', 'ventilador de techo', 'ventilacion'] },
  { icon: 'heater', keywords: ['calefaccion', 'radiador', 'calentador', 'estufa'] },
  { icon: 'wifi', keywords: ['wifi', 'wi fi', 'internet'] },
  { icon: 'tv', keywords: ['tv', 'televisor', 'television', 'smart tv'] },
  {
    icon: 'utensils',
    keywords: ['cocina', 'cocineta', 'kitchenette', 'utensilios'],
  },
  { icon: 'dining', keywords: ['comedor', 'dining', 'mesa de comedor'] },
  { icon: 'washer', keywords: ['lavanderia', 'lavadora', 'lavado', 'secadora'] },
  {
    icon: 'parking',
    keywords: ['parqueadero', 'parqueo', 'estacionamiento', 'parking', 'garaje', 'garage'],
  },
  { icon: 'dumbbell', keywords: ['gimnasio', 'gym', 'mancuernas', 'pesas', 'fitness'] },
  { icon: 'pool', keywords: ['piscina', 'alberca', 'jacuzzi', 'hidromasaje'] },
  { icon: 'elevator', keywords: ['ascensor', 'elevador'] },
  { icon: 'paw', keywords: ['mascota', 'mascotas', 'pet', 'animales', 'animal'] },
  { icon: 'balcony', keywords: ['balcon', 'balcones'] },
  { icon: 'sun', keywords: ['terraza', 'terrazas', 'azotea'] },
  {
    icon: 'tree',
    keywords: [
      'patio interior',
      'patio',
      'jardin',
      'jardines',
      'zonas verdes',
      'zona verde',
      'arboles',
      'arbol',
    ],
  },
  { icon: 'sofa', keywords: ['sala de estar', 'sala', 'salon', 'living', 'sofa'] },
  { icon: 'desk', keywords: ['zona de estudio', 'estudio', 'escritorio', 'mesa de trabajo'] },
  {
    icon: 'laptop',
    keywords: [
      'zona de coworking',
      'coworking',
      'co working',
      'zona de trabajo',
      'oficina',
      'laptop',
    ],
  },
  {
    icon: 'shield',
    keywords: [
      'seguridad',
      'vigilancia',
      'vigilante',
      'porteria',
      'cerramiento',
      'acceso controlado',
    ],
  },
  { icon: 'lock', keywords: ['cerradura', 'candado', 'llave', 'llaves', 'lock'] },
  {
    icon: 'cleaning',
    keywords: ['servicio de limpieza', 'limpieza', 'aseo', 'servicio domestico'],
  },
  { icon: 'fridge', keywords: ['nevera', 'refrigerador', 'refrigeradora', 'refri', 'heladera'] },
  { icon: 'microwave', keywords: ['microondas', 'microonda', 'microwave'] },
  { icon: 'wardrobe', keywords: ['closet', 'armario', 'vestier', 'ropero'] },
  { icon: 'bath', keywords: ['bano', 'banos', 'sanitario', 'ducha', 'shower'] },
];

/**
 * Devuelve el icono representativo de una amenidad a partir de su nombre.
 * Coincide por palabras clave y sinónimos después de normalizar tildes,
 * mayúsculas y espacios. `check` es el respaldo seguro para textos libres.
 */
export function amenityIcon(name: string): IconName {
  const normalized = normalizeAmenityName(name);
  if (!normalized) return 'check';

  const padded = ` ${normalized} `;
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => padded.includes(` ${keyword} `))) {
      return rule.icon;
    }
  }
  return 'check';
}
