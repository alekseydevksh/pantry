// Storage behind an interface, so the app does not depend on one library.
// Two adapters: memory (tests, and anything that must not survive a restart) and MMKV (mmkv.ts).
// The methods are synchronous because MMKV is, and a store that reads at startup needs no `await`.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Keeps values in memory, so they are lost when the app closes. Also the storage for tests. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export { createMMKVStorage, STORAGE_IDS, type StorageId } from './mmkv';
