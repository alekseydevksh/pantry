import { useLocalSearchParams, useNavigation } from 'expo-router';

import type { SearchInput } from '@pantry/shared';

import { parseSearchParams, toRouteParams, type RawSearchParams } from '../model/searchParams';

/**
 * The search the route describes, and the way to change it. The route params are the only state of
 * the search (ADR 0005, ADR 0010), so a link, the filter chips and the field all go through here.
 */
export function useSearchRoute() {
  const params = useLocalSearchParams() as RawSearchParams;
  // The route's param list is not typed (`/search` has no declared params), so `replaceParams` takes
  // `undefined`. It takes the params of the screen, so the type is narrowed here.
  const navigation = useNavigation() as unknown as {
    replaceParams: (params: Record<string, string>) => void;
  };

  return {
    input: parseSearchParams(params),
    /** Writes `next` to the route. Params that are at their default are removed, not set to `undefined`. */
    setInput: (next: SearchInput) => navigation.replaceParams(toRouteParams(next)),
  };
}
