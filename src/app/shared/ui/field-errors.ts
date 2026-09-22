import { FieldTree } from '@angular/forms/signals';

/**
 * Primer mensaje de error visible de un campo de Signal Forms.
 * Devuelve `null` hasta que el campo ha sido tocado (interacción o intento de envío).
 */
export function firstFieldError<TValue>(field: FieldTree<TValue>): string | null {
  const state = field();
  if (!state.touched()) return null;
  const [error] = state.errors();
  return error ? (error.message ?? error.kind) : null;
}
