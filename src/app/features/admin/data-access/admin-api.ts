import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RoleSummary } from '../../../core/auth/identity-contract';
import { API_BASE } from '../../../core/http/api-base';
import {
  AdminPublicationView,
  BenefitRuleView,
  CaseDetailView,
  CaseFilters,
  CaseView,
  CatalogCategory,
  CatalogEntryView,
  DocumentStatus,
  DocumentType,
  ModerationMetricsView,
  PublicationStatus,
  ReviewDecision,
} from '../models/admin-models';

/** Documento de verificación tal como lo devuelve el endpoint administrativo. */
export interface AdminDocumentSummary {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
}

/**
 * Contratos del namespace administrativo real. Un único servicio de datos para
 * la feature: cada método es fino sobre `HttpClient` y no se importan modelos de
 * otras features (las proyecciones necesarias viven en `models/`).
 */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);

  // ---------- Moderación (RF-082) ----------

  listCases(filters: CaseFilters): Promise<CaseView[]> {
    return firstValueFrom(
      this.http.get<CaseView[]>(`${API_BASE}/admin/cases`, { params: caseParams(filters) }),
    );
  }

  caseDetail(caseId: string): Promise<CaseDetailView> {
    return firstValueFrom(this.http.get<CaseDetailView>(`${API_BASE}/admin/cases/${caseId}`));
  }

  assignCase(caseId: string): Promise<CaseView> {
    return firstValueFrom(
      this.http.post<CaseView>(`${API_BASE}/admin/cases/${caseId}/assign`, null),
    );
  }

  startCaseReview(caseId: string): Promise<CaseView> {
    return firstValueFrom(
      this.http.post<CaseView>(`${API_BASE}/admin/cases/${caseId}/review`, null),
    );
  }

  resolveCase(caseId: string, resolution: string): Promise<CaseView> {
    return firstValueFrom(
      this.http.post<CaseView>(`${API_BASE}/admin/cases/${caseId}/resolve`, { resolution }),
    );
  }

  rejectCase(caseId: string, reason: string): Promise<CaseView> {
    return firstValueFrom(
      this.http.post<CaseView>(`${API_BASE}/admin/cases/${caseId}/reject`, { reason }),
    );
  }

  /** Indicadores operativos de la cola (RF-084, alcance real del backend). */
  metrics(): Promise<ModerationMetricsView> {
    return firstValueFrom(this.http.get<ModerationMetricsView>(`${API_BASE}/admin/cases/metrics`));
  }

  // ---------- Documentos de verificación (RF-080) ----------

  listDocuments(status: DocumentStatus | null): Promise<AdminDocumentSummary[]> {
    const params = status === null ? undefined : new HttpParams({ fromObject: { status } });
    return firstValueFrom(
      this.http.get<AdminDocumentSummary[]>(`${API_BASE}/admin/verification-documents`, { params }),
    );
  }

  approveDocument(documentId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_BASE}/admin/verification-documents/${documentId}/approve`, null),
    );
  }

  rejectDocument(documentId: string, reason: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_BASE}/admin/verification-documents/${documentId}/reject`, {
        reason,
      }),
    );
  }

  requestDocumentCorrection(documentId: string, reason: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${API_BASE}/admin/verification-documents/${documentId}/request-correction`,
        { reason },
      ),
    );
  }

  // ---------- Publicaciones (RF-081) ----------

  publicationsQueue(status: PublicationStatus | null): Promise<AdminPublicationView[]> {
    const params = status === null ? undefined : new HttpParams({ fromObject: { status } });
    return firstValueFrom(
      this.http.get<AdminPublicationView[]>(`${API_BASE}/admin/publications`, { params }),
    );
  }

  reviewPublication(
    publicationId: string,
    decision: ReviewDecision,
    note: string | null,
  ): Promise<AdminPublicationView> {
    return firstValueFrom(
      this.http.post<AdminPublicationView>(
        `${API_BASE}/admin/publications/${publicationId}/review`,
        {
          decision,
          note,
        },
      ),
    );
  }

  // ---------- Catálogos (RF-083) ----------

  listCatalog(category: CatalogCategory, activeOnly: boolean): Promise<CatalogEntryView[]> {
    const params = new HttpParams({ fromObject: { activeOnly: String(activeOnly) } });
    return firstValueFrom(
      this.http.get<CatalogEntryView[]>(`${API_BASE}/admin/catalogs/${category}`, { params }),
    );
  }

  createCatalogEntry(
    category: CatalogCategory,
    payload: { code: string; name: string; description: string | null; parentId: string | null },
  ): Promise<CatalogEntryView> {
    return firstValueFrom(
      this.http.post<CatalogEntryView>(`${API_BASE}/admin/catalogs/${category}`, payload),
    );
  }

  updateCatalogEntry(
    category: CatalogCategory,
    entryId: string,
    payload: { name: string; description: string | null },
  ): Promise<CatalogEntryView> {
    return firstValueFrom(
      this.http.put<CatalogEntryView>(`${API_BASE}/admin/catalogs/${category}/${entryId}`, payload),
    );
  }

  /** `DELETE` = desactivar: el contrato real no expone reactivación. */
  deactivateCatalogEntry(category: CatalogCategory, entryId: string): Promise<CatalogEntryView> {
    return firstValueFrom(
      this.http.delete<CatalogEntryView>(`${API_BASE}/admin/catalogs/${category}/${entryId}`),
    );
  }

  // ---------- Reglas de beneficio (RF-073) ----------

  listBenefitRules(activeOnly: boolean): Promise<BenefitRuleView[]> {
    const params = new HttpParams({ fromObject: { activeOnly: String(activeOnly) } });
    return firstValueFrom(
      this.http.get<BenefitRuleView[]>(`${API_BASE}/admin/benefit-rules`, { params }),
    );
  }

  createBenefitRule(payload: {
    code: string;
    description: string | null;
    minScore: number;
  }): Promise<BenefitRuleView> {
    return firstValueFrom(
      this.http.post<BenefitRuleView>(`${API_BASE}/admin/benefit-rules`, payload),
    );
  }

  deactivateBenefitRule(ruleId: string): Promise<BenefitRuleView> {
    return firstValueFrom(
      this.http.post<BenefitRuleView>(`${API_BASE}/admin/benefit-rules/${ruleId}/deactivate`, null),
    );
  }

  // ---------- Descubrimiento fuera del alcance de M6 (no se usa en UI) ----------

  /** `GET /admin/roles`: la asignación de roles internos no está en RF-080..085. */
  listRoles(): Promise<RoleSummary[]> {
    return firstValueFrom(this.http.get<RoleSummary[]>(`${API_BASE}/admin/roles`));
  }
}

/**
 * Filtros reales de la cola → `query params` (los vacíos se omiten; el backend
 * acepta `onlyOpen`).
 */
function caseParams(filters: CaseFilters): HttpParams {
  const entries: Record<string, string> = {};
  if (filters.type !== '') entries['type'] = filters.type;
  if (filters.status !== '') entries['status'] = filters.status;
  if (filters.priority !== '') entries['priority'] = filters.priority;
  const assignee = filters.assigneeUserId.trim();
  if (assignee !== '') entries['assigneeUserId'] = assignee;
  if (filters.onlyOpen) entries['onlyOpen'] = 'true';
  return new HttpParams({ fromObject: entries });
}
