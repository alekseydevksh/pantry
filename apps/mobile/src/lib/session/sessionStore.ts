// The session (ADR 0005): the mock user's id, kept across restarts. There is no real sign-in
// (SPEC 1), so the id is an anonymous id made on first launch. Flags assign by it (ADR 0012).
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { randomId } from '@/lib/ids';
import type { KeyValueStorage } from '@/lib/storage';

export type SessionState = {
  /** `anon-<uuid>` until a real account exists. */
  userId: string;
};

export const SESSION_STORAGE_KEY = 'pantry.session';

const ANONYMOUS_ID = /^anon-[0-9a-f-]{36}$/;

type Options = {
  storage: KeyValueStorage;
  /** Default: a random v4 UUID. */
  createId?: () => string;
};

export function createSessionStore({ storage, createId = randomId }: Options) {
  const store = createStore<SessionState>()(
    persist(() => ({ userId: `anon-${createId()}` }), {
      name: SESSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      // A stored id that is not one of ours (a damaged file) is replaced by the new one.
      merge: (stored, current) => {
        const userId = (stored as { userId?: unknown } | null)?.userId;
        return typeof userId === 'string' && ANONYMOUS_ID.test(userId) ? { userId } : current;
      },
    }),
  );
  // `persist` saves on a change only, not the initial state. Without this write a new id would be
  // made on every launch, and the user would change buckets each time.
  store.setState({ userId: store.getState().userId });
  return store;
}

export type SessionStore = ReturnType<typeof createSessionStore>;
