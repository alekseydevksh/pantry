// Route params of the search screen <-> the `SearchInput` of the `search` query (ADR 0010).
// Pure TypeScript: no React, no Apollo.
//
// Apollo keeps one cached result list per `input` (ADR 0007), so the same search must always give
// the same input: `{ filters: null }`, `{ filters: {} }` and no `filters` would be three lists. Every
// input therefore goes through `canonicalSearchInput`, which has exactly one shape per meaning:
// - `query`: NFC, trimmed, runs of whitespace collapsed to one space, at most MAX_QUERY_LENGTH code
//   points. Case is kept (the field shows the user's text), so "Pasta" and "pasta" are two lists.
// - A value at its default is left out: no `filters` without a filter, no `null` or empty list in
//   `filters`, no `sort` when it is RELEVANCE. No key ever holds `undefined`.
// - Lists have no duplicates and follow the schema's order.
//
// URL params are read leniently (any case, `_` or `-`, comma lists or repeated keys) and written in
// one form (lowercase, `-`, comma lists). A bad value falls back to its default on its own: one bad
// param never resets the others.
import { z } from 'zod';

import type { SearchFilters, SearchInput, SortOrder } from '@pantry/shared';

import {
  ALLERGENS,
  CATALOG_KINDS,
  DEFAULT_SORT,
  DIETS,
  isValidCount,
  MAX_PRICE_CENTS,
  MAX_QUERY_LENGTH,
  MAX_TIME_MIN,
  SORT_ORDERS,
} from './searchValues';

/** What `useLocalSearchParams()` returns: a repeated key (`diet=a&diet=b`) gives an array. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** `GLUTEN_FREE` -> `gluten-free`. */
type UrlValue<T extends string> = T extends `${infer Head}_${infer Tail}`
  ? `${Lowercase<Head>}-${UrlValue<Tail>}`
  : Lowercase<T>;

/**
 * The canonical URL form of a search. Every key is present, and `undefined` means "default", so
 * `router.setParams(toSearchParams(input))` also clears the params that are no longer set.
 */
export type SearchUrlParams = {
  /** The text. */
  q: string | undefined;
  /** `product` or `recipe`. Absent means both. */
  kind: UrlValue<NonNullable<SearchFilters['kind']>> | undefined;
  /** Comma list of diets the item must have all of: `vegan,gluten-free`. */
  diet: string | undefined;
  /** Whole minutes. */
  maxTime: string | undefined;
  /** Whole cents, as everywhere else in the app (PLAN decisions, Phase 0). */
  maxPriceCents: string | undefined;
  /** Comma list of allergens the item must not contain: `nuts,peanuts`. */
  exclude: string | undefined;
  /** Absent means relevance. */
  sort: UrlValue<Exclude<SortOrder, typeof DEFAULT_SORT>> | undefined;
};

/** The search with no text, no filters and the default order. */
export const EMPTY_SEARCH_INPUT: SearchInput = Object.freeze({ query: '' });

// ---------------------------------------------------------------------------------------------
// The canonical input
// ---------------------------------------------------------------------------------------------

/** The one function that builds a `SearchInput` for the `search` query. Idempotent. */
export function canonicalSearchInput(input: SearchInput): SearchInput {
  const result: SearchInput = { query: normalizeQuery(input.query) };
  const filters = canonicalFilters(input.filters);
  if (filters) result.filters = filters;
  if (input.sort && input.sort !== DEFAULT_SORT && includes(SORT_ORDERS, input.sort)) {
    result.sort = input.sort;
  }
  return result;
}

/**
 * The same rules as the URL parser, so `parseSearchParams(toSearchParams(x))` equals
 * `canonicalSearchInput(x)` for any `x`, also one that comes from model output (Phase 4).
 */
