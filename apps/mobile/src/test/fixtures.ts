// Catalog data for tests: the items a test's fake API serves. Numbers make ids and names
// predictable: `makeProduct(3)` is `p3` named "Product 3", `makeRecipe(3)` is `r3` named "Recipe 3".
//
// The types come from the generated fragments of the cards, so a fixture that does not match what
// the app asks for does not compile. Later tasks add the fields the details screens need.
import type { Unmasked } from '@apollo/client/masking';

import type {
  ProductCardFieldsFragment,
  RecipeCardFieldsFragment,
  RecipeQuery,
} from '@pantry/shared';

export type ProductFixture = ProductCardFieldsFragment & { __typename: 'Product' };
export type RecipeFixture = RecipeCardFieldsFragment & { __typename: 'Recipe' };
export type CatalogFixture = ProductFixture | RecipeFixture;
/** What the `recipe(id)` query returns for a recipe that exists, with every field (unmasked). */
export type RecipeDetailsFixture = NonNullable<Unmasked<RecipeQuery>['recipe']>;

export function makeProduct(n: number, overrides: Partial<ProductFixture> = {}): ProductFixture {
  return {
    __typename: 'Product',
    id: `p${n}`,
    name: `Product ${n}`,
    imageUrl: `https://images.test/p${n}.jpg`,
    priceCents: 100 + n,
    unit: '500 g',
    inStock: true,
    ...overrides,
  };
}

export function makeRecipe(n: number, overrides: Partial<RecipeFixture> = {}): RecipeFixture {
  return {
    __typename: 'Recipe',
    id: `r${n}`,
    name: `Recipe ${n}`,
    imageUrl: `https://images.test/r${n}.jpg`,
    cookTimeMin: 20 + n,
    servings: 4,
    ...overrides,
  };
}

/** A mixed catalog like the real feed: every third item is a recipe. `count` items, numbered from 1. */
export function makeCatalog(count: number): CatalogFixture[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return n % 3 === 0 ? makeRecipe(n) : makeProduct(n);
  });
}

/**
 * A recipe as the recipe screen loads it. It has the fields of `makeRecipe(n)`, so the same recipe
 * in the feed and on its screen agrees. Ingredients are products `p101`, `p102`, ...
 */
export function makeRecipeDetails(
  n: number,
  overrides: Partial<RecipeDetailsFixture> = {},
): RecipeDetailsFixture {
  return {
    ...makeRecipe(n),
    description: `Description of recipe ${n}.`,
    diets: ['VEGETARIAN'],
    allergens: ['GLUTEN', 'DAIRY'],
    priceCents: 1544,
    steps: ['Get everything ready.', 'Cook it.'],
    ingredients: [
      { quantity: '200 g', product: makeProduct(101) },
      { quantity: '2 pcs', product: makeProduct(102) },
    ],
    ...overrides,
  };
}
