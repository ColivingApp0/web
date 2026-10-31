import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'search'
  | 'bed'
  | 'bath'
  | 'users'
  | 'map-pin'
  | 'snowflake'
  | 'fan'
  | 'heart'
  | 'heart-filled'
  | 'message'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-down'
  | 'plus'
  | 'close'
  | 'check'
  | 'check-circle'
  | 'alert-circle'
  | 'info'
  | 'bell'
  | 'sparkles'
  | 'building'
  | 'key'
  | 'shield'
  | 'user'
  | 'settings'
  | 'menu'
  | 'logout'
  | 'image'
  | 'trash'
  | 'star'
  | 'sliders'
  | 'wifi'
  | 'pencil'
  | 'wallet'
  | 'door'
  | 'clipboard'
  | 'sun';

interface IconDefinition {
  paths: readonly string[];
  circles?: readonly { cx: number; cy: number; r: number }[];
  filled?: boolean;
}

/** Trazos de 24×24 con el mismo grosor visual. Sin dependencias externas. */
const ICONS: Record<IconName, IconDefinition> = {
  home: { paths: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9.5 21v-6h5v6'] },
  search: { paths: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm16 16 5 5'] },
  bed: {
    paths: [
      'M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7',
      'M3 19h18',
      'M3 16h18',
      'M6 10V7h5v3',
      'M13 10v-2h4v2',
    ],
  },
  bath: {
    paths: [
      'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z',
      'M6 12V6.5A2.5 2.5 0 0 1 10.5 5',
      'M7 19l-1 2',
      'M17 19l1 2',
    ],
  },
  users: {
    paths: [
      'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20',
      'M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
      'M17 10.5a3 3 0 0 0 0-6',
      'M21 20v-1.5a4 4 0 0 0-3-3.87',
    ],
  },
  'map-pin': {
    paths: ['M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z'],
    circles: [{ cx: 12, cy: 10, r: 2.5 }],
  },
  snowflake: {
    paths: [
      'M12 2v20',
      'M4.2 7l15.6 10',
      'M19.8 7 4.2 17',
      'M8.5 4.5 12 8l3.5-3.5',
      'M8.5 19.5 12 16l3.5 3.5',
    ],
  },
  fan: {
    paths: [
      'M12 12c-1.5-1-4.8-1.8-4.8-4.6A2.9 2.9 0 0 1 12 5.5V12Z',
      'M12 12c1 1.5 1.8 4.8 4.6 4.8a2.9 2.9 0 0 0 1.9-4.8H12Z',
      'M12 12c-1.5 1-4.8 1.8-4.8 4.6a2.9 2.9 0 0 0 4.8 1.9V12Z',
      'M12 12c1-1.5 1.8-4.8 4.6-4.8a2.9 2.9 0 0 1 1.9 4.8H12Z',
    ],
    circles: [{ cx: 12, cy: 12, r: 1.2 }],
  },
  heart: {
    paths: [
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    ],
  },
  'heart-filled': {
    paths: [
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    ],
    filled: true,
  },
  message: {
    paths: [
      'M21 12a8.5 8.5 0 0 1-8.5 8.5H4l2.3-3.4A8.5 8.5 0 1 1 21 12Z',
      'M8 12h.01',
      'M12 12h.01',
      'M16 12h.01',
    ],
  },
  'arrow-right': { paths: ['M4 12h16', 'm14 6 6 6-6 6'] },
  'arrow-left': { paths: ['M20 12H4', 'm10 18-6-6 6-6'] },
  'chevron-down': { paths: ['m6 9 6 6 6-6'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  close: { paths: ['m6 6 12 12', 'm18 6-12 12'] },
  check: { paths: ['m4 12.5 5 5L20 6.5'] },
  'check-circle': { paths: ['M21 11.1V12a9 9 0 1 1-5.3-8.2', 'm8.5 11.5 3 3L21 5'] },
  'alert-circle': { paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5v5', 'M12 16h.01'] },
  info: { paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 7.5h.01'] },
  bell: { paths: ['M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'] },
  sparkles: {
    paths: [
      'm12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z',
      'M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
      'M5 3l.7 1.8L7.5 5.5 5.7 6.2 5 8l-.7-1.8L2.5 5.5l1.8-.7L5 3Z',
    ],
  },
  building: {
    paths: [
      'M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17',
      'M15 9h4a1 1 0 0 1 1 1v11',
      'M3 21h18',
      'M8 7h3',
      'M8 11h3',
      'M8 15h3',
      'M18 13h.01',
      'M18 17h.01',
    ],
  },
  key: {
    paths: [
      'M14.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z',
      'm13.7 10.3 7.3 7.3',
      'M18 15l2-2',
      'M16 17l2-2',
    ],
  },
  shield: { paths: ['M12 21s7-3.5 7-10V5l-7-2-7 2v6c0 6.5 7 10 7 10Z', 'm9 12 2 2 4-4'] },
  user: {
    paths: ['M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
  },
  settings: {
    paths: [
      'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
      'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z',
    ],
  },
  menu: { paths: ['M4 7h16', 'M4 12h16', 'M4 17h16'] },
  logout: { paths: ['M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5', 'M16 17l5-5-5-5', 'M21 12H9'] },
  image: {
    paths: [
      'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
      'm4 16 4.5-4.5 3 3L15 11l5 5',
    ],
    circles: [{ cx: 8.5, cy: 9, r: 1.5 }],
  },
  trash: { paths: ['M4 7h16', 'M9 7V4h6v3', 'm6 7 1 14h10l1-14', 'M10 11v6', 'M14 11v6'] },
  star: {
    paths: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z'],
    filled: true,
  },
  sliders: {
    paths: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8'],
    circles: [
      { cx: 16, cy: 7, r: 2 },
      { cx: 10, cy: 17, r: 2 },
    ],
  },
  wifi: {
    paths: [
      'M3 9a14 14 0 0 1 18 0',
      'M6 12.5a10 10 0 0 1 12 0',
      'M9 16a5.5 5.5 0 0 1 6 0',
      'M12 19.5h.01',
    ],
  },
  pencil: { paths: ['M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3Z', 'm14 6 4 4'] },
  wallet: {
    paths: [
      'M4 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
      'M2 8V6a2 2 0 0 1 2-2h12',
      'M16 14h.01',
    ],
    circles: [{ cx: 17, cy: 14, r: 2 }],
  },
  door: { paths: ['M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17', 'M3 21h18', 'M14.5 12h.01'] },
  clipboard: {
    paths: [
      'M9 4h6v3H9z',
      'M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2',
      'M8.5 11h7',
      'M8.5 15h5',
    ],
  },
  sun: {
    paths: [
      'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
      'M12 1.5v2',
      'M12 20.5v2',
      'M4.2 4.2l1.4 1.4',
      'M18.4 18.4l1.4 1.4',
      'M1.5 12h2',
      'M20.5 12h2',
      'M4.2 19.8l1.4-1.4',
      'M18.4 5.6l1.4-1.4',
    ],
  },
};

const SIZES = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
} as const;

export type IconSize = keyof typeof SIZES;

/**
 * Icono accesible de la app. Decorativo por defecto (`aria-hidden`); si se
 * pasa `label`, se expone como imagen con nombre accesible.
 */
@Component({
  selector: 'ui-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      [attr.stroke-width]="strokeWidth() ?? 1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="classes()"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label()"
      focusable="false"
    >
      @for (path of definition().paths; track $index) {
        <path [attr.d]="path" [attr.fill]="definition().filled ? 'currentColor' : 'none'" />
      }
      @for (circle of definition().circles ?? []; track $index) {
        <circle [attr.cx]="circle.cx" [attr.cy]="circle.cy" [attr.r]="circle.r" />
      }
    </svg>
  `,
})
export class UiIcon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly label = input<string | null>(null);
  readonly strokeWidth = input<number | null>(null);

  protected readonly definition = computed(() => ICONS[this.name()]);
  protected readonly classes = computed(() => `${SIZES[this.size()]} shrink-0`);
}
