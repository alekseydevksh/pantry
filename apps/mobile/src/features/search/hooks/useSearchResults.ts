import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';

import { SearchResultsDocument, type SearchInput } from '@pantry/shared';

import {
  canLoadMore,
  isBlankSearch,
  SEARCH_PAGE_SIZE,
  toResultRows,
  type ResultRow,
} from '../model/results';

export type SearchResultsState =
  /** Nothing to search for yet. */
  | { status: 'idle' }
  /** The first request, with nothing to show. */
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | {
      status: 'ready';
      rows: ResultRow[];
      totalCount: number;
      hasNextPage: boolean;
      /** The rows are those of the previous search; the new one is loading. */
      stale: boolean;
      loadingMore: boolean;
      loadMoreFailed: boolean;
      refreshing: boolean;
      refreshFailed: boolean;
      /** Called by the list near its end. Ignored while busy, after the last page and after a failure. */
      loadMore: () => void;
      /** The button after a failure: requests the same page again. */
      retryLoadMore: () => void;
      refresh: () => void;
    };

/**
 * The results of `input`: the first page, the next pages (`fetchMore`) and a refresh. The pages are
 * merged into one list per input by the `search` field policy (ADR 0007), so `data` always holds
 * every loaded page of this search.
 *
 * When the input changes, the rows of the previous search stay (`stale`) until the new first page
 * arrives, so the list does not flash empty on every filter chip.
 */
export function useSearchResults(input: SearchInput): SearchResultsState {
  const blank = isBlankSearch(input);
  const { data, previousData, error, networkStatus, fetchMore, refetch } = useQuery(
    SearchResultsDocument,
    {
      variables: { input, first: SEARCH_PAGE_SIZE },
      skip: blank,
      // Without it `networkStatus` would not report `fetchMore`, and the list could not show a footer.
      notifyOnNetworkStatusChange: true,
    },
  );
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  if (blank) return { status: 'idle' };

  if (!data) {
    // A failed search is an error, not the previous search's rows under the new filters.
    if (error) return { status: 'error', retry: () => void refetch().catch(() => {}) };
    if (!previousData) return { status: 'loading' };
  }

  const shown = data ?? previousData;
  if (!shown) return { status: 'loading' };
  const { endCursor, hasNextPage } = shown.search.pageInfo;
  const stale = !data;
  const loadingMore = networkStatus === NetworkStatus.fetchMore;
  const busy =
    stale ||
    loadingMore ||
    refreshing ||
    networkStatus === NetworkStatus.refetch ||
    networkStatus === NetworkStatus.loading;

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
    rows: toResultRows(shown.search.edges),
    totalCount: shown.search.totalCount,
    hasNextPage,
    stale,
    loadingMore,
    loadMoreFailed,
    refreshing,
    refreshFailed,
    loadMore,
    retryLoadMore: requestNextPage,
    refresh,
  };
}
