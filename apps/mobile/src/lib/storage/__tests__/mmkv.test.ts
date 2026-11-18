import { setErrorReporter, type ErrorContext } from '@/lib/observability';
import { failNextMMKVWrites } from '@/test/mmkv';

import { createMMKVStorage, STORAGE_IDS } from '../mmkv';

describe('createMMKVStorage', () => {
  it('returns null for a key that was never written', () => {
    expect(createMMKVStorage(STORAGE_IDS.app).getItem('missing')).toBeNull();
  });

  it('writes, reads and removes a value', () => {
    const storage = createMMKVStorage(STORAGE_IDS.app);

    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');

    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('keeps an empty string apart from a missing value', () => {
    const storage = createMMKVStorage(STORAGE_IDS.app);
    storage.setItem('empty', '');

    expect(storage.getItem('empty')).toBe('');
  });

  it('keeps the app and the Apollo cache instances apart', () => {
    const app = createMMKVStorage(STORAGE_IDS.app);
    const cache = createMMKVStorage(STORAGE_IDS.apolloCache);

    app.setItem('shared-key', 'settings');
    cache.setItem('shared-key', 'cache');
    cache.removeItem('shared-key');

    expect(app.getItem('shared-key')).toBe('settings');
    expect(cache.getItem('shared-key')).toBeNull();
  });

  it('reads earlier writes from a new instance with the same id, as after a restart', () => {
    createMMKVStorage(STORAGE_IDS.app).setItem('k', 'before restart');

    expect(createMMKVStorage(STORAGE_IDS.app).getItem('k')).toBe('before restart');
  });

  describe('when a write fails', () => {
    const reports: { error: unknown; context: ErrorContext }[] = [];
    let restore = () => {};

    beforeEach(() => {
      reports.length = 0;
      restore = setErrorReporter((error, context) => reports.push({ error, context }));
    });
    afterEach(() => restore());

    it('reports the error instead of throwing it', () => {
      const storage = createMMKVStorage(STORAGE_IDS.app);
      failNextMMKVWrites();

      expect(() => storage.setItem('k', 'v')).not.toThrow();
      expect(storage.getItem('k')).toBeNull();
      expect(reports).toHaveLength(1);
      expect(reports[0]?.context).toEqual({
        source: 'storage',
        extra: { id: 'pantry', operation: 'set', key: 'k' },
      });
    });

    it('reports a failed remove too', () => {
      const storage = createMMKVStorage(STORAGE_IDS.app);
      storage.setItem('k', 'v');
      failNextMMKVWrites();

      expect(() => storage.removeItem('k')).not.toThrow();
      expect(reports[0]?.context.extra).toMatchObject({ operation: 'remove' });
    });

    it('lets the next write succeed', () => {
      const storage = createMMKVStorage(STORAGE_IDS.app);
      failNextMMKVWrites();
      storage.setItem('k', 'lost');
      storage.setItem('k', 'saved');

      expect(storage.getItem('k')).toBe('saved');
    });
  });
});
