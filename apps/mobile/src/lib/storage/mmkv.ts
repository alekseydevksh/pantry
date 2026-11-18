// The MMKV adapter for `KeyValueStorage`.
//
// MMKV is a memory-mapped key-value store with a synchronous JSI API (via Nitro Modules): a read
// returns at once, with no `await` and no bridge. So a store can load its saved state while it is
// created, before the first render, and the app never shows a flash of default settings.
import { createMMKV, type MMKV } from 'react-native-mmkv';

import { reportError } from '@/lib/observability';

import type { KeyValueStorage } from './index';

/**
 * Separate MMKV instances (separate files on disk).
 * - `app`: small values the user cares about: settings, later the session and the offline queue.
 * - `apolloCache`: only the persisted Apollo cache. It can be large and is purged as a whole
 *   (task 2.3), which must never touch settings or queued cart operations (ADR 0005).
 *
 * Not encrypted: settings and catalog data are not secret. A real auth token would need an
 * encrypted instance (`encryptionKey`) with the key kept in the Keychain / Keystore.
 */
export const STORAGE_IDS = {
  app: 'pantry',
  apolloCache: 'pantry.apollo-cache',
} as const;

export type StorageId = (typeof STORAGE_IDS)[keyof typeof STORAGE_IDS];

/**
 * A `KeyValueStorage` over one MMKV instance.
 *
 * A write that fails (for example, the disk is full) is reported and ignored instead of thrown:
 * zustand's persist middleware does not catch storage errors, and a failed save must not crash a
 * theme toggle. The value stays in memory for this session.
 */
export function createMMKVStorage(id: StorageId, mmkv: MMKV = createMMKV({ id })): KeyValueStorage {
  const guard = (operation: string, key: string, write: () => void) => {
    try {
      write();
    } catch (error) {
      reportError(error, { source: 'storage', extra: { id, operation, key } });
    }
  };

  return {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => guard('set', key, () => mmkv.set(key, value)),
    removeItem: (key) => guard('remove', key, () => void mmkv.remove(key)),
  };
}
