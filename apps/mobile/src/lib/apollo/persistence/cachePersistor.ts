// Our own Apollo cache persistor (ADR 0007, decision 4). `apollo3-cache-persist` is unmaintained and
// targets Apollo Client 3 (PLAN, decisions).
//
// - restore(): synchronous, because MMKV and `cache.restore` are. Called while the app client module
//   loads, so the first render already has the cached data. No splash-screen gate.
// - saving: a trailing debounce after cache writes, with a max wait, plus `flush()` when the app
//   leaves the foreground.
// - size limit: a cache too large to save is purged from storage, never saved in part.
// - version: a stored cache from another version is dropped, not restored.
import type { InMemoryCache, NormalizedCacheObject } from '@apollo/client';

import { reportError } from '@/lib/observability';
import type { KeyValueStorage } from '@/lib/storage';

import { CACHE_VERSION, utf8ByteLength } from './version';

export const CACHE_DATA_KEY = 'apollo.cache';
export const CACHE_VERSION_KEY = 'apollo.cache.version';

/** The cap from SYSTEM-DESIGN ("Persisted client cache: 5 MB in MMKV, purged when larger"). */
export const MAX_CACHE_BYTES = 5 * 1024 * 1024;
export const SAVE_DEBOUNCE_MS = 1000;
export const SAVE_MAX_WAIT_MS = 5000;

export type RestoreResult = 'restored' | 'empty' | 'version-mismatch' | 'corrupt';

export type CachePersistorOptions = {
  cache: InMemoryCache;
  storage: KeyValueStorage;
  version?: string;
  maxBytes?: number;
  debounceMs?: number;
  maxWaitMs?: number;
};

export type CachePersistor = {
  /** Loads the stored cache into `cache`. Call once, before the first render. */
  restore(): RestoreResult;
  /** Starts saving after cache writes. */
  start(): void;
  /** Stops saving and cancels a pending save. */
  stop(): void;
  /** Saves now if a save is pending (the app is leaving the foreground). */
  flush(): void;
  /** Deletes the stored cache. The in-memory cache is not touched. */
  purge(): void;
};

/** The cache methods that change data. `writeQuery`, `writeFragment` and query results use `write`. */
const WRITE_METHODS = ['write', 'modify', 'evict', 'reset'] as const;
type WriteMethod = (typeof WRITE_METHODS)[number];

const SOURCE = 'apollo-persist';

export function createCachePersistor({
  cache,
  storage,
  version = CACHE_VERSION,
  maxBytes = MAX_CACHE_BYTES,
  debounceMs = SAVE_DEBOUNCE_MS,
  maxWaitMs = SAVE_MAX_WAIT_MS,
}: CachePersistorOptions): CachePersistor {
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** When the oldest unsaved write happened, for the max wait. */
  let firstPendingAt: number | null = null;
  let reportedTooLarge = false;
  let restoreOriginals: (() => void) | null = null;

  function cancelPending() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    firstPendingAt = null;
  }

  function purge() {
    storage.removeItem(CACHE_DATA_KEY);
  }

  function restore(): RestoreResult {
    const storedVersion = storage.getItem(CACHE_VERSION_KEY);

    if (storedVersion !== version) {
      const hadData = storage.getItem(CACHE_DATA_KEY) !== null;
      purge();
      storage.setItem(CACHE_VERSION_KEY, version);
      return storedVersion === null && !hadData ? 'empty' : 'version-mismatch';
    }

    const raw = storage.getItem(CACHE_DATA_KEY);
    if (raw === null) return 'empty';

    try {
      const data: unknown = JSON.parse(raw);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('The persisted Apollo cache is not an object');
      }
      // The stored value was written by `save` from `cache.extract()`, so it has this shape.
      cache.restore(data as NormalizedCacheObject);
      return 'restored';
    } catch (error) {
      // Damaged data must never crash the app: start with an empty cache and fetch again.
      try {
        cache.restore({});
      } catch {
        // Nothing else to do; the cache was empty before `restore` anyway.
      }
      purge();
      reportError(error, { source: SOURCE, extra: { stage: 'restore' } });
      return 'corrupt';
    }
  }

  function save() {
    cancelPending();

    // `false`: only confirmed data. Optimistic changes of in-flight mutations are not saved.
    const json = JSON.stringify(cache.extract(false));
    const bytes = utf8ByteLength(json);

    if (bytes > maxBytes) {
      // A part of a normalized cache would have dangling references, so all or nothing.
      purge();
      if (!reportedTooLarge) {
        reportedTooLarge = true;
        reportError(new Error('The Apollo cache is too large to persist'), {
          source: SOURCE,
          extra: { stage: 'save', bytes, maxBytes },
        });
      }
      return;
    }

    // The storage adapter reports a failed write and does not throw (task 2.2).
    storage.setItem(CACHE_VERSION_KEY, version);
    storage.setItem(CACHE_DATA_KEY, json);
  }

  function schedule() {
    const now = Date.now();
    firstPendingAt ??= now;
    if (timer !== null) clearTimeout(timer);
    // Wait `debounceMs` after the last write, but never longer than `maxWaitMs` after the first one:
    // with constant writes (scrolling through pages) a plain debounce would never save.
    const wait = Math.min(debounceMs, firstPendingAt + maxWaitMs - now);
    timer = setTimeout(save, Math.max(0, wait));
  }

  function start() {
    if (restoreOriginals) return;

    // The methods are generic and overloaded; this loose view of them is only used to wrap them.
    const target = cache as unknown as Record<WriteMethod, (...args: unknown[]) => unknown>;
    const originals = WRITE_METHODS.map((name) => [name, target[name]] as const);

    for (const [name, original] of originals) {
      target[name] = (...args: unknown[]) => {
        const result = original.apply(cache, args);
        schedule();
        return result;
      };
    }

    restoreOriginals = () => {
      for (const [name, original] of originals) target[name] = original;
    };
  }

  function stop() {
    cancelPending();
    restoreOriginals?.();
    restoreOriginals = null;
  }

  function flush() {
    if (timer !== null) save();
  }

  return { restore, start, stop, flush, purge };
}
