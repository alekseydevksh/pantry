// The app's cart queue store: one per app, persisted in MMKV (ADR 0005, ADR 0013). Tests swap it
// for a memory one with `configureCartQueue`, like `configureFlags`.
import { createMemoryStorage, createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { createQueueStore, type QueueStore } from './model/queueStore';

let store: QueueStore = createQueueStore(createMMKVStorage(STORAGE_IDS.app));

export function getCartQueueStore(): QueueStore {
  return store;
}

/** Replaces the app's queue with an empty one in memory. Returns a function that undoes it. */
export function configureCartQueue(): () => void {
  const previous = store;
  store = createQueueStore(createMemoryStorage());
  return () => {
    store = previous;
  };
}
