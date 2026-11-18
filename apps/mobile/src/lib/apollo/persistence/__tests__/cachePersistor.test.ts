import { ApolloLink, gql } from '@apollo/client';
import { Observable } from 'rxjs';

import { TestFeedDocument } from '@pantry/shared';

import { setErrorReporter, type ErrorContext } from '@/lib/observability';
import { createMemoryStorage, createMMKVStorage, STORAGE_IDS } from '@/lib/storage';
import { failNextMMKVWrites } from '@/test/mmkv';

import { createApolloClient, createCache } from '../../client';
import { FEED, feedPage, product, recipe } from '../../__tests__/fixtures';
import {
  CACHE_DATA_KEY,
  CACHE_VERSION_KEY,
  createCachePersistor,
  type CachePersistorOptions,
} from '../cachePersistor';

const VERSION = '1:test';

function setup(overrides: Partial<CachePersistorOptions> = {}) {
  const cache = overrides.cache ?? createCache();
  const storage = overrides.storage ?? createMemoryStorage();
  const persistor = createCachePersistor({ cache, storage, version: VERSION, ...overrides });
  return { cache, storage, persistor };
}

const writeFeed = (cache: ReturnType<typeof createCache>, ids = ['p1', 'p2']) =>
  cache.writeQuery({
    query: FEED,
    variables: { first: 2 },
    data: feedPage(ids.map(product)),
  });

const readFeedIds = (cache: ReturnType<typeof createCache>) =>
  cache.readQuery({ query: FEED, variables: { first: 2 } })?.feed.edges.map((e) => e.node.id);

const stored = (storage: ReturnType<typeof createMemoryStorage>) => {
  const raw = storage.getItem(CACHE_DATA_KEY);
  return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
};

let reports: { error: unknown; context: ErrorContext }[] = [];
let restoreReporter = () => {};
beforeEach(() => {
  jest.useFakeTimers();
  reports = [];
  restoreReporter = setErrorReporter((error, context) => reports.push({ error, context }));
});
afterEach(() => restoreReporter());

describe('restore', () => {
  it('starts empty on the first launch and writes the version', () => {
    const { cache, storage, persistor } = setup();

    expect(persistor.restore()).toBe('empty');
    expect(cache.extract()).toEqual({});
    expect(storage.getItem(CACHE_VERSION_KEY)).toBe(VERSION);
  });

  it('is empty when the version matches but nothing was saved yet', () => {
    const { persistor } = setup({
      storage: createMemoryStorage({ [CACHE_VERSION_KEY]: VERSION }),
    });

    expect(persistor.restore()).toBe('empty');
  });

  it('restores a saved cache, so queries read from it at once', () => {
    const first = setup();
    first.persistor.restore();
    writeFeed(first.cache);
    first.persistor.start();
    writeFeed(first.cache);
    first.persistor.flush();

    // A restart: new cache and persistor, same storage.
    const second = setup({ storage: first.storage });

    expect(second.persistor.restore()).toBe('restored');
    expect(readFeedIds(second.cache)).toEqual(['p1', 'p2']);
  });

  it('keeps a paginated list with all its pages across a restart', () => {
    const first = setup();
    first.persistor.restore();
    first.persistor.start();
    first.cache.writeQuery({
      query: FEED,
      variables: { first: 2 },
      data: feedPage([recipe('r1'), product('p1')]),
    });
    first.cache.writeQuery({
      query: FEED,
      variables: { first: 2, after: 'c-p1' },
      data: feedPage([product('p2')], false),
    });
    jest.runAllTimers();

    const second = setup({ storage: first.storage });
    second.persistor.restore();

    expect(readFeedIds(second.cache)).toEqual(['r1', 'p1', 'p2']);
    // And the next page still appends after the restored ones.
    second.cache.writeQuery({
      query: FEED,
      variables: { first: 2, after: 'c-p2' },
      data: feedPage([product('p3')], false),
    });
    expect(readFeedIds(second.cache)).toEqual(['r1', 'p1', 'p2', 'p3']);
  });

  it('drops a cache saved by another version', () => {
    const storage = createMemoryStorage({
      [CACHE_VERSION_KEY]: '0:old',
      [CACHE_DATA_KEY]: JSON.stringify({ 'Product:p1': { __typename: 'Product', id: 'p1' } }),
    });
    const { cache, persistor } = setup({ storage });

    expect(persistor.restore()).toBe('version-mismatch');
    expect(cache.extract()).toEqual({});
    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
    expect(storage.getItem(CACHE_VERSION_KEY)).toBe(VERSION);
  });

  it('drops a cache saved before versioning existed (data without a version key)', () => {
    const storage = createMemoryStorage({ [CACHE_DATA_KEY]: '{}' });
    const { persistor } = setup({ storage });

    expect(persistor.restore()).toBe('version-mismatch');
    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
  });

  it.each([
    ['broken JSON', '{ not json'],
    ['a JSON array', '[1, 2]'],
    ['a JSON string', '"cache"'],
    ['JSON null', 'null'],
  ])('starts empty, purges and reports when the stored cache is %s', (_, raw) => {
    const storage = createMemoryStorage({ [CACHE_VERSION_KEY]: VERSION, [CACHE_DATA_KEY]: raw });
    const { cache, persistor } = setup({ storage });

    expect(persistor.restore()).toBe('corrupt');
    expect(cache.extract()).toEqual({});
    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.context).toEqual({ source: 'apollo-persist', extra: { stage: 'restore' } });
  });
});

