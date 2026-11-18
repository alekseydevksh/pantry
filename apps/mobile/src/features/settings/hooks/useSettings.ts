import { useStore } from 'zustand';

import type { SettingsState } from '../model/settingsStore';
import { settingsStore } from '../store';

/** Reads the settings in a component. Pass a selector to re-render only when that part changes. */
export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
