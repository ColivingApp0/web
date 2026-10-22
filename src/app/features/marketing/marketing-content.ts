import { IconName } from '../../shared/ui/icon';

/**
 * Contenido estático de marketing. Las tarjetas ilustran habitaciones reales
 * del modelo mensual (precio por mes, plazas y características) con imágenes
 * locales de muestra; no son datos de la API.
 */

export interface ExampleListing {
  id: string;
  propertyTitle: string;
  roomTitle: string;
  city: string;
  neighborhood: string;
  monthlyPrice: number;
  priceUnit: 'persona' | 'habitación';
  capacity: number;
  availablePlaces: number;
  image: string;
  features: string[];
  badge?: string;
}

export const EXAMPLE_LISTINGS: readonly ExampleListing[] = [
  {
    id: 'demo-1',
    propertyTitle: 'Casa Chapinero Alto',
    roomTitle: 'Habitación compartida para dos',
    city: 'Bogotá',
    neighborhood: 'Chapinero Alto',
    monthlyPrice: 780000,
    priceUnit: 'persona',
    capacity: 2,
    availablePlaces: 1,
    image: '/images/rooms/room-03.jpg',
    features: ['Ventilador', 'Baño compartido', 'Cocina'],
    badge: 'Últimas plazas',
  },
  {
    id: 'demo-2',
    propertyTitle: 'Casa Laureles',
    roomTitle: 'Habitación compartida para cuatro',
    city: 'Medellín',
    neighborhood: 'Laureles',
    monthlyPrice: 620000,
    priceUnit: 'persona',
    capacity: 4,
    availablePlaces: 2,
    image: '/images/rooms/room-04.jpg',
    features: ['Aire acondicionado', 'Patio', 'WiFi'],
    badge: 'Disponible',
  },
  {
    id: 'demo-3',
    propertyTitle: 'Habitación El Poblado',
    roomTitle: 'Habitación privada con baño',
    city: 'Medellín',
    neighborhood: 'El Poblado',
    monthlyPrice: 1550000,
    priceUnit: 'habitación',
    capacity: 1,
    availablePlaces: 1,
    image: '/images/rooms/room-05.jpg',
    features: ['Baño privado', 'Aire acondicionado', 'Coworking'],
  },
  {
    id: 'demo-4',
    propertyTitle: 'Loft Norte',
    roomTitle: 'Habitación compartida Loft Norte',
    city: 'Bogotá',
    neighborhood: 'Norte',
    monthlyPrice: 860000,
    priceUnit: 'persona',
    capacity: 2,
    availablePlaces: 2,
    image: '/images/rooms/room-09.jpg',
    features: ['Aire acondicionado', 'Coworking', 'Gimnasio'],
  },
];

export interface MarketingCategory {
  icon: IconName;
  title: string;
  subtitle: string;
}

export const CATEGORIES: readonly MarketingCategory[] = [
  { icon: 'building', title: 'Cerca de universidades', subtitle: 'A pocos minutos de tu campus' },
  { icon: 'users', title: 'Compartidas', subtitle: 'Conecta con personas compatibles' },
  { icon: 'bed', title: 'Habitaciones', subtitle: 'Espacios listos para mudarte' },
  { icon: 'map-pin', title: 'Por ciudad', subtitle: 'Bogotá, Medellín, Cali y más' },
];

export interface MarketingStep {
  number: string;
  icon: IconName;
  title: string;
  text: string;
}

export const STEPS: readonly MarketingStep[] = [
  {
    number: '01',
    icon: 'search',
    title: 'Busca',
    text: 'Indica ciudad o zona y el presupuesto mensual que tienes.',
  },
  {
    number: '02',
    icon: 'message',
    title: 'Conecta',
    text: 'Compara habitaciones, plazas y características; pregunta al anfitrión.',
  },
  {
    number: '03',
    icon: 'key',
    title: 'Solicita',
    text: 'Envía una solicitud por una plaza. El anfitrión decide y la ocupación se actualiza.',
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
    text: 'Encontré una habitación compartida con un precio mensual claro y pude hablar con la anfitriona antes de solicitar.',
  },
  {
    name: 'Daniel Rojas',
    role: 'Anfitrión',
    initials: 'DR',
    text: 'Publicar cada habitación por separado y pausar la que estoy remodelando hace que todo sea mucho más simple.',
  },
  {
    name: 'Sofía Gómez',
    role: 'Estudiante',
    initials: 'SG',
    text: 'Me gustó ver cuántas plazas quedan libres y con quién compartiría antes de enviar la solicitud.',
  },
];

export const TRUST_ITEMS: readonly string[] = [
  'Precio mensual claro',
  'Plazas y ocupación visibles',
  'Perfiles de residentes con consentimiento',
];

export const COMMUNITY_BENEFITS: readonly string[] = [
  'Habitaciones con características propias',
  'Solicitudes sencillas y sin fechas',
  'Mensajería directa con el anfitrión',
  'Compañeros de habitación solo si autorizan su perfil',
];
