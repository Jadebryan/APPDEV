/**
 * Color palettes for Run Barbie.
 * Default: Run Barbie – shades of pink and blue.
 */

export type PaletteId = 'run_barbie' | 'coral_teal' | 'purple_sage' | 'sunset' | 'ocean';

export interface Palette {
  id: PaletteId;
  name: string;
  /** Primary accent – buttons, icons, heart, etc. */
  primary: string;
  /** Secondary accent – links, highlights */
  secondary: string;
  /** Light tint for backgrounds (e.g. selected state) */
  primaryLight: string;
  secondaryLight: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  run_barbie: {
    id: 'run_barbie',
    name: 'Run Barbie',
    primary: '#FF69B4',      // Hot pink
    secondary: '#0095f6',   // Blue
    primaryLight: '#FFF0F5',
    secondaryLight: '#E8F4FD',
  },
  coral_teal: {
    id: 'coral_teal',
    name: 'Coral & Teal',
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    primaryLight: '#FFEFEF',
    secondaryLight: '#E8F8F7',
  },
  purple_sage: {
    id: 'purple_sage',
    name: 'Purple & Sage',
    primary: '#9B59B6',
    secondary: '#7DCE82',
    primaryLight: '#F5EEF8',
    secondaryLight: '#EEF8EF',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    primary: '#FF8C42',
    secondary: '#FFD93D',
    primaryLight: '#FFF4ED',
    secondaryLight: '#FFFDE8',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    primary: '#0095f6',
    secondary: '#00D4FF',
    primaryLight: '#E8F4FD',
    secondaryLight: '#E6FAFF',
  },
};

export const DEFAULT_PALETTE_ID: PaletteId = 'run_barbie';

export function getPalette(id: PaletteId): Palette {
  return PALETTES[id] ?? PALETTES.run_barbie;
}
