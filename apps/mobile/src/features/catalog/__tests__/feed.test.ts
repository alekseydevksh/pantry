import type { FeedQuery } from '@pantry/shared';

import { canLoadMore, rowType, toFeedRows } from '../model/feed';

// What the feed query returns: each node is only a type and an id (the cards read their own fields).
const edges: FeedQuery['feed']['edges'] = [
  { cursor: 'c1', node: { __typename: 'Product', id: 'p1' } },
  { cursor: 'c2', node: { __typename: 'Recipe', id: 'r1' } },
  // The same id under another type is a different item.
  { cursor: 'c3', node: { __typename: 'Product', id: 'r1' } },
];

describe('toFeedRows', () => {
  it('gives every row a key made of the type and the id', () => {
    expect(toFeedRows(edges).map((row) => row.key)).toEqual([
      'Product:p1',
      'Recipe:r1',
      'Product:r1',
    ]);
  });

  it('keeps the order and the node of each edge', () => {
    const rows = toFeedRows(edges);

    expect(rows.map((row) => row.node)).toEqual(edges.map((edge) => edge.node));
  });

  it('returns no rows for no edges', () => {
    expect(toFeedRows([])).toEqual([]);
  });
});

describe('canLoadMore', () => {
  it.each([
    [
      'there is a next page and nothing is happening',
      { hasNextPage: true, busy: false, failed: false },
      true,
    ],
    ['it is the last page', { hasNextPage: false, busy: false, failed: false }, false],
    ['a request is already running', { hasNextPage: true, busy: true, failed: false }, false],
    [
      'the last request failed (the user retries by hand)',
      { hasNextPage: true, busy: false, failed: true },
      false,
    ],
    [
      'it is the last page and a request is running',
      { hasNextPage: false, busy: true, failed: false },
      false,
    ],
  ])('when %s: %s', (_name, state, expected) => {
    expect(canLoadMore(state)).toBe(expected);
  });
});

describe('rowType', () => {
  it('puts products and recipes in separate recycling pools', () => {
    const [product, recipe] = toFeedRows(edges);

    expect(product && rowType(product)).toBe('product');
    expect(recipe && rowType(recipe)).toBe('recipe');
  });
});
