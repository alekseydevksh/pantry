import { createTestClient } from './helpers';

interface Item {
  __typename: 'Product' | 'Recipe';
  id: string;
  name: string;
  priceCents: number;
  diets: string[];
  allergens: string[];
  cookTimeMin?: number;
}
interface Connection {
  edges: { cursor: string; node: Item }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount?: number;
}

const ITEM_FIELDS = `
  __typename
  ... on Product { id name priceCents diets allergens }
  ... on Recipe { id name priceCents diets allergens cookTimeMin }
`;
const FEED = `query ($first: Int!, $after: String) {
  feed(first: $first, after: $after) { edges { cursor node { ${ITEM_FIELDS} } } pageInfo { hasNextPage endCursor } }
}`;
const SEARCH = `query ($input: SearchInput!, $first: Int!, $after: String) {
  search(input: $input, first: $first, after: $after) {
    totalCount edges { cursor node { ${ITEM_FIELDS} } } pageInfo { hasNextPage endCursor }
  }
}`;

const { gql, ok } = createTestClient();

async function searchAll(input: Record<string, unknown>): Promise<Item[]> {
  const { search } = await ok<{ search: Connection }>(SEARCH, { input, first: 50 });
  expect(search.totalCount).toBeLessThanOrEqual(50); // otherwise the test would miss items
  return search.edges.map((edge) => edge.node);
}

describe('feed pagination', () => {
  it('walks the whole catalog with cursors, without duplicates or gaps', async () => {
    const ids: string[] = [];
    let after: string | null = null;
    let pages = 0;
    do {
      const { feed }: { feed: Connection } = await ok(FEED, { first: 40, after });
      ids.push(...feed.edges.map((edge) => edge.node.id));
      expect(feed.pageInfo.endCursor).toBe(feed.edges.at(-1)?.cursor ?? null);
      after = feed.pageInfo.hasNextPage ? feed.pageInfo.endCursor : null;
      pages += 1;
    } while (after !== null && pages < 20);

    expect(ids).toHaveLength(266); // 206 products + 60 recipes
    expect(new Set(ids).size).toBe(266);
  });

  it('mixes products and recipes on the first page', async () => {
    const { feed } = await ok<{ feed: Connection }>(FEED, { first: 12 });
    const kinds = new Set(feed.edges.map((edge) => edge.node.__typename));
    expect(kinds).toEqual(new Set(['Product', 'Recipe']));
  });

  it('returns the same page for the same cursor', async () => {
    const first = await ok<{ feed: Connection }>(FEED, { first: 5 });
    const cursor = first.feed.pageInfo.endCursor;
    const a = await ok<{ feed: Connection }>(FEED, { first: 5, after: cursor });
    const b = await ok<{ feed: Connection }>(FEED, { first: 5, after: cursor });
    expect(a).toEqual(b);
    expect(a.feed.edges[0]?.node.id).not.toBe(first.feed.edges[4]?.node.id);
  });

  it('caps the page size and rejects bad input with a code', async () => {
    const big = await ok<{ feed: Connection }>(FEED, { first: 1000 });
    expect(big.feed.edges).toHaveLength(50);

    for (const variables of [{ first: 0 }, { first: 5, after: 'not-a-cursor' }]) {
      const result = await gql(FEED, variables);
      expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    }
  });

  it('reports no next page on the last page', async () => {
    const { search } = await ok<{ search: Connection }>(SEARCH, {
      input: { query: 'spaghetti', filters: { kind: 'PRODUCT' } },
      first: 50,
    });
    expect(search.edges.length).toBe(search.totalCount);
    expect(search.pageInfo.hasNextPage).toBe(false);
  });
});

