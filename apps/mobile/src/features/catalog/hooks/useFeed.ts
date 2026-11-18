import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';

import { FeedDocument } from '@pantry/shared';

import { canLoadMore, FEED_PAGE_SIZE, toFeedRows, type FeedRow } from '../model/feed';

export type FeedState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | {
      status: 'ready';
      rows: FeedRow[];
      hasNextPage: boolean;
      /** The next page is being loaded. */
      loadingMore: boolean;
      /** The last request for the next page failed. */
      loadMoreFailed: boolean;
      /** Pull-to-refresh is running. */
      refreshing: boolean;
      /** The last refresh failed. The list on screen is the one from before. */
      refreshFailed: boolean;
      /** Called by the list near its end. Ignored while busy, after the last page and after a failure. */
      loadMore: () => void;
      /** The button after a failure: requests the same page again. */
      retryLoadMore: () => void;
      refresh: () => void;
    };

/**
 * The home feed: the first page, the next pages (`fetchMore`) and a refresh. The pages are merged
 * into one list by the `feed` field policy (ADR 0007), so `data` always holds every loaded page and
 * the screen never has to join them.
 */
export function useFeed(): FeedState {
  const { data, error, networkStatus, fetchMore, refetch } = useQuery(FeedDocument, {
    variables: { first: FEED_PAGE_SIZE },
    // Show what the persisted cache has at once (also with no network), and ask the server for the
    // first page in the background. After that first answer the query reads from the cache only:
    // with `cache-and-network` for good, every cache write (a `fetchMore` page) would start another
    // request for page one, which replaces the list and throws away the pages the user scrolled to.
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    // Without it `networkStatus` would not report `fetchMore`, and the list could not show a footer.
    notifyOnNetworkStatusChange: true,
  });
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  if (!data) {
    if (error) return { status: 'error', retry: () => void refetch().catch(() => {}) };
    return { status: 'loading' };
  }

  const { endCursor, hasNextPage } = data.feed.pageInfo;
  const loadingMore = networkStatus === NetworkStatus.fetchMore;
  // `loading` with data on screen is the first request for page one, which `cache-and-network` sends
  // while the cached list is already shown. A page appended before it finishes would be replaced by it.
  const busy =
    loadingMore ||
    refreshing ||
    networkStatus === NetworkStatus.refetch ||
    networkStatus === NetworkStatus.loading;
  // The background request failed (no network, server down) and the screen shows what was cached.
  const revalidationFailed = networkStatus === NetworkStatus.error;

  function requestNextPage() {
    setLoadMoreFailed(false);
    // The field policy appends the page, so nothing is done with the result here.
    fetchMore({ variables: { after: endCursor } }).catch(() => setLoadMoreFailed(true));
  }

  function loadMore() {
    if (canLoadMore({ hasNextPage, busy, failed: loadMoreFailed })) requestNextPage();
  }

  function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshFailed(false);
    setLoadMoreFailed(false);
    // A request without `after` replaces the list with the first page.
    refetch()
      .catch(() => setRefreshFailed(true))
      .finally(() => setRefreshing(false));
  }

  return {
    status: 'ready',
    rows: toFeedRows(data.feed.edges),
    hasNextPage,
    loadingMore,
    loadMoreFailed,
    refreshing,
    refreshFailed: refreshFailed || revalidationFailed,
    loadMore,
    retryLoadMore: requestNextPage,
    refresh,
  };
}
