import { createMemoryStorage } from '@/lib/storage';

import { createSessionStore, SESSION_STORAGE_KEY } from '../sessionStore';

const UUID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

describe('createSessionStore', () => {
  it('makes an anonymous user id on first launch', () => {
    const store = createSessionStore({ storage: createMemoryStorage(), createId: () => UUID });

    expect(store.getState().userId).toBe(`anon-${UUID}`);
  });

  it('keeps the same user id after a restart, so the user keeps their variants', () => {
    const storage = createMemoryStorage();
    const first = createSessionStore({ storage }).getState().userId;

    const second = createSessionStore({ storage, createId: () => UUID }).getState().userId;

    expect(first).toMatch(/^anon-[0-9a-f-]{36}$/);
    expect(second).toBe(first);
  });

  it.each([
    ['not JSON', '{oops'],
    ['an id that is not ours', JSON.stringify({ state: { userId: 'admin' }, version: 1 })],
    ['an id of the wrong type', JSON.stringify({ state: { userId: 42 }, version: 1 })],
  ])('makes a new id when the stored one is %s', (_case, stored) => {
    const storage = createMemoryStorage({ [SESSION_STORAGE_KEY]: stored });

    expect(createSessionStore({ storage, createId: () => UUID }).getState().userId).toBe(
      `anon-${UUID}`,
    );
  });
});
