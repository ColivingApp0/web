/**
 * Traducción de los errores reales del namespace administrativo a mensajes de
 * UI. Vive en `data-access` porque interpreta la respuesta del backend y lo usan
 * varias superficies (casos, documentos, publicaciones, catálogos, beneficios).
 *
 * Contrato vigente tras la estabilización F0 del backend (ADR-008): revisar una
 * publicación que no está `EN_REVISION` o aprobar un documento ya resuelto
 * responde **409** `CONFLICT` (antes 500 con traza) y un **500** solo aparece
 * ante un fallo imprevisto, con mensaje genérico y sin detalle interno. La UI no
 * compensa nada: lo declara.
 */
export function describeAdminError(status: number, code: string, message: string): string {
  if (status === 400) {
    return `El servidor rechazó la acción (${code}): ${message}.`;
  }
  if (status === 403) {
    return 'Tu sesión no tiene permisos internos para esta acción.';
  }
  if (status === 404) {
    return 'El recurso ya no existe: actualizamos la información.';
  }
  if (status === 409) {
    return `La acción no es posible en el estado actual (${code}): ${message}.`;
  }
  if (status === 500) {
    return `El servidor devolvió un error interno (500) y la acción no se completó. Detalle: ${message}`;
  }
  return message;
}
