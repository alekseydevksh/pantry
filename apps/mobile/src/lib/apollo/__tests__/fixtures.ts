// Shared test data for the Apollo cache tests. Not a test file (Jest only runs `*.test.ts`).
import { gql, type TypedDocumentNode } from '@apollo/client';

import type { FeedPreviewQuery } from '@pantry/shared';

export type FeedNode = FeedPreviewQuery['feed']['edges'][number]['node'];

// The sample feed query from Phase 0 with an `$after` variable. The real paginated feed query
// arrives in task 2.5; its result has the same shape, so it reuses the generated result type.
export const FEED: TypedDocumentNode<FeedPreviewQuery, { first: number; after?: string }> = gql`
  query TestFeed($first: Int!, $after: String) {
    feed(first: $first, after: $after) {
      edges {
        cursor
        node {
          __typename
          ... on Product {
            id
            name
            priceCents
          }
          ... on Recipe {
            id
            name
            cookTimeMin
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

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

export function feedPage(nodes: FeedNode[], hasNextPage = true): FeedPreviewQuery {
  return {
    feed: {
      edges: nodes.map((node) => ({ cursor: `c-${node.id}`, node })),
      pageInfo: { hasNextPage, endCursor: nodes.length ? `c-${nodes.at(-1)?.id}` : null },
    },
  };
}
