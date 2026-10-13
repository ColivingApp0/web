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

export function requestsLabel(count: number): string {
  return pluralize(count, 'solicitud', 'solicitudes');
}

export function messagesLabel(count: number): string {
  return pluralize(count, 'mensaje', 'mensajes');
}
