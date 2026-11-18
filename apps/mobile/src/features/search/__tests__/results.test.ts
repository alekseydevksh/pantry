import { canonicalSearchInput } from '../model/searchParams';
import { canLoadMore, isBlankSearch, resultType, toResultRows } from '../model/results';

describe('isBlankSearch', () => {
  it.each([
    [{ query: '' }, true],
    // The sort alone is not a search.
    [{ query: '', sort: 'PRICE_ASC' as const }, true],
    [{ query: 'pasta' }, false],
    [{ query: '', filters: { diets: ['VEGAN' as const] } }, false],
  ])('%j -> %j', (input, expected) => {
    expect(isBlankSearch(canonicalSearchInput(input))).toBe(expected);
  });
});

describe('canLoadMore', () => {
  it.each([
    [{ hasNextPage: true, busy: false, failed: false }, true],
    [{ hasNextPage: false, busy: false, failed: false }, false],
    [{ hasNextPage: true, busy: true, failed: false }, false],
    [{ hasNextPage: true, busy: false, failed: true }, false],
  ])('%j -> %j', (state, expected) => {
    expect(canLoadMore(state)).toBe(expected);
  });
});

describe('rows', () => {
  const edges = [
    { cursor: 'c1', node: { __typename: 'Product' as const, id: '1' } },
    { cursor: 'c2', node: { __typename: 'Recipe' as const, id: '1' } },
  ];

  it('gives a product and a recipe with the same id different keys and pools', () => {
    // (The nodes of the real query also carry fragment references; the logic reads only these fields.)
    const rows = toResultRows(edges as never);
    expect(rows.map((row) => row.key)).toEqual(['Product:1', 'Recipe:1']);
    expect(rows.map(resultType)).toEqual(['product', 'recipe']);
  });
});
