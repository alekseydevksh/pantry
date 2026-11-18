// Local flag overrides, set from the debug panel (PLAN 3.8) and kept across restarts (ADR 0005:
// flag overrides are session state in Zustand, persisted in MMKV).
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { KeyValueStorage } from '@/lib/storage';

import type { FlagKey, FlagOverrides, Variant } from './definitions';
import { sanitizeOverrides } from './model/resolve';

export type OverridesState = {
  overrides: FlagOverrides;
  setOverride: <K extends FlagKey>(key: K, variant: Variant<K>) => void;
  clearOverride: (key: FlagKey) => void;
  clearAll: () => void;
};

export const OVERRIDES_STORAGE_KEY = 'pantry.flag-overrides';

export function createOverridesStore(storage: KeyValueStorage) {
  return createStore<OverridesState>()(
    persist(
      (set) => ({
        overrides: {},
        setOverride: (key, variant) =>
          set(({ overrides }) => ({ overrides: { ...overrides, [key]: variant } })),
        clearOverride: (key) =>
          set(({ overrides }) => {
            const { [key]: _removed, ...rest } = overrides;
            return { overrides: rest };
          }),
        clearAll: () => set({ overrides: {} }),
      }),
      {
        name: OVERRIDES_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: ({ overrides }) => ({ overrides }),
        // Stored data is untrusted, and a flag or variant may have been removed since.
        merge: (stored, current) => ({
          ...current,
          overrides: sanitizeOverrides((stored as { overrides?: unknown } | null)?.overrides),
        }),
      },
    ),
  );
}

export type OverridesStore = ReturnType<typeof createOverridesStore>;
