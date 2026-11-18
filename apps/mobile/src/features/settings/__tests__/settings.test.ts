import { createMemoryStorage, createMMKVStorage, STORAGE_IDS } from '@/lib/storage';
import { failNextMMKVWrites } from '@/test/mmkv';

import { defaultSettings, sanitizeSettings } from '../model/settings';
import { createSettingsStore, SETTINGS_STORAGE_KEY } from '../model/settingsStore';

describe('sanitizeSettings', () => {
  it('keeps valid values', () => {
    expect(sanitizeSettings({ language: 'pl', theme: 'dark', aiMode: 'cloud' })).toEqual({
      language: 'pl',
      theme: 'dark',
      aiMode: 'cloud',
    });
  });

  it('drops invalid fields and keeps the valid ones', () => {
    expect(sanitizeSettings({ language: 'de', theme: 'dark', aiMode: 42, extra: true })).toEqual({
      theme: 'dark',
    });
  });

  it.each([null, undefined, 'dark', 7, []])('returns nothing for %p', (stored) => {
    expect(sanitizeSettings(stored)).toEqual({});
  });
});

describe('settings store', () => {
  const create = (storage = createMemoryStorage(), defaultLanguage: 'en' | 'pl' = 'en') =>
    createSettingsStore({ storage, defaultLanguage });

  it('starts with the defaults and the given language', () => {
    expect(create(undefined, 'pl').getState()).toMatchObject(defaultSettings('pl'));
    expect(defaultSettings('en')).toEqual({ language: 'en', theme: 'system', aiMode: 'auto' });
  });

  it('changes each setting', () => {
    const store = create();

    store.getState().setLanguage('pl');
    store.getState().setTheme('dark');
    store.getState().setAiMode('off');

    expect(store.getState()).toMatchObject({ language: 'pl', theme: 'dark', aiMode: 'off' });
  });

  it('saves the values, and only the values, to storage', () => {
    const storage = createMemoryStorage();
    create(storage).getState().setTheme('light');

    const saved = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
    expect(saved.state).toEqual({ language: 'en', theme: 'light', aiMode: 'auto' });
  });

  it('restores saved values in a new store, as after an app restart', () => {
    const storage = createMemoryStorage();
    const first = create(storage);
    first.getState().setLanguage('pl');
    first.getState().setAiMode('on-device');

    const second = create(storage, 'en');

    expect(second.getState()).toMatchObject({
      language: 'pl',
      aiMode: 'on-device',
      theme: 'system',
    });
  });

  it('survives damaged storage and uses the defaults', () => {
    const storage = createMemoryStorage({ [SETTINGS_STORAGE_KEY]: '{ not json' });

    expect(create(storage).getState()).toMatchObject(defaultSettings('en'));
  });

  it('ignores invalid saved values', () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: { language: 'de', theme: 'neon', aiMode: 'cloud' },
        version: 1,
      }),
    });

    expect(create(storage).getState()).toMatchObject({
      language: 'en',
      theme: 'system',
      aiMode: 'cloud',
    });
  });
});

describe('settings store on MMKV', () => {
  const create = () =>
    createSettingsStore({
      storage: createMMKVStorage(STORAGE_IDS.app),
      defaultLanguage: 'en',
    });

  it('restores theme, language and AI mode after a restart', () => {
    const before = create();
    before.getState().setTheme('dark');
    before.getState().setLanguage('pl');
    before.getState().setAiMode('cloud');

    const after = create();

    expect(after.getState()).toMatchObject({ theme: 'dark', language: 'pl', aiMode: 'cloud' });
  });

  it('saves under the settings key in the app instance, not in the cache instance', () => {
    create().getState().setTheme('light');

    expect(createMMKVStorage(STORAGE_IDS.app).getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();
    expect(createMMKVStorage(STORAGE_IDS.apolloCache).getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('keeps working in memory when saving fails', () => {
    const store = create();
    failNextMMKVWrites();

    expect(() => store.getState().setTheme('dark')).not.toThrow();
    expect(store.getState().theme).toBe('dark');
  });
});
