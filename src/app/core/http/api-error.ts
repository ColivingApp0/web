import { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error del backend (shared/presentation/dto/ErrorResponse.kt). */
interface ErrorResponseBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string> | null;
}

/** Error normalizado de la API, listo para UI. */
export interface ApiError {
  /** Código HTTP (0 si no hubo respuesta). */
  status: number;
  /** Código de negocio del backend (`UNAUTHORIZED`, `CONFLICT`, `VALIDATION_ERROR`, ...) o derivado. */
  code: string;
  message: string;
  /** Errores por campo de la validación del backend (vacío si no aplica). */
  fieldErrors: Record<string, string>;
}

function hasStringProperty(value: object, key: string): boolean {
  return typeof (value as Record<string, unknown>)[key] === 'string';
}

function isErrorResponseBody(body: unknown): body is ErrorResponseBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    hasStringProperty(body, 'code') &&
    hasStringProperty(body, 'message')
  );
}

function isMessageBody(body: unknown): body is { message: string } {
  return typeof body === 'object' && body !== null && hasStringProperty(body, 'message');
}

/**
 * Normaliza cualquier fallo HTTP a [ApiError].
 *
 * Casos reales del backend:
 * - `ErrorResponse {code, message, fieldErrors?}` (GlobalExceptionHandler).
 * - 401/403 del filtro de seguridad: solo `{message}` → se deriva el código del status.
 * - Sin respuesta (red caída): status 0.
 */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 0,
      code: 'UNKNOWN',
      message: 'Ha ocurrido un error inesperado.',
      fieldErrors: {},
    };
  }
  if (error.status === 0) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      fieldErrors: {},
    };
  }
  const body: unknown = error.error;
  if (isErrorResponseBody(body)) {
    return {
      status: error.status,
      code: body.code,
      message: body.message,
      fieldErrors: body.fieldErrors ?? {},
    };
  }
  if (isMessageBody(body)) {
    return {
      status: error.status,
      code: codeFromStatus(error.status),
      message: body.message,
      fieldErrors: {},
    };
  }
  return {
    status: error.status,
    code: codeFromStatus(error.status),
    message: `Error inesperado (${error.status}).`,
    fieldErrors: {},
  };
}

function codeFromStatus(status: number): string {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'UNKNOWN';
  }
}
