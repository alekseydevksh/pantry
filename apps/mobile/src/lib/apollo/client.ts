import { ApolloClient, InMemoryCache, type ApolloLink } from '@apollo/client';

import { API_URL } from '@/lib/config';

import { createLink } from './links';
import { possibleTypes, typePolicies } from './typePolicies';

export function createCache(): InMemoryCache {
  return new InMemoryCache({ typePolicies, possibleTypes });
}

type ClientOptions = {
  /** Defaults to the HTTP chain against `API_URL`. Tests pass their own. */
  link?: ApolloLink;
  /** Defaults to a new cache. The persistor (task 2.3) passes a cache it has already restored. */
  cache?: InMemoryCache;
};

export function createApolloClient({ link, cache }: ClientOptions = {}) {
  return new ApolloClient({
    link: link ?? createLink({ uri: API_URL }),
    cache: cache ?? createCache(),
    // ADR 0007: a component sees only the fields its own query or fragment selects. Fields from a
    // fragment spread are read with `useFragment` by the component that owns the fragment.
    dataMasking: true,
  });
}
