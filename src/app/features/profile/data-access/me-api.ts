import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  ConsentSummary,
  ConsentType,
  DocumentSummary,
  DocumentType,
} from '../../../core/auth/identity-contract';

interface ManageConsentBody {
  version: string;
  purpose: string;
  accept: boolean;
}

/** Acciones de identidad del usuario autenticado (MeController): consentimientos y documentos. */
@Service()
export class MeApi {
  private readonly http = inject(HttpClient);

  manageConsent(type: ConsentType, body: ManageConsentBody): Promise<ConsentSummary> {
    return firstValueFrom(
      this.http.put<ConsentSummary>(`${API_BASE}/users/me/consents/${type}`, body),
    );
  }

  uploadDocument(type: DocumentType, file: File): Promise<DocumentSummary> {
    const data = new FormData();
    data.append('type', type);
    data.append('file', file);
    return firstValueFrom(
      this.http.post<DocumentSummary>(`${API_BASE}/users/me/verification-documents`, data),
    );
  }
}
