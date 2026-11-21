/** Textos de conteo en español, sin duplicar `(s)` en la interfaz. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function placesLabel(count: number): string {
  return pluralize(count, 'plaza', 'plazas');
}

export function roomsLabel(count: number): string {
  return pluralize(count, 'habitación', 'habitaciones');
}

export function roomsFoundLabel(count: number): string {
  return `${pluralize(count, 'habitación encontrada', 'habitaciones encontradas')}`;
}

/** «1 habitación publicada» / «2 habitaciones publicadas». */
export function publishedRoomsLabel(count: number): string {
  return pluralize(count, 'habitación publicada', 'habitaciones publicadas');
}

/** «1 plaza ocupada» / «2 plazas ocupadas». */
export function occupiedPlacesLabel(count: number): string {
  return pluralize(count, 'plaza ocupada', 'plazas ocupadas');
}

/** «1 plaza libre» / «2 plazas libres». */
export function freePlacesLabel(count: number): string {
  return pluralize(count, 'plaza libre', 'plazas libres');
}

/** «1 plaza solicitada» / «2 plazas solicitadas». */
export function requestedPlacesLabel(count: number): string {
  return pluralize(count, 'plaza solicitada', 'plazas solicitadas');
}

export function requestsLabel(count: number): string {
  return pluralize(count, 'solicitud', 'solicitudes');
}

export function messagesLabel(count: number): string {
  return pluralize(count, 'mensaje', 'mensajes');
}
