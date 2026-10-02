import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { AdminApi } from '../data-access/admin-api';
import { describeAdminError } from '../data-access/admin-errors';
import {
  CATALOG_CATEGORY_LABELS,
  CatalogCategory,
  CatalogEntryView,
  DOCUMENTED_CATALOG_CATEGORIES,
  MAX_CATALOG_CODE_LENGTH,
  MAX_CATALOG_DESCRIPTION_LENGTH,
  MAX_CATALOG_NAME_LENGTH,
  catalogCodeError,
  catalogDescriptionError,
  catalogNameError,
  catalogParentCategory,
  catalogParentError,
} from '../models/admin-models';

/**
 * Catálogos del piloto (RF-083): instituciones, facultades, carreras, ciudades,
 * servicios y reglas (las seis categorías que documenta el SRS). Las entradas se
 * crean, se editan (nombre y descripción) y se **desactivan**: el contrato real
 * no expone reactivación, así que la UI lo declara en lugar de inventarla.
 *
 * La categoría y «mostrar inactivas» viven en la URL; las listas se piden con
 * `resource()` por página. La pertenencia del padre la valida el backend.
 */
@Component({
  selector: 'app-catalogs-page',
  imports: [UiAlert, UiButton, UiFormField],
  templateUrl: './catalogs-page.html',
})
export class CatalogsPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly categories = DOCUMENTED_CATALOG_CATEGORIES;
  protected readonly categoryLabels = CATALOG_CATEGORY_LABELS;
  protected readonly codeMaxLength = MAX_CATALOG_CODE_LENGTH;
  protected readonly nameMaxLength = MAX_CATALOG_NAME_LENGTH;
  protected readonly descriptionMaxLength = MAX_CATALOG_DESCRIPTION_LENGTH;

  protected readonly category = computed<CatalogCategory>(() => {
    const value = this.queryParams().get('categoria');
    return DOCUMENTED_CATALOG_CATEGORIES.includes(value as CatalogCategory)
      ? (value as CatalogCategory)
      : 'CIUDAD';
  });
  protected readonly includeInactive = computed(
    () => this.queryParams().get('inactivas') === 'true',
  );
  protected readonly parentCategory = computed(() => catalogParentCategory(this.category()));

  protected readonly entriesResource = resource({
    params: () => `${this.category()}|${this.includeInactive()}`,
    loader: () => this.api.listCatalog(this.category(), !this.includeInactive()),
  });
  protected readonly entries = computed(() => this.entriesResource.value() ?? []);
  protected readonly loading = computed(() => this.entriesResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.entriesResource.error();
    return error ? toApiError(error).message : null;
  });

  private readonly parentEntriesResource = resource<CatalogEntryView[], CatalogCategory | null>({
    params: () => this.parentCategory(),
    loader: ({ params }) =>
      params === null ? Promise.resolve([]) : this.api.listCatalog(params, true),
  });
  protected readonly parentEntries = computed(() => this.parentEntriesResource.value() ?? []);

  // ---------- Alta ----------
  private readonly createModel = signal({
    code: '',
    name: '',
    description: '',
    parentId: '',
  });
  protected readonly createValues = computed(() => this.createModel());
  protected readonly createCodeError = computed(() => catalogCodeError(this.createModel().code));
  protected readonly createNameError = computed(() => catalogNameError(this.createModel().name));
  protected readonly createDescriptionError = computed(() =>
    catalogDescriptionError(this.createModel().description),
  );
  protected readonly createParentError = computed(() =>
    catalogParentError(this.category(), this.createModel().parentId),
  );
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  /** `fieldErrors` reales del backend (p. ej. `parentId`), mostrados en el alta. */
  protected readonly createFieldErrors = signal<Record<string, string>>({});
  protected readonly successMessage = signal<string | null>(null);

  protected readonly createFieldErrorList = computed(() =>
    Object.entries(this.createFieldErrors()).map(([field, message]) => ({ field, message })),
  );

  // ---------- Edición ----------
  protected readonly editingId = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly saving = signal(false);
  protected readonly editError = signal<string | null>(null);

  // ---------- Desactivación (acción destructiva: pide confirmación) ----------
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly deactivatingId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  // ---------- Navegación (categoría y vista) ----------

  protected changeCategory(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.currentParams(), categoria: value },
    });
  }

  protected toggleInactive(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const params = this.currentParams();
    if (checked) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...params, inactivas: 'true' },
      });
      return;
    }
    delete params['inactivas'];
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  protected retry(): void {
    this.entriesResource.reload();
  }

  // ---------- Alta ----------

  protected updateCreateField(
    field: 'code' | 'name' | 'description' | 'parentId',
    event: Event,
  ): void {
    const value = readValue(event);
    if (value === null) return;
    this.createModel.update((current) => ({ ...current, [field]: value }));
    this.createError.set(null);
  }

  protected async submitCreate(): Promise<void> {
    const values = this.createModel();
    const invalid =
      this.createCodeError() ??
      this.createNameError() ??
      this.createDescriptionError() ??
      this.createParentError();
    if (invalid !== null) {
      this.createError.set(invalid);
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.createFieldErrors.set({});
    this.successMessage.set(null);
    const description = values.description.trim();
    try {
      await this.api.createCatalogEntry(this.category(), {
        code: values.code.trim(),
        name: values.name.trim(),
        description: description === '' ? null : description,
        parentId: values.parentId === '' ? null : values.parentId,
      });
      this.successMessage.set(
        `Entrada «${values.name.trim()}» creada en ${this.categoryLabels[this.category()]}.`,
      );
      this.createModel.set({ code: '', name: '', description: '', parentId: '' });
      this.entriesResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.createFieldErrors.set(apiError.fieldErrors);
      this.createError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.creating.set(false);
    }
  }

  // ---------- Edición ----------

  protected startEdit(entry: CatalogEntryView): void {
    this.editError.set(null);
    this.successMessage.set(null);
    if (this.editingId() === entry.id) {
      this.editingId.set(null);
      return;
    }
    this.editingId.set(entry.id);
    this.editName.set(entry.name);
    this.editDescription.set(entry.description ?? '');
  }

  protected updateEditField(field: 'name' | 'description', event: Event): void {
    const value = readValue(event);
    if (value === null) return;
    if (field === 'name') this.editName.set(value);
    else this.editDescription.set(value);
  }

  protected readonly editNameError = computed(() => catalogNameError(this.editName()));
  protected readonly editDescriptionError = computed(() =>
    catalogDescriptionError(this.editDescription()),
  );

  protected async saveEdit(entry: CatalogEntryView): Promise<void> {
    const invalid = this.editNameError() ?? this.editDescriptionError();
    if (invalid !== null) {
      this.editError.set(invalid);
      return;
    }
    this.saving.set(true);
    this.editError.set(null);
    const description = this.editDescription().trim();
    try {
      await this.api.updateCatalogEntry(this.category(), entry.id, {
        name: this.editName().trim(),
        description: description === '' ? null : description,
      });
      this.successMessage.set('Entrada actualizada.');
      this.editingId.set(null);
      this.entriesResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.editError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.saving.set(false);
    }
  }

  // ---------- Desactivación ----------

  protected toggleConfirm(entry: CatalogEntryView): void {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.confirmingId.update((current) => (current === entry.id ? null : entry.id));
  }

  protected async deactivate(entry: CatalogEntryView): Promise<void> {
    this.deactivatingId.set(entry.id);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await this.api.deactivateCatalogEntry(this.category(), entry.id);
      this.successMessage.set(
        'Entrada desactivada: deja de estar disponible para nuevos usos, pero las referencias existentes se conservan.',
      );
      this.confirmingId.set(null);
      this.entriesResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.deactivatingId.set(null);
    }
  }

  protected parentLabel(parentId: string | null): string {
    if (parentId === null) return 'Sin padre';
    const parent = this.parentEntries().find((entry) => entry.id === parentId);
    return parent ? `${parent.code} · ${parent.name}` : parentId;
  }

  private currentParams(): Record<string, string> {
    return this.includeInactive()
      ? { categoria: this.category(), inactivas: 'true' }
      : { categoria: this.category() };
  }
}

function readValue(event: Event): string | null {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target.value;
  }
  return null;
}
