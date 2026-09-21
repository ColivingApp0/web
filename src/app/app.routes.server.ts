import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Render modes por ruta (decisión explícita, no heredada del scaffold — ADR-004).
 *
 * - `` (landing): **Prerender**. Contenido estático de marketing sin dependencia
 *   de sesión en el marcado; el HTML se genera en build (mejor primer pintado,
 *   RNF-004) y se sirve como archivo estático, sin ejecutar Node en producción.
 * - Todo lo demás: **Client**. Las rutas de acceso/perfil dependen de
 *   `localStorage` y no aportan SEO; las rutas reales de descubrimiento (M2),
 *   área de anfitrión (M3), reservas (M4-A), mensajería/notificaciones (M4-B),
 *   comunidad/reputación (M5) y el área interna de administración (M6) también,
 *   porque exigen sesión y rol/pertenencia. Cada ruta nueva declara su modo al
 *   crearse con su justificación.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
