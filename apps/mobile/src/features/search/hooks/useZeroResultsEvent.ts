import { useEffect } from 'react';

import { track } from '@/analytics';

import type { SearchInput } from '@pantry/shared';

import { searchKey, searchZeroResults } from '../model/searchEvents';
import type { SearchResultsState } from './useSearchResults';

/**
 * Sends `search_zero_results` once when the results of `input` arrive empty. Not while the rows of
 * the previous search are shown (`stale`), and not again on a refresh or a re-render of the same
 * search. Leaving the search and coming back to it is a new view, so it is sent again.
 */
export function useZeroResultsEvent(input: SearchInput, results: SearchResultsState): void {
  const zero = results.status === 'ready' && !results.stale && results.rows.length === 0;
  // The effect depends on the search's key and plain values, not on the `input` object, which is
  // new on each render. Two searches can share the props (other diets) but not the key.
  const key = searchKey(input);
  const { query, filterCount } = searchZeroResults(input);

  useEffect(() => {
    if (zero) track('search_zero_results', { query, filterCount });
  }, [zero, key, query, filterCount]);
}
