import { palette, radius, sizes, spacing, typography } from './tokens';

/**
 * Colors by role. A component asks for "textMuted", never for "ink500",
 * so one component works in every theme.
 */
export type ThemeColors = {
  /** Screen background. */
  background: string;
  /** Cards, sheets and inputs that sit on the background. */
  surface: string;
  /** A second level on top of a surface: pressed states, skeletons. */
  surfaceRaised: string;
  text: string;
  /** Secondary text. Still meets 4.5:1 contrast on background and surface. */
  textMuted: string;
  border: string;
  /** Brand color for main actions. */
  primary: string;
  primaryPressed: string;
  /** Text and icons on top of `primary`. */
  onPrimary: string;
  /** Soft brand background: selected chips, highlights. */
  primarySoft: string;
  onPrimarySoft: string;
  danger: string;
  onDanger: string;
  warning: string;
  /** Dimmed layer behind modals. */
  overlay: string;
};

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  sizes: typeof sizes;
};

// The scales are the same in every theme. Only the colors change.
const shared = { spacing, radius, typography, sizes };

export const lightTheme: Theme = {
  ...shared,
  colors: {
    background: palette.cream50,
    surface: palette.white,
    surfaceRaised: palette.cream100,
    text: palette.ink900,
    textMuted: palette.ink500,
    border: palette.cream200,
    primary: palette.green500,
    primaryPressed: palette.green600,
    onPrimary: palette.white,
    primarySoft: palette.green100,
    onPrimarySoft: palette.ink900,
    danger: palette.red600,
    onDanger: palette.white,
    warning: palette.amber700,
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
};

export const darkTheme: Theme = {
  ...shared,
  colors: {
    background: palette.green900,
    surface: palette.ink800,
    surfaceRaised: palette.ink700,
    text: palette.cream50,
    textMuted: palette.ink300,
    border: palette.ink600,
    primary: palette.green300,
    primaryPressed: palette.green400,
    onPrimary: palette.green900,
    primarySoft: palette.ink600,
    onPrimarySoft: palette.cream50,
    danger: palette.red300,
    onDanger: palette.red900,
    warning: palette.amber300,
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

/**
 * The names `light` and `dark` are required by Unistyles adaptive themes:
 * it picks one of them from the system color scheme.
 */
export const themes = { light: lightTheme, dark: darkTheme };

export type ThemeName = keyof typeof themes;
