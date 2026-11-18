import type { SearchInput } from '@pantry/shared';

import {
  canonicalSearchInput,
  parseSearchParams,
  toRouteParams,
  toSearchParams,
  type RawSearchParams,
} from '../model/searchParams';
import { ALLERGENS, CATALOG_KINDS, DIETS, SORT_ORDERS } from '../model/searchValues';

// `toStrictEqual` everywhere: a key that holds `undefined` would still be a different cache key
// shape, so "no key" and "key: undefined" must not pass as equal.

const NO_PARAMS = {
  q: undefined,
  kind: undefined,
  diet: undefined,
  maxTime: undefined,
  maxPriceCents: undefined,
  exclude: undefined,
  sort: undefined,
};

describe('parseSearchParams', () => {
  it('gives the empty search for no params', () => {
    expect(parseSearchParams({})).toStrictEqual({ query: '' });
  });

  it('reads every param', () => {
    expect(
      parseSearchParams({
        q: 'pasta',
        kind: 'recipe',
        diet: 'vegan,gluten-free',
        maxTime: '30',
        maxPriceCents: '1500',
        exclude: 'nuts,peanuts',
        sort: 'price-asc',
      }),
    ).toStrictEqual({
      query: 'pasta',
      filters: {
        kind: 'RECIPE',
        diets: ['VEGAN', 'GLUTEN_FREE'],
        maxTimeMin: 30,
        maxPriceCents: 1500,
        excludeAllergens: ['NUTS', 'PEANUTS'],
      },
      sort: 'PRICE_ASC',
    });
  });

  it('reads the deep link from task 3.4', () => {
    expect(parseSearchParams({ q: 'pasta', diet: 'vegan' })).toStrictEqual({
      query: 'pasta',
      filters: { diets: ['VEGAN'] },
    });
  });

  // Each row: params -> the input they give. A bad value falls back to its default on its own.
  const q = 'pasta';
  it.each<[string, RawSearchParams, SearchInput]>([
    // Lists
    ['an unknown diet', { q, diet: 'banana' }, { query: q }],
    [
      'an unknown diet next to a known one',
      { q, diet: 'vegan,banana' },
      { query: q, filters: { diets: ['VEGAN'] } },
    ],
    ['an upper-case diet', { q, diet: 'VEGAN' }, { query: q, filters: { diets: ['VEGAN'] } }],
    [
      'a diet with `_`',
      { q, diet: 'gluten_free' },
      { query: q, filters: { diets: ['GLUTEN_FREE'] } },
    ],
    [
      'a diet given twice in another case',
      { q, diet: 'Vegan,vegan' },
      { query: q, filters: { diets: ['VEGAN'] } },
    ],
    [
      'spaces around list items',
      { q, diet: ' vegan , dairy-free ' },
      { query: q, filters: { diets: ['VEGAN', 'DAIRY_FREE'] } },
    ],
    ['an empty diet list', { q, diet: '' }, { query: q }],
    ['a diet list of commas', { q, diet: ',,' }, { query: q }],
    [
      'repeated diet keys',
      { q, diet: ['vegan', 'gluten-free'] },
      { query: q, filters: { diets: ['VEGAN', 'GLUTEN_FREE'] } },
    ],
    [
      'repeated keys holding comma lists',
      { q, diet: ['vegan,dairy-free', 'vegetarian'] },
      { query: q, filters: { diets: ['VEGETARIAN', 'VEGAN', 'DAIRY_FREE'] } },
    ],
    [
      'an unknown allergen next to a known one',
      { q, exclude: 'nuts,peanut' },
      { query: q, filters: { excludeAllergens: ['NUTS'] } },
    ],
    // Counts
    ['a time that is not a number', { q, maxTime: 'abc' }, { query: q }],
    ['a negative time', { q, maxTime: '-5' }, { query: q }],
    ['a zero time', { q, maxTime: '0' }, { query: q }],
    ['a fractional time', { q, maxTime: '30.5' }, { query: q }],
    ['a time in exponent notation', { q, maxTime: '1e3' }, { query: q }],
    ['a hex time', { q, maxTime: '0x1E' }, { query: q }],
    ['a time over 24 hours', { q, maxTime: '99999' }, { query: q }],
    ['an empty time', { q, maxTime: '' }, { query: q }],
    ['a time with spaces', { q, maxTime: ' 30 ' }, { query: q, filters: { maxTimeMin: 30 } }],
    [
      'a time with a leading zero',
      { q, maxTime: '030' },
      { query: q, filters: { maxTimeMin: 30 } },
    ],
    [
      'a time of 24 hours exactly',
      { q, maxTime: '1440' },
      { query: q, filters: { maxTimeMin: 1440 } },
    ],
    ['a time given twice', { q, maxTime: ['20', '40'] }, { query: q, filters: { maxTimeMin: 20 } }],
    ['a price that is not a number', { q, maxPriceCents: '12,50' }, { query: q }],
    ['a price over the limit', { q, maxPriceCents: '1000001' }, { query: q }],
    [
      'a price at the limit',
      { q, maxPriceCents: '1000000' },
      { query: q, filters: { maxPriceCents: 1_000_000 } },
    ],
    // Single values
    ['an unknown kind', { q, kind: 'both' }, { query: q }],
    ['an upper-case kind', { q, kind: 'PRODUCT' }, { query: q, filters: { kind: 'PRODUCT' } }],
    [
      'a contradiction (products with a cook time) is kept as asked',
      { q, kind: 'product', maxTime: '30' },
      { query: q, filters: { kind: 'PRODUCT', maxTimeMin: 30 } },
    ],
    ['an unknown sort', { q, sort: 'cheap' }, { query: q }],
    ['the default sort', { q, sort: 'relevance' }, { query: q }],
    ['a sort in schema spelling', { q, sort: 'PRICE_DESC' }, { query: q, sort: 'PRICE_DESC' }],
    ['a sort with `_`', { q, sort: 'time_asc' }, { query: q, sort: 'TIME_ASC' }],
    [
      'a sort given as a list',
      { q, sort: ['price-asc', 'price-desc'] },
      { query: q, sort: 'PRICE_ASC' },
    ],
    // Text
    ['text given twice', { q: ['soup', 'salad'] }, { query: 'soup' }],
    ['text of spaces only', { q: '   ' }, { query: '' }],
    ['text with runs of whitespace', { q: '  tomato \t  soup\n' }, { query: 'tomato soup' }],
    ['text with a no-break space', { q: 'tomato soup' }, { query: 'tomato soup' }],
    ['text in NFD', { q: 'café' }, { query: 'café' }],
    ['an empty array', { q: [] }, { query: '' }],
    // Other keys
    ['an unknown key', { q, utm_source: 'mail' }, { query: q }],
    ['a key named like a prototype field', { q, constructor: 'x', toString: 'y' }, { query: q }],
    [
      'bad values in every param at once',
      { q: '  ', kind: 'x', diet: 'x', maxTime: 'x', maxPriceCents: 'x', exclude: 'x', sort: 'x' },
      { query: '' },
    ],
  ])('handles %s', (_name, raw, expected) => {
    expect(parseSearchParams(raw)).toStrictEqual(expected);
  });

  it('keeps the case of the text, so "Pasta" and "pasta" are two searches (ADR 0010)', () => {
    expect(parseSearchParams({ q: 'Pasta' })).toStrictEqual({ query: 'Pasta' });
  });

  it('cuts long text to 100 characters', () => {
    expect(parseSearchParams({ q: 'a'.repeat(300) }).query).toBe('a'.repeat(100));
  });

  it('never cuts an emoji in half, and drops a space left at the end by the cut', () => {
    const query = parseSearchParams({ q: `${'a'.repeat(98)} 🍅🍅` }).query;
    expect(query).toBe(`${'a'.repeat(98)} 🍅`);
    expect(parseSearchParams({ q: `${'a'.repeat(99)} b` }).query).toBe('a'.repeat(99));
  });

  it('gives the empty search when the params are not an object at all', () => {
    expect(parseSearchParams(null as unknown as RawSearchParams)).toStrictEqual({ query: '' });
  });
});

