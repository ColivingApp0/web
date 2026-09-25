import { DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { AuthSession } from '../../../core/auth/auth-session';
import { DocumentStatus, DocumentType } from '../../../core/auth/identity-contract';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { MeApi } from '../data-access/me-api';

const TYPE_OPTIONS: readonly { value: DocumentType; label: string }[] = [
  { value: 'IDENTIDAD', label: 'Documento de identidad' },
  { value: 'CERTIFICADO_ACADEMICO', label: 'Certificado académico' },
  { value: 'COMPROBANTE_ESTUDIO', label: 'Comprobante de estudio' },
];

const STATUS_META: Record<DocumentStatus, { label: string; classes: string }> = {
  PENDIENTE: { label: 'Pendiente de revisión', classes: 'bg-accent-500/15 text-accent-600' },
  APROBADO: { label: 'Aprobado', classes: 'bg-brand-700/10 text-brand-800' },
  RECHAZADO: { label: 'Rechazado', classes: 'bg-red-100 text-red-800' },
  CORRECCION_SOLICITADA: { label: 'Corrección solicitada', classes: 'bg-red-100 text-red-800' },
};

/** Mismas reglas que el backend: tipos y tamaño (límite multipart de 10 MB). */
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Verificación documental (RF-012): subir documentos y ver su estado. */
@Component({
  selector: 'app-verification-page',
  imports: [DatePipe, UiAlert, UiButton],
  templateUrl: './verification-page.html',
})
export class VerificationPage {
  protected readonly session = inject(AuthSession);
  private readonly meApi = inject(MeApi);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly documents = computed(() => this.session.user()?.documents ?? []);
  protected readonly selectedType = signal<DocumentType>('IDENTIDAD');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly success = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected statusLabel(status: DocumentStatus): string {
    return STATUS_META[status].label;
  }

  protected statusClasses(status: DocumentStatus): string {
    return STATUS_META[status].classes;
  }

  protected typeLabel(type: DocumentType): string {
    return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  protected onTypeChange(event: Event): void {
    this.selectedType.set((event.target as HTMLSelectElement).value as DocumentType);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.success.set(false);
    if (!file) {
      this.selectedFile.set(null);
      this.fileError.set(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      this.selectedFile.set(null);
      this.fileError.set('Formato no soportado. Usa JPG, PNG, WEBP o PDF.');
      input.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.selectedFile.set(null);
      this.fileError.set('El archivo supera el límite de 10 MB.');
      input.value = '';
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  protected async upload(): Promise<void> {
    const file = this.selectedFile();
    if (!file || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);
    this.success.set(false);
    try {
      await this.meApi.uploadDocument(this.selectedType(), file);
      await this.session.refresh();
      this.success.set(true);
      this.selectedFile.set(null);
      const input = this.fileInput()?.nativeElement;
      if (input) input.value = '';
    } catch (error) {
      this.serverError.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
