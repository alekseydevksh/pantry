// The app's one Apollo Client, used by `ApolloProvider` in the root layout.
//
// The persisted cache is restored while this module loads, before the first render: MMKV reads and
// `cache.restore` are synchronous, so the first screen already shows cached data, also offline.
import { createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { createApolloClient, createCache } from './client';
import { createCachePersistor } from './persistence/cachePersistor';
import { flushOnAppStateChange } from './persistence/flushOnAppStateChange';

const cache = createCache();

export const cachePersistor = createCachePersistor({
  cache,
  storage: createMMKVStorage(STORAGE_IDS.apolloCache),
});

const restoreResult = cachePersistor.restore();
if (__DEV__ && process.env.NODE_ENV !== 'test') {
  console.info(`[apollo-persist] restore: ${restoreResult}`);
}

cachePersistor.start();
flushOnAppStateChange(cachePersistor);

export const apolloClient = createApolloClient({ cache });