describe('toSearchParams', () => {
  it('leaves every param out for the empty search, but keeps every key', () => {
    expect(toSearchParams({ query: '' })).toStrictEqual(NO_PARAMS);
  });

  it('writes the canonical form: lowercase, `-`, comma lists in schema order, defaults left out', () => {
    expect(
      toSearchParams({
        query: '  pasta  bake ',
        filters: {
          kind: null,
          diets: ['GLUTEN_FREE', 'VEGAN', 'VEGAN'],
          maxTimeMin: 45,
          maxPriceCents: null,
          excludeAllergens: ['SESAME', 'NUTS'],
        },
        sort: 'RELEVANCE',
      }),
    ).toStrictEqual({
      ...NO_PARAMS,
      q: 'pasta bake',
      diet: 'vegan,gluten-free',
      maxTime: '45',
      exclude: 'nuts,sesame',
    });
  });

  it('writes the kind and a non-default sort', () => {
    expect(
      toSearchParams({
        query: '',
        filters: { kind: 'PRODUCT', maxPriceCents: 999 },
        sort: 'PRICE_DESC',
      }),
    ).toStrictEqual({ ...NO_PARAMS, kind: 'product', maxPriceCents: '999', sort: 'price-desc' });
  });
});

describe('canonicalSearchInput', () => {
  it.each<[string, SearchInput]>([
    ['no filters', { query: 'pasta' }],
    ['null filters', { query: 'pasta', filters: null }],
    ['empty filters', { query: 'pasta', filters: {} }],
    [
      'filters of nulls and empty lists',
      {
        query: 'pasta',
        filters: {
          kind: null,
          diets: [],
          maxTimeMin: null,
          maxPriceCents: null,
          excludeAllergens: [],
        },
      },
    ],
    ['the default sort', { query: 'pasta', sort: 'RELEVANCE' }],
    ['a null sort', { query: 'pasta', sort: null }],
    ['undefined values', { query: 'pasta', filters: { diets: undefined }, sort: undefined }],
    ['spaces around the text', { query: '  pasta ' }],
  ])('gives the same input for %s', (_name, input) => {
    expect(canonicalSearchInput(input)).toStrictEqual({ query: 'pasta' });
  });

  it('gives the same lists whatever their order and duplicates', () => {
    const a = canonicalSearchInput({
      query: '',
      filters: { diets: ['VEGAN', 'VEGETARIAN'], excludeAllergens: ['SOY', 'EGGS'] },
    });
    const b = canonicalSearchInput({
      query: '',
      filters: { diets: ['VEGETARIAN', 'VEGAN', 'VEGETARIAN'], excludeAllergens: ['EGGS', 'SOY'] },
    });
    expect(a).toStrictEqual(b);
    expect(a.filters).toStrictEqual({
      diets: ['VEGETARIAN', 'VEGAN'],
      excludeAllergens: ['EGGS', 'SOY'],
    });
  });

  // Phase 4 builds inputs from model output, which is typed but not always sensible.
  it.each<[string, SearchInput]>([
    ['a zero time', { query: '', filters: { maxTimeMin: 0 } }],
    ['a fractional time', { query: '', filters: { maxTimeMin: 12.5 } }],
    ['a negative price', { query: '', filters: { maxPriceCents: -100 } }],
    ['a price over the limit', { query: '', filters: { maxPriceCents: 2_000_000 } }],
    ['NaN', { query: '', filters: { maxTimeMin: Number.NaN } }],
    [
      'values that are not in the schema',
      {
        query: '',
        filters: { kind: 'MEAL', diets: ['KETO'], excludeAllergens: ['CELERY'] },
        sort: 'POPULAR',
      } as unknown as SearchInput,
    ],
  ])('drops %s', (_name, input) => {
    expect(canonicalSearchInput(input)).toStrictEqual({ query: '' });
  });

  it('does not change its argument', () => {
    const input: SearchInput = {
      query: ' pasta ',
      filters: { diets: ['VEGAN', 'VEGETARIAN'] },
      sort: 'RELEVANCE',
    };
    const copy = structuredClone(input);
    canonicalSearchInput(input);
    expect(input).toStrictEqual(copy);
  });
});

