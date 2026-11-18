import {
  activeFilterCount,
  countOptions,
  setSort,
  toggleAllergen,
  toggleDiet,
  toggleMaxPrice,
  toggleMaxTime,
} from '../model/filters';

// `toStrictEqual`: a key that holds `undefined` or an empty list is another cache key (ADR 0010).
describe('toggling a filter', () => {
  it('adds a diet, and removes it with the second tap', () => {
    const vegan = toggleDiet({ query: 'pasta' }, 'VEGAN');
    expect(vegan).toStrictEqual({ query: 'pasta', filters: { diets: ['VEGAN'] } });

    expect(toggleDiet(vegan, 'VEGAN')).toStrictEqual({ query: 'pasta' });
  });

  it('keeps the diets in the order of the schema, whatever the order of the taps', () => {
    const input = toggleDiet(toggleDiet({ query: '' }, 'GLUTEN_FREE'), 'VEGAN');

    expect(input.filters?.diets).toStrictEqual(['VEGAN', 'GLUTEN_FREE']);
  });

  it('toggles allergens independently of diets', () => {
    const input = toggleAllergen(toggleDiet({ query: 'x' }, 'VEGAN'), 'NUTS');
    expect(input.filters).toStrictEqual({ diets: ['VEGAN'], excludeAllergens: ['NUTS'] });

    expect(toggleAllergen(input, 'NUTS').filters).toStrictEqual({ diets: ['VEGAN'] });
  });

  it('replaces the time with another chip, and turns it off with the same chip', () => {
    const fast = toggleMaxTime({ query: 'x' }, 15);
    expect(fast.filters).toStrictEqual({ maxTimeMin: 15 });

    expect(toggleMaxTime(fast, 30).filters).toStrictEqual({ maxTimeMin: 30 });
    expect(toggleMaxTime(fast, 15)).toStrictEqual({ query: 'x' });
  });

  it('does the same for the price', () => {
    const cheap = toggleMaxPrice({ query: 'x' }, 500);
    expect(cheap.filters).toStrictEqual({ maxPriceCents: 500 });
    expect(toggleMaxPrice(cheap, 500)).toStrictEqual({ query: 'x' });
  });

  it('keeps the other filters and the sort when one changes', () => {
    const input = {
      query: 'x',
      filters: { diets: ['VEGAN' as const], maxTimeMin: 30 },
      sort: 'PRICE_ASC' as const,
    };

    expect(toggleMaxPrice(input, 1000)).toStrictEqual({
      ...input,
      filters: { ...input.filters, maxPriceCents: 1000 },
    });
  });
});

describe('setSort', () => {
  it('sets the order, and leaves the default out', () => {
    const cheapest = setSort({ query: 'x' }, 'PRICE_ASC');
    expect(cheapest).toStrictEqual({ query: 'x', sort: 'PRICE_ASC' });

    expect(setSort(cheapest, 'RELEVANCE')).toStrictEqual({ query: 'x' });
  });
});

describe('countOptions', () => {
  it('is the presets when the value is a preset or absent', () => {
    expect(countOptions([15, 30, 60], 30)).toStrictEqual([15, 30, 60]);
    expect(countOptions([15, 30, 60], undefined)).toStrictEqual([15, 30, 60]);
    expect(countOptions([15, 30, 60], null)).toStrictEqual([15, 30, 60]);
  });

  it('adds a value from a link, in its place, so the user can see and clear it', () => {
    expect(countOptions([15, 30, 60], 45)).toStrictEqual([15, 30, 45, 60]);
    expect(countOptions([15, 30, 60], 90)).toStrictEqual([15, 30, 60, 90]);
  });
});

describe('activeFilterCount', () => {
  it('counts every diet and allergen, and the time and price once', () => {
    expect(activeFilterCount({ query: 'x' })).toBe(0);
    expect(activeFilterCount({ query: 'x', sort: 'PRICE_ASC' })).toBe(0);
    expect(
      activeFilterCount({
        query: 'x',
        filters: {
          diets: ['VEGAN', 'GLUTEN_FREE'],
          excludeAllergens: ['NUTS'],
          maxTimeMin: 30,
          maxPriceCents: 500,
        },
      }),
    ).toBe(5);
  });
});
