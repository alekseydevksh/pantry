// Makes the settings take effect: language in i18next, theme in Unistyles.
// It reacts to the store, so a change applies at once, from any screen.
import { UnistylesRuntime } from 'react-native-unistyles';

import { setLanguage } from '@/lib/i18n';

import type { SettingsStore } from './model/settingsStore';
import { settingsStore } from './store';

/**
 * Applies the current settings and keeps applying them. Returns a function that stops it.
 * The app entry calls it once, before the first render, so a saved theme does not flash.
 */
export function startSettingsSync(store: SettingsStore = settingsStore): () => void {
  const apply = ({ language, theme }: ReturnType<SettingsStore['getState']>) => {
    void setLanguage(language);

    if (theme === 'system') {
      // Unistyles picks `light` or `dark` from the system and follows its changes.
      UnistylesRuntime.setAdaptiveThemes(true);
    } else {
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(theme);
    }
  };

  apply(store.getState());

  let previous = store.getState();
  return store.subscribe((state) => {
    if (state.language !== previous.language || state.theme !== previous.theme) {
      apply(state);
    }
    previous = state;
  });
}