describe('saving', () => {
  it('saves once, 1 s after the last of several quick writes', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();

    writeFeed(cache, ['p1']);
    jest.advanceTimersByTime(400);
    writeFeed(cache, ['p2']);
    jest.advanceTimersByTime(400);
    writeFeed(cache, ['p3']);
    jest.advanceTimersByTime(999);
    expect(stored(storage)).toBeNull();

    jest.advanceTimersByTime(1);
    expect(stored(storage)).toHaveProperty('Product:p3');
  });

  it('does not save when nothing was written', () => {
    const setItem = jest.fn();
    const { persistor } = setup({ storage: { ...createMemoryStorage(), setItem } });
    persistor.start();

    jest.advanceTimersByTime(10_000);
    persistor.flush();

    expect(setItem).not.toHaveBeenCalled();
  });

  it('saves within 5 s even while writes keep coming (max wait)', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();

    for (let i = 0; i < 10; i += 1) {
      writeFeed(cache, [`p${i}`]);
      jest.advanceTimersByTime(500);
    }

    // 10 writes 500 ms apart: a plain debounce would not have saved yet.
    expect(stored(storage)).toHaveProperty('Product:p9');
  });

  it('saves the result of a real query through the client', async () => {
    jest.useRealTimers();
    const cache = createCache();
    const { storage, persistor } = setup({ cache, debounceMs: 0 });
    persistor.restore();
    persistor.start();

    const link = new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next({ data: feedPage([product('p1')]) });
          observer.complete();
        }),
    );
    const client = createApolloClient({ cache, link });
    await client.query({ query: TestFeedDocument, variables: { first: 4 } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stored(storage)).toHaveProperty('Product:p1');
  });

  it('does not save optimistic data', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache, ['p1']);

    cache.recordOptimisticTransaction((proxy) => {
      proxy.writeFragment({
        id: 'Product:p1',
        fragment: gql`
          fragment OptimisticName on Product {
            name
          }
        `,
        data: { __typename: 'Product', name: 'Optimistic name' },
      });
    }, 'optimistic-1');
    jest.runAllTimers();

    expect(cache.extract(true)['Product:p1']).toMatchObject({ name: 'Optimistic name' });
    expect(stored(storage)?.['Product:p1']).toMatchObject({ name: 'Product p1' });
  });

  it('saves after modify and evict too', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache, ['p1', 'p2']);
    jest.runAllTimers();

    cache.modify({ id: 'Product:p1', fields: { name: () => 'Renamed' } });
    jest.runAllTimers();
    expect(stored(storage)?.['Product:p1']).toMatchObject({ name: 'Renamed' });

    cache.evict({ id: 'Product:p2' });
    jest.runAllTimers();
    expect(stored(storage)).not.toHaveProperty('Product:p2');
  });

  it('saves the empty cache after the store is cleared', async () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache);
    jest.runAllTimers();

    await cache.reset();
    jest.runAllTimers();

    expect(stored(storage)).toEqual({});
  });

  it('never throws into Apollo when the storage write fails', () => {
    const { cache, storage, persistor } = setup({
      storage: createMMKVStorage(STORAGE_IDS.apolloCache),
    });
    persistor.restore();
    persistor.start();
    writeFeed(cache);
    failNextMMKVWrites(2);

    expect(() => jest.runAllTimers()).not.toThrow();
    expect(reports.map((r) => r.context.source)).toEqual(['storage', 'storage']);

    // The next save works again.
    writeFeed(cache, ['p9']);
    jest.runAllTimers();
    expect(storage.getItem(CACHE_DATA_KEY)).toContain('Product:p9');
  });
});

