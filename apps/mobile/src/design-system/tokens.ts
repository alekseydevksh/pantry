// Design tokens: the raw values of the design system.
// Components do not import this file. They read the theme (see themes.ts), which gives the
// colors a meaning ("background", "textMuted") and can differ between light and dark.

/** Raw colors. Only themes.ts maps them to roles. */
export const palette = {
  green50: '#EAF5EE',
  green100: '#CFE8D8',
  green300: '#7CC29A',
  green400: '#58AC7C',
  green500: '#2F7D4F',
  green600: '#27693F',
  green900: '#14201A',

  cream50: '#FAF4E6',
  cream100: '#F1E8D3',
  cream200: '#E3DAC6',

  ink900: '#1F2A24',
  ink800: '#1D2C24',
  ink700: '#27382E',
  ink600: '#33453B',
  ink500: '#5B6B62',
  ink300: '#A9B8AF',

  red300: '#F2B8B5',
  red600: '#B3261E',
  red900: '#4A1512',

  amber300: '#F5C56B',
  amber700: '#8A5A00',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Spacing scale in points, on a 4 pt grid. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  /** Fully rounded ends: chips, round icon buttons. */
  pill: 999,
} as const;

/**
 * Text styles. Sizes follow the iOS text styles, so they look right at the default size and
 * scale with the user's text size setting (React Native scales `fontSize` and `lineHeight`).
 */
export const typography = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
} as const;

/** Sizes that are rules, not scale steps. */
export const sizes = {
  /** Smallest touch target allowed for an interactive element (CLAUDE.md, SPEC section 9). */
  minTouchTarget: 44,
} as const;
