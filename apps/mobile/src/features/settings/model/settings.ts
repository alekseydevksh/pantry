// Pure types and rules for the settings. No React, no storage.
import { isLanguage, type Language } from '@/lib/i18n/languages';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/**
 * Which AI the assistant may use (ADR 0006).
 * `auto`: on-device when it can, cloud otherwise. `off`: no assistant features.
 */
export const AI_MODES = ['auto', 'on-device', 'cloud', 'off'] as const;
export type AiMode = (typeof AI_MODES)[number];

export type Settings = {
  language: Language;
  theme: ThemePreference;
  aiMode: AiMode;
};

export function defaultSettings(language: Language): Settings {
  return { language, theme: 'system', aiMode: 'auto' };
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

/**
 * Takes whatever was read from storage and keeps only the valid fields. A value from an older
 * app version, from a bad edit or from a damaged file must not crash the app or break a setting:
 * a field that is missing or invalid is left out, so the default stays.
 */
export function sanitizeSettings(stored: unknown): Partial<Settings> {
  if (typeof stored !== 'object' || stored === null) {
    return {};
  }

  const { language, theme, aiMode } = stored as Record<string, unknown>;
  const valid: Partial<Settings> = {};

  if (isLanguage(language)) valid.language = language;
  if (isOneOf(THEME_PREFERENCES, theme)) valid.theme = theme;
  if (isOneOf(AI_MODES, aiMode)) valid.aiMode = aiMode;

  return valid;
}
