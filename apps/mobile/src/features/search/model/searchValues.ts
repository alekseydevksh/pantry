// The values a search can use, at runtime. Pure TypeScript: no React, no Apollo.
//
// Codegen turns the schema's enums into string unions (`enumsAsTypes`), which have no runtime value,
// so the lists below are written here. `allOf<T>()` makes the compiler check that a list has every
// member of the union: a new `Diet` in the schema fails `tsc` until it is added here.
import type { Allergen, CatalogKind, Diet, SortOrder } from '@pantry/shared';

type Missing<T extends string, List extends readonly T[]> = Exclude<T, List[number]>;

/** `allOf<Diet>()([...])` compiles only when the list has every `Diet`. */
export function allOf<T extends string>() {
  return <const List extends readonly T[]>(
    values: List & ([Missing<T, List>] extends [never] ? unknown : { missing: Missing<T, List> }),
  ): List => values;
}

// Each list is in the schema's order, which is also the canonical order of a filter list (ADR 0010).
export const DIETS = allOf<Diet>()(['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE']);
export const ALLERGENS = allOf<Allergen>()([
  'GLUTEN',
  'DAIRY',
  'EGGS',
  'NUTS',
  'PEANUTS',
  'SOY',
  'FISH',
  'SHELLFISH',
  'SESAME',
]);
export const CATALOG_KINDS = allOf<CatalogKind>()(['PRODUCT', 'RECIPE']);
export const SORT_ORDERS = allOf<SortOrder>()(['RELEVANCE', 'PRICE_ASC', 'PRICE_DESC', 'TIME_ASC']);

/** The server's default order. A canonical input leaves it out. */
export const DEFAULT_SORT = 'RELEVANCE' satisfies SortOrder;

/** Longer text is cut. The field limits typing to the same length (task 3.2). */
export const MAX_QUERY_LENGTH = 100;
/** Cook-time filter: whole minutes, 1 to 24 hours. */
export const MAX_TIME_MIN = 24 * 60;
/** Price filter: whole cents, up to 10 000.00. */
export const MAX_PRICE_CENTS = 1_000_000;

/** A count filter (minutes, cents) is a whole number from 1 to `max`. Anything else means "no filter". */
export function isValidCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;
}