describe('search', () => {
  it('finds items by name, ignoring case and plurals', async () => {
    const items = await searchAll({ query: 'TOMATO', filters: { kind: 'PRODUCT' } });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.name.toLowerCase()).toContain('tomato');
  });

  it('finds recipes by ingredient and ranks name matches first', async () => {
    const items = await searchAll({ query: 'halloumi' });
    expect(items.some((item) => item.__typename === 'Recipe')).toBe(true);
    const firstWithoutName = items.findIndex(
      (item) => !item.name.toLowerCase().includes('halloumi'),
    );
    const lastWithName = items.findLastIndex((item) =>
      item.name.toLowerCase().includes('halloumi'),
    );
    if (firstWithoutName !== -1) expect(lastWithName).toBeLessThan(firstWithoutName);
  });

  it('needs every word of the query to match', async () => {
    const { search } = await ok<{ search: Connection }>(SEARCH, {
      input: { query: 'tomato xylophone' },
      first: 10,
    });
    expect(search.totalCount).toBe(0);
    expect(search.edges).toEqual([]);
    expect(search.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
  });

  it('filters by diet: every result has all requested diets', async () => {
    const items = await searchAll({
      query: 'curry',
      filters: { diets: ['VEGAN', 'GLUTEN_FREE'] },
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.diets).toEqual(expect.arrayContaining(['VEGAN', 'GLUTEN_FREE']));
    }
  });

  it('excludes allergens', async () => {
    const all = await searchAll({ query: 'noodles' });
    const safe = await searchAll({
      query: 'noodles',
      filters: { excludeAllergens: ['PEANUTS', 'EGGS'] },
    });
    expect(safe.length).toBeGreaterThan(0);
    expect(safe.length).toBeLessThan(all.length);
    for (const item of safe) {
      expect(item.allergens).not.toContain('PEANUTS');
      expect(item.allergens).not.toContain('EGGS');
    }
  });

  it('treats a time limit as "recipes only" and applies it', async () => {
    const { search } = await ok<{ search: Connection }>(SEARCH, {
      input: { query: '', filters: { maxTimeMin: 15 } },
      first: 50,
    });
    expect(search.edges.length).toBeGreaterThan(0);
    for (const { node } of search.edges) {
      expect(node.__typename).toBe('Recipe');
      expect(node.cookTimeMin).toBeLessThanOrEqual(15);
    }
  });

  it('applies a price limit and combines filters with AND', async () => {
    const items = await searchAll({
      query: '',
      filters: {
        kind: 'RECIPE',
        diets: ['VEGETARIAN'],
        maxTimeMin: 30,
        maxPriceCents: 1200,
        excludeAllergens: ['NUTS'],
      },
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.priceCents).toBeLessThanOrEqual(1200);
      expect(item.cookTimeMin).toBeLessThanOrEqual(30);
      expect(item.diets).toContain('VEGETARIAN');
      expect(item.allergens).not.toContain('NUTS');
    }
  });

  it('sorts by price and by cook time', async () => {
    const byPrice = await searchAll({ query: 'rice', sort: 'PRICE_ASC' });
    const prices = byPrice.map((item) => item.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const byPriceDesc = await searchAll({ query: 'rice', sort: 'PRICE_DESC' });
    expect(byPriceDesc.map((item) => item.priceCents)).toEqual([...prices].sort((a, b) => b - a));

    const byTime = await searchAll({ query: 'rice', sort: 'TIME_ASC' });
    const times = byTime.map((item) => item.cookTimeMin ?? Number.POSITIVE_INFINITY);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('paginates search results with the same cursors as the feed', async () => {
    const input = { query: '', filters: { kind: 'RECIPE' } };
    const page1 = await ok<{ search: Connection }>(SEARCH, { input, first: 25 });
    const page2 = await ok<{ search: Connection }>(SEARCH, {
      input,
      first: 50,
      after: page1.search.pageInfo.endCursor,
    });
    const ids = [...page1.search.edges, ...page2.search.edges].map((edge) => edge.node.id);
    expect(page1.search.totalCount).toBe(60);
    expect(page1.search.pageInfo.hasNextPage).toBe(true);
    expect(page2.search.pageInfo.hasNextPage).toBe(false);
    expect(new Set(ids).size).toBe(60);
  });
});

describe('other queries', () => {
  it('suggests at most 8 names, prefix matches first', async () => {
    const { suggestions } = await ok<{ suggestions: string[] }>(
      `query { suggestions(prefix: "ch") }`,
    );
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(8);
    expect(suggestions[0]?.toLowerCase().startsWith('ch')).toBe(true);

    const empty = await ok<{ suggestions: string[] }>(`query { suggestions(prefix: "  ") }`);
    expect(empty.suggestions).toEqual([]);
  });

  it('returns a recipe with its ingredients as products, and null for an unknown id', async () => {
    const query = `query ($id: ID!) {
      recipe(id: $id) { id name servings steps ingredients { quantity product { id name priceCents } } }
    }`;
    const { recipe } = await ok<{
      recipe: { id: string; ingredients: { quantity: string; product: { id: string } }[] };
    }>(query, { id: 'r1' });
    expect(recipe.id).toBe('r1');
    expect(recipe.ingredients.length).toBeGreaterThan(1);
    for (const ingredient of recipe.ingredients) expect(ingredient.product.id).toMatch(/^p\d+$/);

    expect(await ok(query, { id: 'nope' })).toEqual({ recipe: null });
  });

  it('returns a product, and null for an unknown id', async () => {
    const query = `query ($id: ID!) { product(id: $id) { id name unit category inStock imageUrl description } }`;
    const { product } = await ok<{ product: { id: string; category: string } }>(query, {
      id: 'p1',
    });
    expect(product).toMatchObject({ id: 'p1', category: 'PRODUCE' });
    expect(await ok(query, { id: 'r1' })).toEqual({ product: null });
  });

  it('recommends in-stock products the user does not have yet (stub)', async () => {
    const query = `query ($context: RecContext!) { recommendations(context: $context) { id inStock } }`;
    const first = await ok<{ recommendations: { id: string; inStock: boolean }[] }>(query, {
      context: { limit: 4 },
    });
    expect(first.recommendations).toHaveLength(4);
    const known = first.recommendations.map((product) => product.id);

    const second = await ok<typeof first>(query, {
      context: { limit: 4, cartProductIds: known.slice(0, 2), recentlyViewedIds: known.slice(2) },
    });
    for (const product of second.recommendations) {
      expect(known).not.toContain(product.id);
      expect(product.inStock).toBe(true);
    }
  });
});
