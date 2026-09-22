/**
 * Base URL de la API de ColivinApp.
 *
 * Relativa a propósito: en desarrollo el dev-server proxya `/api` → `http://localhost:8080`
 * (`proxy.conf.json`) y en producción se asume same-origin (ADR-001). El backend no tiene CORS.
 */
export const API_BASE = '/api/v1';
