import type { Diet } from '@pantry/shared';

import {
  allOf,
  ALLERGENS,
  CATALOG_KINDS,
  DIETS,
  isValidCount,
  SORT_ORDERS,
} from '../model/searchValues';

describe('enum value lists', () => {
  it('have no duplicates', () => {
    for (const list of [DIETS, ALLERGENS, CATALOG_KINDS, SORT_ORDERS]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('do not compile when a value of the schema enum is missing', () => {
    // Checked by `tsc` (`pnpm typecheck`), not by Jest: each line below fails to compile if `allOf`
    // stops catching a missing value, because the `@ts-expect-error` would then be unused.
    // @ts-expect-error DAIRY_FREE is missing.
    const incomplete = allOf<Diet>()(['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE']);
    const complete = allOf<Diet>()(['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE']);
    expect(incomplete).toHaveLength(3);
    expect(complete).toHaveLength(4);
  });
});

describe('isValidCount', () => {
  it.each([
    [1, true],
    [10, true],
    [10.5, false],
    [0, false],
    [-1, false],
    [11, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    ['5', false],
    [null, false],
    [undefined, false],
  ])('%p with max 10 is %p', (value, expected) => {
    expect(isValidCount(value, 10)).toBe(expected);
  });
});
