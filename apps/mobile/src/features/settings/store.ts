// The app's settings store. Memory storage for now; task 2.2 swaps in MMKV here.
import { getLocales } from 'expo-localization';

import { pickLanguage } from '@/lib/i18n/languages';
import { createMemoryStorage } from '@/lib/storage';

import { createSettingsStore } from './model/settingsStore';

export const settingsStore = createSettingsStore({
  storage: createMemoryStorage(),
  defaultLanguage: pickLanguage(getLocales()),
});
