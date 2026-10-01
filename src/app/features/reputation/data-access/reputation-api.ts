import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  CreateEvaluationPayload,
  EvaluationView,
  ReputationView,
} from '../models/reputation-models';

/**
 * Endpoints del contexto `reputation` (RF-070, RF-071, RF-072).
 *
 * Ninguno exige rol: la elegibilidad (partes de una reserva `CONFIRMADA`), la
 * autoría del sujeto y la propiedad de la disputa las decide el servicio de
 * aplicación (403/404/409).
 *
 * **No se usa** la administración de reglas de beneficio (RF-073):
 * `/api/v1/admin/benefit-rules` pertenece a Administración (M6). Los beneficios
 * vigentes llegan de solo lectura dentro de `ReputationView.benefits`.
 */
@Service()
export class ReputationApi {
  private readonly http = inject(HttpClient);

  createEvaluation(payload: CreateEvaluationPayload): Promise<EvaluationView> {
    return firstValueFrom(this.http.post<EvaluationView>(`${API_BASE}/reviews`, payload));
  }

  /** Evaluaciones que escribí (orden `createdAt` desc; sin paginación). */
  listWritten(): Promise<EvaluationView[]> {
    return firstValueFrom(this.http.get<EvaluationView[]>(`${API_BASE}/reviews/mine`));
  }

  /** Evaluaciones recibidas por un usuario (público a cualquier autenticado). */
  listReceived(userId: string): Promise<EvaluationView[]> {
    return firstValueFrom(
      this.http.get<EvaluationView[]>(`${API_BASE}/reviews/received/${userId}`),
    );
  }

  disputeEvaluation(evaluationId: string, reason: string): Promise<EvaluationView> {
    return firstValueFrom(
      this.http.post<EvaluationView>(`${API_BASE}/reviews/${evaluationId}/dispute`, { reason }),
    );
  }

  /**
   * Reputación de un usuario: **una lectura por visita o por acción explícita**
   * (el backend guarda un snapshot en cada cálculo).
   */
  reputation(userId: string): Promise<ReputationView> {
    return firstValueFrom(this.http.get<ReputationView>(`${API_BASE}/users/${userId}/reputation`));
  }
}
