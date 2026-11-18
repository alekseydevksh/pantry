// Pure logic of the home feed. No React, no Apollo.
import type { FeedQuery } from '@pantry/shared';

/** Items per request. 260 items in the seed catalog = 13 pages. */
export const FEED_PAGE_SIZE = 20;

/**
 * How early the next page is requested, in screens: 1.5 means "when the end of the loaded list is
 * less than one and a half screens away". Early enough that a normal scroll never reaches the end.
 */
export const END_REACHED_THRESHOLD = 1.5;

export type FeedNode = FeedQuery['feed']['edges'][number]['node'];
export type ProductNode = Extract<FeedNode, { __typename: 'Product' }>;
export type RecipeNode = Extract<FeedNode, { __typename: 'Recipe' }>;

/** One row of the list. `key` is stable and unique, so rows keep their identity across pages. */
export type FeedRow = { key: string; node: FeedNode };

export function toFeedRows(edges: FeedQuery['feed']['edges']): FeedRow[] {
  return edges.map(({ node }) => ({ key: `${node.__typename}:${node.id}`, node }));
}

export type LoadMoreState = {
  hasNextPage: boolean;
  /** A page request is in flight (the first, a refresh, or the next page). */
  busy: boolean;
  /** The last request for the next page failed. The user retries by hand, so it is not repeated in a loop. */
  failed: boolean;
};

/**
 * The list calls `onEndReached` often (every scroll event near the end), so every call goes through
 * this check: one request at a time, none after the last page, and none in a loop after a failure.
 */
export function canLoadMore({ hasNextPage, busy, failed }: LoadMoreState): boolean {
  return hasNextPage && !busy && !failed;
}

/** Items that look the same share a recycling pool, so FlashList reuses a product row for a product. */
export function rowType(row: FeedRow): 'product' | 'recipe' {
  return row.node.__typename === 'Recipe' ? 'recipe' : 'product';
}
