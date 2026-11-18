// Shared test data for the Apollo cache tests. Not a test file (Jest only runs `*.test.ts`).
import { TestFeedDocument, type TestFeedQuery } from '@pantry/shared';

export type FeedNode = TestFeedQuery['feed']['edges'][number]['node'];

// A feed query with an `$after` variable and every field inline (testFeed.graphql), so a test can
// read the items directly. The app's own feed query uses fragments and is masked.
export const FEED = TestFeedDocument;

export const product = (id: string): FeedNode => ({
  __typename: 'Product',
  id,
  name: `Product ${id}`,
  priceCents: 100,
});
export const recipe = (id: string): FeedNode => ({
  __typename: 'Recipe',
  id,
  name: `Recipe ${id}`,
  cookTimeMin: 20,
});

export function feedPage(nodes: FeedNode[], hasNextPage = true): TestFeedQuery {
  return {
    feed: {
      edges: nodes.map((node) => ({ cursor: `c-${node.id}`, node })),
      pageInfo: { hasNextPage, endCursor: nodes.length ? `c-${nodes.at(-1)?.id}` : null },
    },
  };
}
