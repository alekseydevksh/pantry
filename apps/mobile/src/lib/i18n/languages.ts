// Pure helpers for choosing the app language. No i18next and no native code, so they are
// easy to test.

export const SUPPORTED_LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

/**
 * The first device language that the app supports, in the order the user prefers them.
 * `locales` has the shape of expo-localization's `getLocales()`. Falls back to English.
 */
export function pickLanguage(locales: readonly { languageCode: string | null }[]): Language {
  for (const { languageCode } of locales) {
    if (isLanguage(languageCode)) {
      return languageCode;
    }
  }
  return FALLBACK_LANGUAGE;
}
