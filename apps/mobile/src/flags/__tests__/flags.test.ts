import { createMemoryStorage } from '@/lib/storage';

import type { FlagOverrides } from '../definitions';
import { createFlags, type FlagExposure, type FlagsOptions } from '../flags';
import { resolveFlag, sanitizeOverrides } from '../model/resolve';
import { createOverridesStore, OVERRIDES_STORAGE_KEY } from '../overridesStore';
import { createLocalJsonProvider, type FlagProvider } from '../provider';

const ALL_GRID = { search_layout: { weights: { list: 0, grid: 1 } } };
const ALL_LIST = { search_layout: { weights: { list: 1, grid: 0 } } };

function setup(options: Partial<FlagsOptions> & { config?: unknown } = {}) {
  const exposures: FlagExposure[] = [];
  let session = 'session-1';
  let overrides: FlagOverrides = {};
  const flags = createFlags({
    provider: createLocalJsonProvider(options.config ?? ALL_GRID),
    userId: () => 'anon-1',
    overrides: () => overrides,
    sessionId: () => session,
    onExposure: (exposure) => exposures.push(exposure),
    ...options,
  });
  return {
    flags,
    exposures,
    newSession: (id: string) => (session = id),
    setOverrides: (next: FlagOverrides) => (overrides = next),
  };
}

describe('resolveFlag', () => {
  it.each([
    [
      'an override first',
      { override: 'grid', assigned: 'list' },
      { variant: 'grid', source: 'override' },
    ],
    ['then the assignment', { assigned: 'grid' }, { variant: 'grid', source: 'assignment' }],
    ['then the default', {}, { variant: 'list', source: 'default' }],
    [
      'an override that is not a variant is ignored',
      { override: 'carousel', assigned: 'grid' },
      { variant: 'grid', source: 'assignment' },
    ],
    [
      'an assignment that is not a variant is ignored',
      { assigned: 'carousel' },
      { variant: 'list', source: 'default' },
    ],
    [
      'null counts as no answer',
      { override: null, assigned: null },
      { variant: 'list', source: 'default' },
    ],
  ])('takes %s', (_case, input, expected) => {
    expect(resolveFlag('search_layout', input)).toStrictEqual(expected);
  });
});

describe('sanitizeOverrides', () => {
  it.each<[string, unknown, FlagOverrides]>([
    ['valid overrides', { search_layout: 'grid' }, { search_layout: 'grid' }],
    ['a removed variant', { search_layout: 'carousel' }, {}],
    ['a removed flag', { old_flag: 'on', search_layout: 'list' }, { search_layout: 'list' }],
    ['a value of the wrong type', { search_layout: 1 }, {}],
    ['null', null, {}],
    ['a string', 'grid', {}],
  ])('keeps only valid entries: %s', (_case, stored, expected) => {
    expect(sanitizeOverrides(stored)).toStrictEqual(expected);
  });
});

describe('createLocalJsonProvider', () => {
  it('assigns by the weights of the config', () => {
    expect(createLocalJsonProvider(ALL_GRID).getVariant('search_layout', { userId: 'a' })).toBe(
      'grid',
    );
  });

  it('has no answer for a flag that is off, missing or broken', () => {
    const context = { userId: 'anon-1' };
    const off = { search_layout: { enabled: false, weights: { grid: 1 } } };
    const broken = { search_layout: { weights: { grid: -1 } } };

    expect(createLocalJsonProvider(off).getVariant('search_layout', context)).toBeNull();
    expect(createLocalJsonProvider({}).getVariant('search_layout', context)).toBeNull();
    expect(createLocalJsonProvider(broken).getVariant('search_layout', context)).toBeNull();
  });

  it('reports problems in the config', () => {
    const onIssue = jest.fn();
    createLocalJsonProvider({ nope: {} }, { onIssue });

    expect(onIssue).toHaveBeenCalledWith({ flag: 'nope', message: 'unknown flag' });
  });
});

