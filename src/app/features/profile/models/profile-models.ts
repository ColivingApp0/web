/**
 * Contratos del contexto `profile` del backend (ProfileController + ProfileView).
 * Nota real del contrato: aunque el DTO se documenta como PATCH, la implementación
 * sobrescribe todos los campos con lo enviado (`Profile.update`) — el formulario
 * envía siempre el perfil completo para no borrar datos.
 */

export type GuestType = 'ESTUDIANTE' | 'TURISTA';

export type VerificationLevel = 'NO_VERIFICADO' | 'BASICO' | 'COMPLETO';

/** Respuesta de `GET/PATCH /api/v1/profile` y `PUT /api/v1/profile/privacy`. */
export interface ProfileView {
  userId: string;
  name: string | null;
  phone: string | null;
  guestType: GuestType | null;
  cityId: string | null;
  institutionId: string | null;
  facultyId: string | null;
  careerId: string | null;
  academicUnlisted: boolean;
  academicVisible: boolean;
  stayPreferenceCodes: string[];
  affinityVisible: boolean;
  verificationLevel: VerificationLevel;
}

/** Cuerpo de `PATCH /api/v1/profile` (UpdateProfileRequest), envío completo. */
export interface UpdateProfilePayload {
  name: string | null;
  phone: string | null;
  guestType: GuestType | null;
  cityId: string | null;
  institutionId: string | null;
  facultyId: string | null;
  careerId: string | null;
  academicUnlisted: boolean;
  stayPreferences: string[];
}

/** Cuerpo de `PUT /api/v1/profile/privacy` (ConfigurePrivacyRequest), envío completo. */
export interface ConfigurePrivacyPayload {
  affinityVisible: boolean;
  academicVisible: boolean;
}
