import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, validate } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { ReputationApi } from '../data-access/reputation-api';
import {
  EVALUATION_CATEGORIES,
  EVALUATION_CATEGORY_LABELS,
  EvaluationCategory,
  MAX_RATING,
  MIN_RATING,
  emptyRatings,
  evaluationCommentError,
  hasEvaluatedRelation,
} from '../models/reputation-models';
import { RatingInput } from '../ui/rating-input';

interface CommentModel {
  comment: string;
}

/**
 * Evaluar la estancia de una reserva confirmada (`POST /reviews`, RF-070).
 * Se llega con `?relacion=<idReserva>` (y `desde`/`hasta` solo para mostrar el
 * contexto). El sujeto evaluado **no** se elige: lo deriva el backend como la
 * contraparte de la reserva.
 *
 * Las cinco categorías son obligatorias (1..5) y solo se admite **una evaluación
 * por autor y evento**: antes de mostrar el formulario se comprueba en
 * `GET /reviews/mine` si esa reserva ya está evaluada.
 */
@Component({
  selector: 'app-evaluate-page',
  imports: [RouterLink, UiAlert, UiButton, UiFormField, RatingInput, SignalFormField, FormRoot],
  templateUrl: './evaluate-page.html',
})
export class EvaluatePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ReputationApi);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly relationId = computed(() => this.queryParams().get('relacion') ?? '');
  protected readonly minRating = MIN_RATING;
  protected readonly maxRating = MAX_RATING;

  protected readonly writtenResource = resource({ loader: () => this.api.listWritten() });
  protected readonly alreadyEvaluated = computed(() =>
    hasEvaluatedRelation(this.relationId(), this.writtenResource.value() ?? []),
  );
  protected readonly checking = computed(() => this.writtenResource.isLoading());

  protected readonly ratings = signal<Record<EvaluationCategory, number>>(emptyRatings());
  protected readonly categories = EVALUATION_CATEGORIES;
  protected readonly categoryLabels = EVALUATION_CATEGORY_LABELS;

  private readonly commentModel = signal<CommentModel>({ comment: '' });
  protected readonly commentForm = form(this.commentModel, (path) => {
    validate(path.comment, ({ value }) => {
      const message = evaluationCommentError(value());
      return message === null ? null : { kind: 'comment', message };
    });
  });
  protected readonly commentError = computed(() => firstFieldError(this.commentForm.comment));

  protected readonly submitting = signal(false);
  protected readonly ratingsIssue = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected ratingOf(category: EvaluationCategory): number {
    return this.ratings()[category] ?? 0;
  }

  protected setRating(category: EvaluationCategory, value: number): void {
    this.ratings.update((current) => ({ ...current, [category]: value }));
    this.ratingsIssue.set(null);
  }

  protected async submit(): Promise<void> {
    const relationId = this.relationId();
    if (relationId === '') {
      this.error.set('Falta la estancia a evaluar: entra desde una de tus reservas confirmadas.');
      return;
    }
    if (!this.isComplete()) {
      this.ratingsIssue.set('Puntúa las cinco categorías (de 1 a 5) antes de enviar.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const comment = this.commentModel().comment.trim();
    try {
      await this.api.createEvaluation({
        relationType: 'ESTANCIA',
        relationId,
        ratings: this.ratings(),
        comment: comment === '' ? null : comment,
      });
      await this.router.navigate(['/reputacion/evaluaciones']);
    } catch (error) {
      const apiError = toApiError(error);
      this.error.set(
        apiError.status === 409
          ? `El servidor no aceptó la evaluación (${apiError.code}): ${apiError.message}.`
          : apiError.status === 403
            ? 'Solo las partes de una estancia confirmada pueden evaluarla.'
            : apiError.status === 404
              ? 'No encontramos esa estancia.'
              : apiError.message,
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private isComplete(): boolean {
    const current = this.ratings();
    return EVALUATION_CATEGORIES.every((category) => {
      const value = current[category] ?? 0;
      return value >= MIN_RATING && value <= MAX_RATING;
    });
  }

  protected retry(): void {
    this.writtenResource.reload();
  }
}