describe('createFlags: reading a flag', () => {
  it('uses the assignment, an override over it, and the default when the flag is off', () => {
    const { flags, setOverrides } = setup();
    expect(flags.peek('search_layout')).toStrictEqual({ variant: 'grid', source: 'assignment' });

    setOverrides({ search_layout: 'list' });
    expect(flags.peek('search_layout')).toStrictEqual({ variant: 'list', source: 'override' });

    const off = setup({ config: { search_layout: { enabled: false, weights: { grid: 1 } } } });
    expect(off.flags.peek('search_layout')).toStrictEqual({ variant: 'list', source: 'default' });
  });

  it('resolves against overrides passed in, over the current ones', () => {
    const { flags } = setup();

    expect(flags.peek('search_layout', { search_layout: 'list' }).variant).toBe('list');
  });

  it('uses the default when the provider throws, and reports it', () => {
    const broken: FlagProvider = {
      name: 'broken',
      getVariant: () => {
        throw new Error('provider down');
      },
    };
    const onError = jest.fn();
    const { flags } = setup({ provider: broken, onError });

    expect(flags.get('search_layout')).toBe('list');
    expect(onError).toHaveBeenCalledWith(new Error('provider down'), 'search_layout');
  });

  it('assigns by the current user id', () => {
    let userId = 'anon-1';
    const provider: FlagProvider = {
      name: 'by-user',
      getVariant: (_key, context) => (context.userId === 'anon-1' ? 'list' : 'grid'),
    };
    const { flags } = setup({ provider, userId: () => userId });

    expect(flags.peek('search_layout').variant).toBe('list');
    userId = 'anon-2';
    expect(flags.peek('search_layout').variant).toBe('grid');
  });
});

describe('createFlags: exposure', () => {
  it('logs the exposure once per session, flag and variant', () => {
    const { flags, exposures } = setup();

    flags.get('search_layout');
    flags.get('search_layout');
    flags.expose('search_layout', flags.peek('search_layout'));

    expect(exposures).toStrictEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
    ]);
  });

  it('logs again in a new session', () => {
    const { flags, exposures, newSession } = setup();

    flags.get('search_layout');
    newSession('session-2');
    flags.get('search_layout');
    flags.get('search_layout');

    expect(exposures).toHaveLength(2);
  });

  it('logs a new variant once when an override switches it, and not again when switching back', () => {
    const { flags, exposures, setOverrides } = setup();

    flags.get('search_layout');
    setOverrides({ search_layout: 'list' });
    flags.get('search_layout');
    flags.get('search_layout');
    setOverrides({});
    flags.get('search_layout');

    expect(exposures).toStrictEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
      { flag: 'search_layout', variant: 'list', source: 'override' },
    ]);
  });

  it('logs the source of a default, so an analysis can leave out the kill switch', () => {
    const { flags, exposures } = setup({ config: {} });

    flags.get('search_layout');

    expect(exposures).toStrictEqual([
      { flag: 'search_layout', variant: 'list', source: 'default' },
    ]);
  });

  it('never logs from peek', () => {
    const { flags, exposures } = setup({ config: ALL_LIST });

    flags.peek('search_layout');
    flags.peek('search_layout');

    expect(exposures).toStrictEqual([]);
  });
});

describe('createOverridesStore', () => {
  it('sets, clears one and clears all overrides', () => {
    const store = createOverridesStore(createMemoryStorage());

    store.getState().setOverride('search_layout', 'grid');
    expect(store.getState().overrides).toStrictEqual({ search_layout: 'grid' });
    store.getState().clearOverride('search_layout');
    expect(store.getState().overrides).toStrictEqual({});
    store.getState().setOverride('search_layout', 'list');
    store.getState().clearAll();
    expect(store.getState().overrides).toStrictEqual({});
  });

  it('keeps the overrides in a new store, as after an app restart', () => {
    const storage = createMemoryStorage();
    createOverridesStore(storage).getState().setOverride('search_layout', 'grid');

    expect(createOverridesStore(storage).getState().overrides).toStrictEqual({
      search_layout: 'grid',
    });
  });

  it('drops stored overrides of removed flags and variants', () => {
    const storage = createMemoryStorage({
      [OVERRIDES_STORAGE_KEY]: JSON.stringify({
        state: { overrides: { search_layout: 'carousel', old_flag: 'on' } },
        version: 1,
      }),
    });

    expect(createOverridesStore(storage).getState().overrides).toStrictEqual({});
  });

  it('starts empty when the stored value is not JSON', () => {
    const storage = createMemoryStorage({ [OVERRIDES_STORAGE_KEY]: '{not json' });

    expect(createOverridesStore(storage).getState().overrides).toStrictEqual({});
  });
});
