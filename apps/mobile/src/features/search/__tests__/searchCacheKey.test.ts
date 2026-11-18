// The reason for the canonical input (ADR 0007, ADR 0010): Apollo keeps one `search` list per
// `input`, so two URLs for the same search must land in one cache entry, not two.
import { SearchResultsDocument, type SearchInput, type SearchResultsQuery } from '@pantry/shared';

import { createCache } from '@/lib/apollo';

import { parseSearchParams, type RawSearchParams } from '../model/searchParams';

const page: SearchResultsQuery = {
  search: {
    edges: [{ cursor: 'c1', node: { __typename: 'Product', id: 'p1' } }],
    pageInfo: { hasNextPage: false, endCursor: 'c1' },
    totalCount: 1,
  },
};

function searchEntries(inputs: SearchInput[]): string[] {
  const cache = createCache();
  for (const input of inputs) {
    cache.writeQuery({ query: SearchResultsDocument, variables: { input, first: 20 }, data: page });
  }
  const root = cache.extract().ROOT_QUERY ?? {};
  // With `keyArgs: ['input']` the field is stored as `search:{"input":{...}}` (keys sorted).
  return Object.keys(root).filter((key) => key.startsWith('search:'));
}

const fromUrls = (...urls: RawSearchParams[]) => urls.map(parseSearchParams);

describe('search cache key', () => {
  it('stores the same search from differently written URLs once', () => {
    const entries = searchEntries(
      fromUrls(
        { q: 'pasta', diet: 'vegan,gluten-free' },
        { q: ' pasta ', diet: ['GLUTEN_FREE', 'vegan'], sort: 'relevance' },
        { q: 'pasta', diet: 'gluten-free,vegan,vegan,banana', maxTime: 'soon', utm_source: 'mail' },
      ),
    );

    expect(entries).toStrictEqual([
      'search:{"input":{"filters":{"diets":["VEGAN","GLUTEN_FREE"]},"query":"pasta"}}',
    ]);
  });

  it('stores the empty search once, whether or not filters were in the URL', () => {
    expect(searchEntries(fromUrls({}, { q: '', diet: '', sort: 'relevance' }))).toHaveLength(1);
  });

  it('stores different searches separately', () => {
    const entries = searchEntries(
      fromUrls({ q: 'pasta' }, { q: 'pasta', diet: 'vegan' }, { q: 'pasta', sort: 'price-asc' }),
    );

    expect(entries).toHaveLength(3);
  });

  it('stores "Pasta" and "pasta" separately: the case of the text is kept (accepted in ADR 0010)', () => {
    expect(searchEntries(fromUrls({ q: 'Pasta' }, { q: 'pasta' }))).toHaveLength(2);
  });

  it('would store the same search twice without the canonical input (why it exists)', () => {
    const entries = searchEntries([
      { query: 'pasta' },
      { query: 'pasta', filters: null },
      { query: 'pasta', sort: 'RELEVANCE' },
    ]);

    expect(entries).toHaveLength(3);
  });
});
