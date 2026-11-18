import { useQuery } from '@apollo/client/react';

import { FeedPreviewDocument, type FeedPreviewQuery } from '@pantry/shared';

export type FeedPreviewItem = FeedPreviewQuery['feed']['edges'][number]['node'];

export type FeedPreviewState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: FeedPreviewItem[] };

/** Phase 0 sample: loads the first feed items. Replaced by the paginated feed in task 2.5. */
export function useFeedPreview(first: number): FeedPreviewState {
  const { data, error } = useQuery(FeedPreviewDocument, { variables: { first } });

  if (data) return { status: 'ready', items: data.feed.edges.map((edge) => edge.node) };
  if (error) return { status: 'error' };
  return { status: 'loading' };
}
