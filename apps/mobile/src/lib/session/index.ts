// The app's session store, in the `app` MMKV instance. MMKV reads are synchronous, so the saved id
// is there before the first flag is read.
import { createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { createSessionStore } from './sessionStore';

export const sessionStore = createSessionStore({ storage: createMMKVStorage(STORAGE_IDS.app) });

/** The id of the current user. */
export function currentUserId(): string {
  return sessionStore.getState().userId;
}

export { createSessionStore, SESSION_STORAGE_KEY, type SessionState } from './sessionStore';