describe('size limit', () => {
  it('purges the stored copy, keeps the in-memory cache and reports once', () => {
    const { cache, storage, persistor } = setup({ maxBytes: 600 });
    persistor.restore();
    persistor.start();
    writeFeed(cache, ['p1']);
    jest.runAllTimers();
    expect(stored(storage)).toHaveProperty('Product:p1');

    writeFeed(
      cache,
      Array.from({ length: 20 }, (_, i) => `p${i}`),
    );
    jest.runAllTimers();
    writeFeed(
      cache,
      Array.from({ length: 21 }, (_, i) => `p${i}`),
    );
    jest.runAllTimers();

    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
    expect(readFeedIds(cache)).toHaveLength(21);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.context.extra).toMatchObject({ stage: 'save', maxBytes: 600 });
  });

  it('saves again once the cache fits', () => {
    const { cache, storage, persistor } = setup({ maxBytes: 600 });
    persistor.restore();
    persistor.start();
    writeFeed(
      cache,
      Array.from({ length: 20 }, (_, i) => `p${i}`),
    );
    jest.runAllTimers();
    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();

    // A refetch replaces the list; gc drops the products nothing points to any more.
    writeFeed(cache, ['p1']);
    cache.gc();
    cache.modify({ id: 'Product:p1', fields: { name: (name: string) => name } });
    jest.runAllTimers();

    expect(stored(storage)).toHaveProperty('Product:p1');
  });

  it('measures UTF-8 bytes, not characters', () => {
    // 'ż' is 1 character but 2 bytes. 300 of them are 600 bytes of text alone.
    const { cache, storage, persistor } = setup({ maxBytes: 600 });
    persistor.restore();
    persistor.start();
    cache.writeQuery({
      query: FEED,
      variables: { first: 2 },
      data: feedPage([{ ...product('p1'), name: 'ż'.repeat(300) }]),
    });
    jest.runAllTimers();

    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
  });
});

describe('lifecycle', () => {
  it('flush saves a pending write at once', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache);

    persistor.flush();

    expect(stored(storage)).toHaveProperty('Product:p1');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stop cancels a pending save and stops watching the cache', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache);

    persistor.stop();
    jest.runAllTimers();
    writeFeed(cache, ['p3']);
    jest.runAllTimers();

    expect(stored(storage)).toBeNull();
  });

  it('start twice does not save twice', () => {
    const setItem = jest.fn();
    const { cache, persistor } = setup({ storage: { ...createMemoryStorage(), setItem } });
    persistor.start();
    persistor.start();

    writeFeed(cache);
    jest.runAllTimers();

    expect(setItem.mock.calls.filter(([key]) => key === CACHE_DATA_KEY)).toHaveLength(1);
  });

  it('purge deletes the stored copy only', () => {
    const { cache, storage, persistor } = setup();
    persistor.restore();
    persistor.start();
    writeFeed(cache);
    persistor.flush();

    persistor.purge();

    expect(storage.getItem(CACHE_DATA_KEY)).toBeNull();
    expect(readFeedIds(cache)).toEqual(['p1', 'p2']);
  });
});