function canonicalFilters(filters: SearchFilters | null | undefined): SearchFilters | undefined {
  if (!filters) return undefined;
  const result: SearchFilters = {};
  if (filters.kind && includes(CATALOG_KINDS, filters.kind)) result.kind = filters.kind;
  const diets = inOrder(DIETS, filters.diets ?? []);
  if (diets.length > 0) result.diets = diets;
  if (isValidCount(filters.maxTimeMin, MAX_TIME_MIN)) result.maxTimeMin = filters.maxTimeMin;
  if (isValidCount(filters.maxPriceCents, MAX_PRICE_CENTS)) {
    result.maxPriceCents = filters.maxPriceCents;
  }
  const allergens = inOrder(ALLERGENS, filters.excludeAllergens ?? []);
  if (allergens.length > 0) result.excludeAllergens = allergens;
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeQuery(query: string): string {
  const text = query.normalize('NFC').replace(/\s+/g, ' ').trim();
  // Cut by code points, not UTF-16 units, so an emoji is never split in half.
  return Array.from(text).slice(0, MAX_QUERY_LENGTH).join('').trimEnd();
}

/** The members of `all` that are in `values`, in the order of `all`: deduped, sorted, unknown dropped. */
function inOrder<T extends string>(all: readonly T[], values: readonly string[]): T[] {
  return all.filter((value) => values.includes(value));
}

function includes<T extends string>(all: readonly T[], value: string): value is T {
  return (all as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------------------------
// URL params -> input
// ---------------------------------------------------------------------------------------------

function toUrlValue<T extends string>(value: T): UrlValue<T> {
  // The runtime equivalent of the `UrlValue` type; TypeScript cannot follow string methods.
  return value.toLowerCase().replaceAll('_', '-') as UrlValue<T>;
}

/** `Gluten-Free`, `gluten_free`, ` GLUTEN-FREE ` -> `GLUTEN_FREE`. */
function fromUrlValue(value: string): string {
  return value.trim().toUpperCase().replaceAll('-', '_');
}

/** A single-value param given twice (`q=a&q=b`) keeps the first value. */
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/** Every item of a list param: comma-separated, repeated keys, or both. */
const listItems = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(','));

function enumParam<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .preprocess(first, z.string().transform(fromUrlValue).pipe(z.enum(values)))
    .optional()
    .catch(undefined);
}

function enumListParam<T extends string>(values: readonly T[]) {
  return z.preprocess(listItems, z.array(z.string())).transform((items) =>
    inOrder(
      values,
      items.map((item) => fromUrlValue(item)),
    ),
  );
}

function countParam(max: number) {
  return z
    .preprocess(
      first,
      z
        .string()
        .trim()
        // Digits only: `1e3`, `30.5`, `-5` and `0x1E` are not whole numbers a user typed.
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().min(1).max(max)),
    )
    .optional()
    .catch(undefined);
}

const searchParamsSchema = z.object({
  q: z.preprocess(first, z.string()).catch(''),
  kind: enumParam(CATALOG_KINDS),
  diet: enumListParam(DIETS),
  maxTime: countParam(MAX_TIME_MIN),
  maxPriceCents: countParam(MAX_PRICE_CENTS),
  exclude: enumListParam(ALLERGENS),
  sort: enumParam(SORT_ORDERS),
});

/** Route params -> canonical input. Never throws: what cannot be read is left at its default. */
export function parseSearchParams(raw: RawSearchParams): SearchInput {
  const parsed = searchParamsSchema.safeParse(raw);
  if (!parsed.success) return EMPTY_SEARCH_INPUT;
  const { q, kind, diet, maxTime, maxPriceCents, exclude, sort } = parsed.data;
  return canonicalSearchInput({
    query: q,
    filters: { kind, diets: diet, maxTimeMin: maxTime, maxPriceCents, excludeAllergens: exclude },
    sort,
  });
}

// ---------------------------------------------------------------------------------------------
// Input -> URL params
// ---------------------------------------------------------------------------------------------

/** Input -> canonical URL params, with the defaults left out. */
export function toSearchParams(input: SearchInput): SearchUrlParams {
  const { query, filters, sort } = canonicalSearchInput(input);
  const list = (values: readonly string[] | null | undefined) =>
    values ? values.map(toUrlValue).join(',') : undefined;
  const count = (value: number | null | undefined) => (value == null ? undefined : String(value));
  const nonDefaultSort = sort && sort !== DEFAULT_SORT ? sort : undefined;

  return {
    q: query || undefined,
    kind: filters?.kind ? toUrlValue(filters.kind) : undefined,
    diet: list(filters?.diets),
    maxTime: count(filters?.maxTimeMin),
    maxPriceCents: count(filters?.maxPriceCents),
    exclude: list(filters?.excludeAllergens),
    sort: nonDefaultSort ? toUrlValue(nonDefaultSort) : undefined,
  };
}

/**
 * The params to put in the route: `toSearchParams` without the keys that are at their default.
 *
 * Expo Router's `router.setParams` merges, and leaves `{ diet: undefined }` in the route's params
 * (it is hidden from `useLocalSearchParams`, but it is written into the URL as `diet=undefined` on
 * the web and in a saved navigation state). Use this with `navigation.replaceParams`, which
 * replaces the params, so a removed filter is really gone.
 */
export function toRouteParams(input: SearchInput): Partial<Record<keyof SearchUrlParams, string>> {
  return Object.fromEntries(
    Object.entries(toSearchParams(input)).filter(([, value]) => value !== undefined),
  );
}