// ---------------------------------------------------------------------------------------------
// Round trips
// ---------------------------------------------------------------------------------------------

/** Canonical inputs that cover every enum value, every field, and fields combined. */
const canonicalInputs: SearchInput[] = [
  { query: '' },
  { query: 'pasta' },
  { query: 'Tomato soup, spicy & quick' },
  { query: 'żurek z jajkiem' },
  { query: 'naïve café 🍅' },
  { query: 'a,b=c&d?e#f/g%20' },
  ...CATALOG_KINDS.map((kind): SearchInput => ({ query: '', filters: { kind } })),
  ...DIETS.map((diet): SearchInput => ({ query: '', filters: { diets: [diet] } })),
  ...ALLERGENS.map((allergen): SearchInput => ({
    query: '',
    filters: { excludeAllergens: [allergen] },
  })),
  ...SORT_ORDERS.filter((sort) => sort !== 'RELEVANCE').map((sort): SearchInput => ({
    query: 'x',
    sort,
  })),
  { query: '', filters: { diets: [...DIETS] } },
  { query: '', filters: { excludeAllergens: [...ALLERGENS] } },
  { query: '', filters: { maxTimeMin: 1 } },
  { query: '', filters: { maxTimeMin: 1440 } },
  { query: '', filters: { maxPriceCents: 1 } },
  { query: '', filters: { maxPriceCents: 1_000_000 } },
  {
    query: 'vegetarian dinner',
    filters: {
      kind: 'RECIPE',
      diets: ['VEGETARIAN', 'GLUTEN_FREE'],
      maxTimeMin: 30,
      maxPriceCents: 2500,
      excludeAllergens: ['NUTS', 'PEANUTS', 'SESAME'],
    },
    sort: 'TIME_ASC',
  },
];

