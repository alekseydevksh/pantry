import { gql, type Reference } from '@apollo/client';

import type { TestFeedQuery } from '@pantry/shared';

import { createCache } from '../client';
import { mergeConnection } from '../pagination';
import { FEED, feedPage, product, recipe } from './fixtures';

// ---------------------------------------------------------------------------------------------
// mergeConnection: the merge rules on their own, with cached (normalized) edges.
// ---------------------------------------------------------------------------------------------

const ref = (id: string): Reference => ({ __ref: `Product:${id}` });
const edge = (id: string) => ({ cursor: `c-${id}`, node: ref(id) });
const page = (ids: string[], extra: { hasNextPage?: boolean; totalCount?: number } = {}) => ({
  edges: ids.map(edge),
  pageInfo: { hasNextPage: extra.hasNextPage ?? true, endCursor: `c-${ids.at(-1)}` },
  totalCount: extra.totalCount ?? 99,
});
const ids = (connection: { edges: { node: unknown }[] }) =>
  connection.edges.map((e) => (e.node as Reference).__ref.replace('Product:', ''));

describe('mergeConnection', () => {
  it('stores the first page as it is', () => {
    const first = page(['1', '2']);
    expect(mergeConnection(undefined, first, null)).toBe(first);
  });

  it('appends the next page after the `after` cursor', () => {
    const merged = mergeConnection(page(['1', '2']), page(['3', '4']), 'c-2');
    expect(ids(merged)).toEqual(['1', '2', '3', '4']);
  });

  it('gives the same list when the same page is fetched twice', () => {
    const once = mergeConnection(page(['1', '2']), page(['3', '4']), 'c-2');
    const twice = mergeConnection(once, page(['3', '4']), 'c-2');
    expect(ids(twice)).toEqual(['1', '2', '3', '4']);
  });

  it('drops a node that is already in the list (pages overlap)', () => {
    const merged = mergeConnection(page(['1', '2']), page(['2', '3']), 'c-2');
    expect(ids(merged)).toEqual(['1', '2', '3']);
  });

  it('drops duplicates inside the incoming page', () => {
    const merged = mergeConnection(page(['1']), page(['2', '2', '3']), 'c-1');
    expect(ids(merged)).toEqual(['1', '2', '3']);
  });

  it('appends at the end when the `after` cursor is not in the list', () => {
    const merged = mergeConnection(page(['1', '2']), page(['2', '5']), 'c-unknown');
    expect(ids(merged)).toEqual(['1', '2', '5']);
  });

  it('replaces later pages when an earlier page is fetched again', () => {
    const threePages = mergeConnection(page(['1', '2', '3', '4']), page(['5']), 'c-4');
    const again = mergeConnection(threePages, page(['3', '9']), 'c-2');
    expect(ids(again)).toEqual(['1', '2', '3', '9']);
  });

  it('replaces the whole list on a request without `after` (refetch, pull-to-refresh)', () => {
    const loaded = mergeConnection(page(['1', '2']), page(['3', '4']), 'c-2');
    const refreshed = mergeConnection(loaded, page(['7', '1']), null);
    expect(ids(refreshed)).toEqual(['7', '1']);
  });

  it('takes pageInfo and totalCount from the latest page', () => {
    const merged = mergeConnection(
      page(['1'], { totalCount: 3 }),
      page(['2', '3'], { hasNextPage: false, totalCount: 3 }),
      'c-1',
    );
    expect(merged.pageInfo).toEqual({ hasNextPage: false, endCursor: 'c-3' });
    expect(merged.totalCount).toBe(3);
  });

  it('uses the cursor as the identity of a node that is not normalized', () => {
    const plain = (cursor: string) => ({ cursor, node: { name: 'no id' } });
    const merged = mergeConnection(
      { edges: [plain('a'), plain('b')], pageInfo: {} },
      { edges: [plain('b'), plain('c')], pageInfo: {} },
      'x',
    );
    expect(merged.edges.map((e) => e.cursor)).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------------------------
// Through a real InMemoryCache with the app's type policies: writes, reads and key arguments.
// ---------------------------------------------------------------------------------------------

describe('feed type policy', () => {
  it('appends pages from fetchMore and reads them as one list, with both union members', () => {
    const cache = createCache();
    cache.writeQuery({
      query: FEED,
      variables: { first: 2 },
      data: feedPage([recipe('r1'), product('p1')]),
    });
    cache.writeQuery({
      query: FEED,
      variables: { first: 2, after: 'c-p1' },
      data: feedPage([product('p2'), recipe('r2')], false),
    });

    const result = cache.readQuery({ query: FEED, variables: { first: 2 } });

    expect(result?.feed.edges.map((e) => e.node)).toEqual([
      recipe('r1'),
      product('p1'),
      product('p2'),
      recipe('r2'),
    ]);
    expect(result?.feed.pageInfo).toEqual({ hasNextPage: false, endCursor: 'c-r2' });
  });

  it('stores each item once, normalized, so the feed and other queries share it', () => {
    const cache = createCache();
    cache.writeQuery({
      query: FEED,
      variables: { first: 2 },
      data: feedPage([product('p1')]),
    });

    expect(cache.extract()['Product:p1']).toMatchObject({ name: 'Product p1' });
  });

  it('replaces the list on a refetch of the first page', () => {
    const cache = createCache();
    const write = (data: TestFeedQuery, after?: string) =>
      cache.writeQuery({ query: FEED, variables: { first: 2, after }, data });

    write(feedPage([product('p1'), product('p2')]));
    write(feedPage([product('p3')]), 'c-p2');
    write(feedPage([product('p9'), product('p1')]));

    const result = cache.readQuery({ query: FEED, variables: { first: 2 } });
    expect(result?.feed.edges.map((e) => e.node.id)).toEqual(['p9', 'p1']);
  });
});

describe('search type policy', () => {
  // A minimal search operation, only for these cache tests (the real one arrives in Phase 3).
  const SEARCH = gql`
    query TestSearch($input: SearchInput!, $first: Int!, $after: String) {
      search(input: $input, first: $first, after: $after) {
        totalCount
        edges {
          cursor
          node {
            ... on Product {
              id
              name
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

  const searchPage = (nodeIds: string[], totalCount: number) => ({
    search: {
      __typename: 'SearchResult',
      totalCount,
      edges: nodeIds.map((id) => ({
        __typename: 'SearchEdge',
        cursor: `c-${id}`,
        node: { __typename: 'Product', id, name: id },
      })),
      pageInfo: { __typename: 'PageInfo', hasNextPage: true, endCursor: `c-${nodeIds.at(-1)}` },
    },
  });

  const readIds = (cache: ReturnType<typeof createCache>, input: object) =>
    cache
      .readQuery<ReturnType<typeof searchPage>>({ query: SEARCH, variables: { input, first: 2 } })
      ?.search.edges.map((e) => e.node.id);

  it('keeps one list per search input', () => {
    const cache = createCache();
    const pasta = { query: 'pasta' };
    const vegan = { query: 'pasta', filters: { diets: ['VEGAN'] } };

    cache.writeQuery({
      query: SEARCH,
      variables: { input: pasta, first: 2 },
      data: searchPage(['p1', 'p2'], 4),
    });
    cache.writeQuery({
      query: SEARCH,
      variables: { input: vegan, first: 2 },
      data: searchPage(['p7'], 1),
    });
    cache.writeQuery({
      query: SEARCH,
      variables: { input: pasta, first: 2, after: 'c-p2' },
      data: searchPage(['p3', 'p4'], 4),
    });

    expect(readIds(cache, pasta)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(readIds(cache, vegan)).toEqual(['p7']);
  });

  it('treats the same input with a different key order as the same list', () => {
    const cache = createCache();
    cache.writeQuery({
      query: SEARCH,
      variables: { input: { query: 'soup', sort: 'PRICE_ASC' }, first: 2 },
      data: searchPage(['p1'], 1),
    });

    expect(readIds(cache, { sort: 'PRICE_ASC', query: 'soup' })).toEqual(['p1']);
  });
});
