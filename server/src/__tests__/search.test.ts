import type { Catalog, ProductItem } from '../catalog';
import { buildIndex, search, tokenize } from '../search';

describe('tokenize', () => {
  it.each([
    ['żurek', ['żurek']],
    ['Łódzki ŻUREK z jajkiem', ['łódzki', 'żurek', 'z', 'jajkiem']],
    ['pierogi-ruskie, 2 szt.', ['pierogi', 'ruskie', '2', 'szt']],
    ['Борщ и кефир', ['борщ', 'и', 'кефир']],
    ['味噌 スープ 3', ['味噌', 'スープ', '3']],
    ['Tomatoes, lemons & 2 eggs', ['tomato', 'lemon', '2', 'egg']],
    ['  ', []],
  ])('%j → %j', (text, expected) => {
    expect(tokenize(text)).toEqual(expected);
  });

  it('treats composed and decomposed accents as the same word', () => {
    expect(tokenize('café')).toEqual(tokenize('café'));
    expect(tokenize('żurek')).toEqual(['żurek']);
  });
});

describe('search with non-ASCII names', () => {
  const zurek = {
    kind: 'PRODUCT',
    id: 'p-zurek',
    name: 'Żurek w słoiku',
    description: 'Kwaśna zupa',
    category: 'soups',
    diets: [],
    allergens: [],
    priceCents: 500,
  } as unknown as ProductItem;
  const other = { ...zurek, id: 'p-other', name: 'Tomato soup', description: 'Red' } as ProductItem;
  const catalog = {
    items: [zurek, other],
    productsById: new Map(),
  } as unknown as Catalog;
  const index = buildIndex(catalog);

  it.each(['żurek', 'ŻUREK', 'żur', 'słoiku'])('finds it by %j', (query) => {
    expect(search(index, { query }).map((item) => item.id)).toEqual(['p-zurek']);
  });

  it('does not match "zurek" for "żurek" (no accent folding)', () => {
    expect(search(index, { query: 'zurek' })).toEqual([]);
  });
});