describe('round trip', () => {
  it('has only canonical inputs in its table', () => {
    for (const input of canonicalInputs) expect(canonicalSearchInput(input)).toStrictEqual(input);
  });

  it.each(canonicalInputs.map((input) => [JSON.stringify(input), input] as const))(
    'input -> params -> input is lossless: %s',
    (_name, input) => {
      expect(parseSearchParams(toSearchParams(input))).toStrictEqual(input);
    },
  );

  // Messy params settle into one URL after one pass.
  it.each<RawSearchParams>([
    { q: '  Pasta  ', diet: 'Vegan,vegan,banana', maxTime: '030', sort: 'RELEVANCE' },
    { kind: 'RECIPE', exclude: ['sesame', 'nuts,NUTS'], maxPriceCents: ' 200 ' },
    { q: ['a', 'b'], sort: 'nope', maxTime: '-1' },
  ])('params -> input -> params is stable after one pass: %j', (raw) => {
    const once = toSearchParams(parseSearchParams(raw));
    expect(toSearchParams(parseSearchParams(once))).toStrictEqual(once);
  });

  it('gives the canonical input back for any input, also a messy one', () => {
    const messy: SearchInput = {
      query: ' pasta  bake ',
      filters: { diets: ['VEGAN', 'VEGAN'], maxTimeMin: 0, kind: null },
      sort: 'RELEVANCE',
    };
    expect(parseSearchParams(toSearchParams(messy))).toStrictEqual(canonicalSearchInput(messy));
  });
});

describe('toRouteParams', () => {
  it('has only the params that are set: no key holds undefined', () => {
    expect(
      toRouteParams({
        query: 'pasta',
        filters: { diets: ['VEGAN'], maxTimeMin: 30 },
        sort: 'PRICE_ASC',
      }),
    ).toEqual({ q: 'pasta', diet: 'vegan', maxTime: '30', sort: 'price-asc' });
  });

  it('is empty for the empty search', () => {
    expect(toRouteParams({ query: '' })).toEqual({});
    expect(Object.keys(toRouteParams({ query: '  ', filters: {}, sort: 'RELEVANCE' }))).toEqual([]);
  });
});
