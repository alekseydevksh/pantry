// Pure logic of the search results list. No React, no Apollo.
import type { SearchInput, SearchResultsQuery } from '@pantry/shared';

/** Items per request. */
export const SEARCH_PAGE_SIZE = 20;

/** How early the next page is requested, in screens (the same rule as the home feed). */
export const END_REACHED_THRESHOLD = 1.5;

export type ResultNode = SearchResultsQuery['search']['edges'][number]['node'];

/** Columns of the results list per `search_layout` variant (PLAN 3.8). */
export const LAYOUT_COLUMNS = { list: 1, grid: 2 } as const;

/** One row of the list. `key` is stable and unique, so rows keep their identity across pages. */
export type ResultRow = { key: string; node: ResultNode };

export function toResultRows(edges: SearchResultsQuery['search']['edges']): ResultRow[] {
  return edges.map(({ node }) => ({ key: `${node.__typename}:${node.id}`, node }));
}

/** A search with no text and no filter: the screen asks for nothing (the sort alone is not a search). */
export function isBlankSearch(input: SearchInput): boolean {
  return input.query === '' && input.filters == null;
}

/** Items that look the same share a recycling pool. */
export function resultType(row: ResultRow): 'product' | 'recipe' {
  return row.node.__typename === 'Recipe' ? 'recipe' : 'product';
}

export type LoadMoreState = {
  hasNextPage: boolean;
  /** A page request is in flight (the first, a refresh, or the next page). */
  busy: boolean;
  /** The last request for the next page failed. The user retries by hand. */
  failed: boolean;
};

/** One request at a time, none after the last page, none in a loop after a failure. */
export function canLoadMore({ hasNextPage, busy, failed }: LoadMoreState): boolean {
  return hasNextPage && !busy && !failed;
}
