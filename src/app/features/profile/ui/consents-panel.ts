import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthSession } from '../../../core/auth/auth-session';
import { ConsentSummary, ConsentType } from '../../../core/auth/identity-contract';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { MeApi } from '../data-access/me-api';
import { CONSENT_DOCUMENTS, ConsentDocument } from '../models/consent-documents';

/** Consentimientos del usuario (RF-005): aceptar o revocar cada autorización. */
@Component({
  selector: 'app-consents-panel',
  imports: [DatePipe, UiAlert, UiButton],
  templateUrl: './consents-panel.html',
})
export class ConsentsPanel {
  protected readonly session = inject(AuthSession);
  private readonly meApi = inject(MeApi);

  protected readonly documents = CONSENT_DOCUMENTS;
  protected readonly busyType = signal<ConsentType | null>(null);
  protected readonly serverError = signal<string | null>(null);

  protected statusFor(type: ConsentType): ConsentSummary | null {
    return this.session.user()?.consents.find((consent) => consent.type === type) ?? null;
  }

  protected async toggle(doc: ConsentDocument): Promise<void> {
    const current = this.statusFor(doc.type);
    const accept = !(current?.accepted ?? false);
    this.busyType.set(doc.type);
    this.serverError.set(null);
    try {
      await this.meApi.manageConsent(doc.type, {
        version: doc.version,
        purpose: doc.purpose,
        accept,
      });
      await this.session.refresh();
    } catch (error) {
      this.serverError.set(toApiError(error).message);
    } finally {
      this.busyType.set(null);
    }
  }
}
