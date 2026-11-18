// i18n setup. Importing this file starts i18next with the bundled resources, so strings are
// ready on the first render. The app entry imports it before Expo Router loads the routes.
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { FALLBACK_LANGUAGE, isLanguage, pickLanguage, type Language } from './languages';
import { en } from './resources/en';
import { pl } from './resources/pl';

export { formatPrice } from './format';
export { SUPPORTED_LANGUAGES, isLanguage, pickLanguage, type Language } from './languages';
export { useTranslation };

// The app's own instance (not the shared default one), so nothing else can change its settings.
export const i18n = createInstance();

// Makes `t('home.title')` typed: a key that is not in en.ts is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pl: { translation: pl } },
  lng: pickLanguage(getLocales()),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: ['en', 'pl'],
  // The resources are bundled, so there is nothing to wait for.
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes
});

/** Switch the language. Components that use `useTranslation` re-render by themselves. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
}

/** The language in use. Always a supported one, because `supportedLngs` limits it. */
export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
}
