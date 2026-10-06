import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth-guards';
import { FavoritesStore } from './features/listings/state/favorites-store';
import { HostPublicationsStore } from './features/host/state/host-publications-store';
import { AppShell } from './layout/app-shell';
import { AuthLayout } from './layout/auth-layout';

export const routes: Routes = [
  // Landing pública, estática y prerenderizada en build (ADR-004).
  {
    path: '',
    pathMatch: 'full',
    title: 'ColivinApp | Vive, conecta y comparte',
    loadComponent: () =>
      import('./features/marketing/pages/landing-page').then((m) => m.LandingPage),
  },

  // Zona pública de acceso (solo invitados).
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: 'entrar',
        title: 'Iniciar sesión | ColivinApp',
        loadComponent: () => import('./features/auth/pages/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'registro',
        title: 'Crear cuenta | ColivinApp',
        loadComponent: () =>
          import('./features/auth/pages/register-page').then((m) => m.RegisterPage),
      },
      {
        path: 'verificar-correo',
        title: 'Verificar correo | ColivinApp',
        loadComponent: () =>
          import('./features/auth/pages/verify-email-page').then((m) => m.VerifyEmailPage),
      },
      {
        path: 'recuperar',
        title: 'Recuperar contraseña | ColivinApp',
        loadComponent: () =>
          import('./features/auth/pages/request-reset-page').then((m) => m.RequestResetPage),
      },
      {
        path: 'restablecer-password',
        title: 'Restablecer contraseña | ColivinApp',
        loadComponent: () =>
          import('./features/auth/pages/reset-password-page').then((m) => m.ResetPasswordPage),
      },
    ],
  },

  // Zona autenticada (M1: perfil; M3-M6 añadirán más secciones).
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: 'perfil',
        title: 'Mi perfil | ColivinApp',
        loadComponent: () =>
          import('./features/profile/pages/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'perfil/verificacion',
        title: 'Verificación | ColivinApp',
        loadComponent: () =>
          import('./features/profile/pages/verification-page').then((m) => m.VerificationPage),
      },
      {
        path: 'alojamientos',
        title: 'Alojamientos | ColivinApp',
        providers: [FavoritesStore],
        loadComponent: () =>
          import('./features/listings/pages/search-page').then((m) => m.SearchPage),
      },
      {
        path: 'alojamientos/:id',
        title: 'Alojamiento | ColivinApp',
        providers: [FavoritesStore],
        loadComponent: () =>
          import('./features/listings/pages/detail-page').then((m) => m.DetailPage),
      },
      {
        path: 'favoritos',
        title: 'Favoritos | ColivinApp',
        providers: [FavoritesStore],
        loadComponent: () =>
          import('./features/listings/pages/favorites-page').then((m) => m.FavoritesPage),
      },
      {
        // Directorio público de ciudades y universidades (API-Colombia), apoyo al
        // descubrimiento (RF-030): permite explorar el catálogo real de ciudades y
        // universidades mientras el filtro del backend no puede consumirlo.
        path: 'directorio',
        title: 'Directorio de ciudades y universidades | ColivinApp',
        loadComponent: () =>
          import('./features/directory/pages/directory-page').then((m) => m.DirectoryPage),
      },

      {
        // Reservas del huésped (contexto `booking`): crear y seguir solicitudes.
        path: 'reservas',
        title: 'Mis reservas | ColivinApp',
        loadComponent: () =>
          import('./features/bookings/pages/my-reservations-page').then(
            (m) => m.MyReservationsPage,
          ),
      },
      {
        path: 'reservas/nueva',
        title: 'Solicitar reserva | ColivinApp',
        loadComponent: () =>
          import('./features/bookings/pages/new-reservation-page').then(
            (m) => m.NewReservationPage,
          ),
      },
      {
        // Mensajería (contexto `messaging`): cualquier usuario autenticado; la
        // pertenencia al hilo la decide el backend (no hay gate de rol).
        path: 'mensajes',
        title: 'Mensajes | ColivinApp',
        loadComponent: () =>
          import('./features/messaging/pages/conversations-page').then((m) => m.ConversationsPage),
      },
      {
        path: 'mensajes/nueva',
        title: 'Abrir conversación | ColivinApp',
        loadComponent: () =>
          import('./features/messaging/pages/open-conversation-page').then(
            (m) => m.OpenConversationPage,
          ),
      },
      {
        path: 'mensajes/:id',
        title: 'Conversación | ColivinApp',
        loadComponent: () =>
          import('./features/messaging/pages/conversation-page').then((m) => m.ConversationPage),
      },
      {
        path: 'notificaciones',
        title: 'Notificaciones | ColivinApp',
        loadComponent: () =>
          import('./features/messaging/pages/notifications-page').then((m) => m.NotificationsPage),
      },
      {
        // Comunidad (contexto `community`): residente (RF-061/RF-062).
        path: 'comunidad',
        title: 'Mi comunidad | ColivinApp',
        loadComponent: () =>
          import('./features/community/pages/my-activities-page').then((m) => m.MyActivitiesPage),
      },
      {
        path: 'comunidad/:id',
        title: 'Actividad | ColivinApp',
        loadComponent: () =>
          import('./features/community/pages/activity-detail-page').then(
            (m) => m.ActivityDetailPage,
          ),
      },
      {
        // Reputación (contexto `reputation`): RF-070, RF-071 y RF-072.
        path: 'reputacion',
        title: 'Mi reputación | ColivinApp',
        loadComponent: () =>
          import('./features/reputation/pages/reputation-page').then((m) => m.ReputationPage),
      },
      {
        path: 'reputacion/evaluaciones',
        title: 'Mis evaluaciones | ColivinApp',
        loadComponent: () =>
          import('./features/reputation/pages/evaluations-page').then((m) => m.EvaluationsPage),
      },
      {
        path: 'reputacion/evaluar',
        title: 'Evaluar estancia | ColivinApp',
        loadComponent: () =>
          import('./features/reputation/pages/evaluate-page').then((m) => m.EvaluatePage),
      },
      {
        path: 'reputacion/usuario/:id',
        title: 'Reputación | ColivinApp',
        loadComponent: () =>
          import('./features/reputation/pages/reputation-page').then((m) => m.ReputationPage),
      },
      {
        // Área de anfitrión: exige rol activo ANFITRION (el backend lo revalida en cada endpoint).
        path: 'anfitrion',
        canActivate: [roleGuard('ANFITRION')],
        providers: [HostPublicationsStore],
        children: [
          {
            path: '',
            title: 'Área de anfitrión | ColivinApp',
            loadComponent: () =>
              import('./features/host/pages/host-dashboard-page').then((m) => m.HostDashboardPage),
          },
          {
            path: 'propiedades/:propertyId',
            title: 'Propiedad | ColivinApp',
            loadComponent: () =>
              import('./features/host/pages/property-page').then((m) => m.HostPropertyPage),
          },
          {
            path: 'propiedades/:propertyId/unidades/:unitId',
            title: 'Unidad | ColivinApp',
            loadComponent: () =>
              import('./features/host/pages/unit-page').then((m) => m.HostUnitPage),
          },
          {
            // Bandeja de reservas recibidas (contexto `booking`, vista del anfitrión).
            path: 'reservas',
            title: 'Reservas recibidas | ColivinApp',
            loadComponent: () =>
              import('./features/bookings/pages/host-reservations-page').then(
                (m) => m.HostReservationsPage,
              ),
          },
          {
            // Comunidad del anfitrión (RF-060): actividades de sus propiedades.
            path: 'comunidad',
            title: 'Comunidad | ColivinApp',
            loadComponent: () =>
              import('./features/community/pages/host-community-page').then(
                (m) => m.HostCommunityPage,
              ),
          },
        ],
      },
      {
        // Área interna: exige rol activo MODERADOR o ADMINISTRADOR (el backend lo
        // revalida en cada endpoint de /api/v1/admin/**; aquí solo se evita navegar
        // a superficies que responderían 403).
        path: 'admin',
        canActivate: [roleGuard('MODERADOR', 'ADMINISTRADOR')],
        children: [
          {
            path: '',
            title: 'Administración | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/admin-dashboard-page').then(
                (m) => m.AdminDashboardPage,
              ),
          },
          {
            path: 'casos',
            title: 'Casos y disputas | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/cases-page').then((m) => m.CasesPage),
          },
          {
            path: 'casos/:id',
            title: 'Caso | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/case-detail-page').then((m) => m.CaseDetailPage),
          },
          {
            path: 'documentos',
            title: 'Documentos de verificación | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/documents-page').then((m) => m.DocumentsPage),
          },
          {
            path: 'publicaciones',
            title: 'Moderación de publicaciones | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/publications-page').then((m) => m.PublicationsPage),
          },
          {
            path: 'catalogos',
            title: 'Catálogos | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/catalogs-page').then((m) => m.CatalogsPage),
          },
          {
            path: 'beneficios',
            title: 'Reglas de beneficio | ColivinApp',
            loadComponent: () =>
              import('./features/admin/pages/benefit-rules-page').then((m) => m.BenefitRulesPage),
          },
        ],
      },
      {
        path: 'seleccionar-rol',
        title: 'Elegir rol | ColivinApp',
        loadComponent: () =>
          import('./features/auth/pages/select-role-page').then((m) => m.SelectRolePage),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
