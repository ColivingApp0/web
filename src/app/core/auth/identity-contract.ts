/**
 * Contrato del contexto `identity` del backend, tal y como lo consume la sesión
 * y las funcionalidades de auth/perfil. Refleja los DTOs y enums reales de
 * `api/.../identity/` (no inventar campos: ampliar solo leyendo el backend).
 */

export type UserStatus = 'PENDING_EMAIL_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

/** Roles del SRS v3.0. `VISITANTE` no es un rol persistido. */
export type RoleCode =
  | 'HUESPED_ESTUDIANTE'
  | 'HUESPED_TURISTA'
  | 'ANFITRION'
  | 'RESIDENTE'
  | 'MODERADOR'
  | 'ADMINISTRADOR';

export type ConsentType = 'TERMINOS' | 'PRIVACIDAD' | 'TRATAMIENTO_DATOS';

export type DocumentType = 'IDENTIDAD' | 'CERTIFICADO_ACADEMICO' | 'COMPROBANTE_ESTUDIO';

export type DocumentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CORRECCION_SOLICITADA';

export interface RoleSummary {
  id: string;
  code: RoleCode;
  name: string;
}

export interface UserRoleSummary {
  id: string;
  roleId: string;
  code: RoleCode;
  name: string;
  active: boolean;
  assignedAt: string;
}

export interface LoginUserSummary {
  userId: string;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  activeRoles: RoleSummary[];
}

/** Respuesta de `POST /api/v1/auth/login`. */
export interface LoginResult {
  token: string;
  expiresAt: string;
  user: LoginUserSummary;
}

export interface ConsentSummary {
  type: ConsentType;
  version: string;
  purpose: string;
  accepted: boolean;
  timestamp: string;
}

export interface DocumentSummary {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
}

/** Respuesta de `GET /api/v1/users/me` (CurrentUserResult). */
export interface CurrentUserResult {
  userId: string;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  roles: UserRoleSummary[];
  activeRole: UserRoleSummary | null;
  consents: ConsentSummary[];
  documents: DocumentSummary[];
}

/** Respuesta de `PUT /api/v1/users/me/role` (SelectRoleResult). */
export interface SelectRoleResult {
  userId: string;
  activeRole: UserRoleSummary;
}
