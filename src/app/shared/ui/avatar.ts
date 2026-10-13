import { Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
};

/** Avatar con imagen o iniciales; decorativo salvo que se pase `label`. */
@Component({
  selector: 'ui-avatar',
  template: `
    @if (src(); as image) {
      <img
        [src]="image"
        [alt]="label() ?? name()"
        [class]="classes()"
        class="shrink-0 rounded-full border border-line object-cover"
      />
    } @else {
      <span
        [class]="classes()"
        [attr.aria-hidden]="label() ? null : 'true'"
        [attr.aria-label]="label()"
        [attr.role]="label() ? 'img' : null"
        class="grid shrink-0 place-items-center rounded-full bg-brand-700/10 font-display font-extrabold text-brand-800"
      >
        {{ initials() }}
      </span>
    }
  `,
})
export class UiAvatar {
  readonly name = input<string | null>(null);
  readonly src = input<string | null>(null);
  readonly size = input<AvatarSize>('md');
  readonly label = input<string | null>(null);

  protected readonly classes = computed(() => SIZE_CLASSES[this.size()]);
  protected readonly initials = computed(() => {
    const parts = (this.name() ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });
}
