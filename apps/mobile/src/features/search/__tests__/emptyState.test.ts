import { clearFilters } from '../model/filters';
import { emptyReason } from '../model/emptyState';

describe('emptyReason', () => {
  it.each([
    [{ query: 'xyzzy' }, 'text'],
    [{ query: '', sort: 'PRICE_ASC' as const }, 'text'],
    [{ query: 'pasta', filters: { diets: ['VEGAN' as const] } }, 'filters'],
    [{ query: 'pasta', filters: { kind: 'RECIPE' as const } }, 'filters'],
    // Products have no cook time: this can never match, and the screen says why.
    [{ query: '', filters: { kind: 'PRODUCT' as const, maxTimeMin: 30 } }, 'productsHaveNoTime'],
    // A time limit alone is fine: it finds recipes.
    [{ query: '', filters: { maxTimeMin: 30 } }, 'filters'],
  ])('%j -> %s', (input, expected) => {
    expect(emptyReason(input)).toBe(expected);
  });
});

describe('clearFilters', () => {
  it('turns every filter off, and keeps the text and the sort', () => {
    expect(
      clearFilters({
        query: 'pasta',
        filters: { diets: ['VEGAN'], maxTimeMin: 30 },
        sort: 'PRICE_ASC',
      }),
    ).toStrictEqual({ query: 'pasta', sort: 'PRICE_ASC' });
  });
});
