import { useEffect, useState } from 'react';

import { FeedPreviewDocument, type FeedPreviewQuery } from '@pantry/shared';

import { request } from '@/lib/graphql/request';

export type FeedPreviewItem = FeedPreviewQuery['feed']['edges'][number]['node'];

export type FeedPreviewState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: FeedPreviewItem[] };

/** Phase 0 sample: loads the first feed items once. Replaced by the Apollo feed in task 2.5. */
export function useFeedPreview(first: number): FeedPreviewState {
  const [state, setState] = useState<FeedPreviewState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    request(FeedPreviewDocument, { first }, controller.signal)
      .then((data) => {
        setState({ status: 'ready', items: data.feed.edges.map((edge) => edge.node) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [first]);

  return state;
}
