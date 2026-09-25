import { ConsentType } from '../../../core/auth/identity-contract';

/**
 * Metadatos de los consentimientos (RF-005).
 *
 * El backend exige `version` + `purpose` en cada aceptación pero no define sus
 * valores (los almacena como historial auditable). Estos textos y versiones los
 * aporta el frontend mientras no existan documentos legales versionados; deben
 * revisarse cuando el equipo de producto los publique.
 */
export interface ConsentDocument {
  type: ConsentType;
  title: string;
  description: string;
  version: string;
  purpose: string;
}

export const CONSENT_DOCUMENTS: readonly ConsentDocument[] = [
  {
    type: 'TERMINOS',
    title: 'Términos de uso',
    description: 'Reglas de uso de la plataforma para huéspedes y anfitriones.',
    version: '1.0',
    purpose: 'Aceptación de los términos de uso',
  },
  {
    type: 'PRIVACIDAD',
    title: 'Política de privacidad',
    description: 'Cómo tratamos y protegemos tu información personal.',
    version: '1.0',
    purpose: 'Aceptación de la política de privacidad',
  },
  {
    type: 'TRATAMIENTO_DATOS',
    title: 'Tratamiento de datos personales',
    description: 'Autorización para el tratamiento de tus datos personales.',
    version: '1.0',
    purpose: 'Autorización de tratamiento de datos personales',
  },
];
