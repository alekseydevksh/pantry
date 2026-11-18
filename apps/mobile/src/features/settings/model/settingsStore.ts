// The settings store (ADR 0005: settings live in Zustand and are persisted).
// It uses `zustand/vanilla`, so it has no React and works outside components: the AI router and
// the Apollo links can read it with `getState()`.
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { Language } from '@/lib/i18n/languages';
import type { KeyValueStorage } from '@/lib/storage';

import {
  defaultSettings,
  sanitizeSettings,
  type AiMode,
  type Settings,
  type ThemePreference,
} from './settings';

export type SettingsState = Settings & {
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
  setAiMode: (aiMode: AiMode) => void;
};

export const SETTINGS_STORAGE_KEY = 'pantry.settings';

type Options = {
  storage: KeyValueStorage;
  /** The language to start with when nothing is stored yet, for example the device language. */
  defaultLanguage: Language;
};

export function createSettingsStore({ storage, defaultLanguage }: Options) {
  return createStore<SettingsState>()(
    persist(
      (set) => ({
        ...defaultSettings(defaultLanguage),
        setLanguage: (language) => set({ language }),
        setTheme: (theme) => set({ theme }),
        setAiMode: (aiMode) => set({ aiMode }),
      }),
      {
        name: SETTINGS_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        // Only the values are saved, not the functions.
        partialize: ({ language, theme, aiMode }): Settings => ({ language, theme, aiMode }),
        // Stored data is untrusted: keep the valid fields, use defaults for the rest.
        merge: (stored, current) => ({ ...current, ...sanitizeSettings(stored) }),
      },
    ),
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
