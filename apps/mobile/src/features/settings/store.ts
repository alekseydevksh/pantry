// The app's settings store, saved in MMKV so the settings survive a restart.
// MMKV reads are synchronous, so the saved settings are loaded while this module runs, before the
// first render (no flash of the default theme or language).
import { getLocales } from 'expo-localization';

import { pickLanguage } from '@/lib/i18n/languages';
import { createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { createSettingsStore } from './model/settingsStore';

export const settingsStore = createSettingsStore({
  storage: createMMKVStorage(STORAGE_IDS.app),
  defaultLanguage: pickLanguage(getLocales()),
});
