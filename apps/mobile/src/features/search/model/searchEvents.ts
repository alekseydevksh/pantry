// The props of the search analytics events (ADR 0011). Pure: the components decide when an event
// happens, these functions decide what it says.
import type { AnalyticsEvents, SearchSource } from '@/analytics';

import type { SearchInput } from '@pantry/shared';

import { activeFilterCount } from './filters';
import { isBlankSearch, resultType, type ResultRow } from './results';
import { canonicalSearchInput } from './searchParams';
import { DEFAULT_SORT } from './searchValues';

/** The search the user submitted, or `null` when it is blank (nothing is searched, nothing sent). */
export function searchSubmitted(
  input: SearchInput,
  source: SearchSource,
): AnalyticsEvents['search_submitted'] | null {
  const search = canonicalSearchInput(input);
  if (isBlankSearch(search)) return null;
  return {
    query: search.query,
    source,
    filterCount: activeFilterCount(search),
    sort: search.sort ?? DEFAULT_SORT,
  };
}

/** The result at `index` (0-based, as in the list) was opened. */
export function searchResultClicked(
  input: SearchInput,
  row: ResultRow,
  index: number,
): AnalyticsEvents['search_result_clicked'] {
  return {
    query: canonicalSearchInput(input).query,
    position: index + 1,
    itemId: row.node.id,
    itemType: resultType(row),
  };
}

export function searchZeroResults(input: SearchInput): AnalyticsEvents['search_zero_results'] {
  const search = canonicalSearchInput(input);
  return { query: search.query, filterCount: activeFilterCount(search) };
}

/** One string per search, for "has this search been reported already". The input is canonical. */
export function searchKey(input: SearchInput): string {
  return JSON.stringify(canonicalSearchInput(input));
}
