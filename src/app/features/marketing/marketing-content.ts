/**
 * Contenido estático de marketing (Fase A de M2).
 *
 * Nota: las tarjetas de ejemplo ilustran el producto; **no** muestran precios
 * (decisión del proyecto: el marketing no usa cifras reales — el precio real es
 * `basePricePerNight` y vivirá en búsqueda/detalle). Las imágenes remotas son
 * marcadores de posición hasta integrar contenido real (las publicaciones del
 * backend aún no gestionan fotografías).
 */

export interface ExampleListing {
  id: string;
  title: string;
  city: string;
  institution: string;
  faculty: string;
  score: number;
  compatibility: number;
  residents: number;
  image: string;
  services: string[];
  badge?: string;
}

export const EXAMPLE_LISTINGS: readonly ExampleListing[] = [
  {
    id: 'demo-1',
    title: 'Apartamento universitario en Chapinero',
    city: 'Bogotá',
    institution: 'Universidad Javeriana',
    faculty: 'Ingeniería',
    score: 4.9,
    compatibility: 96,
    residents: 3,
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85',
    services: ['WiFi', 'Amoblado', 'Cocina', 'Lavadora'],
    badge: 'Más popular',
  },
  {
    id: 'demo-2',
    title: 'Casa compartida cerca del campus',
    city: 'Medellín',
    institution: 'Universidad EAFIT',
    faculty: 'Negocios',
    score: 4.8,
    compatibility: 91,
    residents: 4,
    image:
      'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=85',
    services: ['WiFi', 'Terraza', 'Seguridad', 'Parqueadero'],
    badge: 'Nuevo',
  },
  {
    id: 'demo-3',
    title: 'Habitación luminosa para estudiantes',
    city: 'Cali',
    institution: 'Universidad del Valle',
    faculty: 'Ciencias Sociales',
    score: 4.7,
    compatibility: 88,
    residents: 2,
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85',
    services: ['WiFi', 'Escritorio', 'Cocina', 'Balcón'],
  },
  {
    id: 'demo-4',
    title: 'Loft moderno junto a universidades',
    city: 'Bogotá',
    institution: 'Universidad Nacional',
    faculty: 'Arquitectura',
    score: 4.9,
    compatibility: 94,
    residents: 2,
    image:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=85',
    services: ['WiFi', 'Gym', 'Coworking', 'Seguridad'],
  },
];

export interface MarketingCategory {
  icon: string;
  title: string;
  subtitle: string;
}

export const CATEGORIES: readonly MarketingCategory[] = [
  { icon: '🎓', title: 'Cerca de universidades', subtitle: 'A pocos minutos de tu campus' },
  { icon: '🧑‍🤝‍🧑', title: 'Compartidos', subtitle: 'Conecta con personas compatibles' },
  { icon: '🏡', title: 'Habitaciones', subtitle: 'Espacios listos para mudarte' },
  { icon: '🌆', title: 'Por ciudad', subtitle: 'Bogotá, Medellín, Cali y más' },
];

export interface MarketingStep {
  number: string;
  icon: string;
  title: string;
  text: string;
}

export const STEPS: readonly MarketingStep[] = [
  {
    number: '01',
    icon: '🔎',
    title: 'Busca',
    text: 'Indica ciudad, universidad, presupuesto y preferencias.',
  },
  {
    number: '02',
    icon: '🤝',
    title: 'Conecta',
    text: 'Compara espacios y descubre tu compatibilidad social.',
  },
  {
    number: '03',
    icon: '🏡',
    title: 'Reserva',
    text: 'Habla con el anfitrión y solicita con información clara.',
  },
];

export interface Testimonial {
  name: string;
  role: string;
  initials: string;
  text: string;
}

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: 'Laura Martínez',
    role: 'Estudiante de Ingeniería',
    initials: 'LM',
    text: 'Encontré compañeros con gustos muy parecidos a los míos y pude mudarme sin complicaciones.',
  },
  {
    name: 'Daniel Rojas',
    role: 'Anfitrión',
    initials: 'DR',
    text: 'La plataforma hace mucho más sencillo gestionar solicitudes y mantener una comunidad sana.',
  },
  {
    name: 'Sofía Gómez',
    role: 'Turista',
    initials: 'SG',
    text: 'Me gustó poder comparar hospedajes y conocer las reglas de cada espacio antes de solicitar.',
  },
];

export const TRUST_ITEMS: readonly string[] = [
  'Alojamientos verificados',
  'Comunidad confiable',
  'Score que te recompensa',
];

export const COMMUNITY_BENEFITS: readonly string[] = [
  'Preferencias de convivencia claras',
  'Score basado en comportamiento y confianza',
  'Actividades para conocer a tu comunidad',
  'Mensajería entre estudiantes y anfitriones',
];
