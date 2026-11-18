import type { SearchInput } from '@pantry/shared';

import type { ResultRow } from '../model/results';
import {
  searchKey,
  searchResultClicked,
  searchSubmitted,
  searchZeroResults,
} from '../model/searchEvents';

const row = (typename: 'Product' | 'Recipe', id: string) =>
  ({ key: `${typename}:${id}`, node: { __typename: typename, id } }) as ResultRow;

describe('searchSubmitted', () => {
  it('describes the canonical search', () => {
    expect(
      searchSubmitted(
        {
          query: '  tomato   soup ',
          filters: { diets: ['VEGAN', 'VEGAN', 'VEGETARIAN'], maxTimeMin: 30 },
          sort: 'PRICE_ASC',
        },
        'field',
      ),
    ).toStrictEqual({ query: 'tomato soup', source: 'field', filterCount: 3, sort: 'PRICE_ASC' });
  });

  it('spells out the default sort', () => {
    expect(searchSubmitted({ query: 'pasta' }, 'suggestion')?.sort).toBe('RELEVANCE');
  });

  it('counts a search with filters and no text', () => {
    expect(searchSubmitted({ query: '', filters: { kind: 'RECIPE' } }, 'field')).toStrictEqual({
      query: '',
      source: 'field',
      filterCount: 1,
      sort: 'RELEVANCE',
    });
  });

  it.each<[string, SearchInput]>([
    ['no text', { query: '' }],
    ['only spaces', { query: '   ' }],
    ['only a sort', { query: ' ', sort: 'PRICE_DESC' }],
    ['empty filters', { query: '', filters: { diets: [], maxTimeMin: null } }],
  ])('is null for a blank search: %s', (_case, input) => {
    expect(searchSubmitted(input, 'field')).toBeNull();
  });
});

describe('searchResultClicked', () => {
  it('gives a 1-based position and the kind of item', () => {
    expect(searchResultClicked({ query: ' pasta ' }, row('Recipe', 'r9'), 0)).toStrictEqual({
      query: 'pasta',
      position: 1,
      itemId: 'r9',
      itemType: 'recipe',
    });
    expect(searchResultClicked({ query: 'pasta' }, row('Product', 'p4'), 41)).toMatchObject({
      position: 42,
      itemType: 'product',
    });
  });
});

describe('searchZeroResults and searchKey', () => {
  it('describe the canonical search', () => {
    expect(
      searchZeroResults({ query: 'xyzzy ', filters: { excludeAllergens: ['NUTS'] } }),
    ).toStrictEqual({ query: 'xyzzy', filterCount: 1 });
  });

  it('give one key to two spellings of the same search, and two to different searches', () => {
    const a = searchKey({ query: 'pasta', filters: { diets: ['VEGETARIAN', 'VEGAN'] } });
    const b = searchKey({
      query: ' pasta',
      filters: { diets: ['VEGAN', 'VEGETARIAN'] },
      sort: 'RELEVANCE',
    });
    const c = searchKey({ query: 'pasta', filters: { diets: ['VEGAN'] } });

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
