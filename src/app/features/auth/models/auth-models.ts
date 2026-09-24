import { UserStatus } from '../../../core/auth/identity-contract';

/** Contratos reales de los flujos públicos de `identity` (AuthController). */

export interface RegisterRequest {
  email: string;
  password: string;
}

/** Respuesta de `POST /api/v1/auth/register` (RegisterUserResult). */
export interface RegisterResult {
  userId: string;
  status: UserStatus;
  emailVerified: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
