// Simple text search over the catalog. Pure functions: no I/O, easy to unit-test.
import type { Catalog, CatalogItem } from './catalog';
import type { Allergen, Diet } from './seed/schema';

export type SortOrder = 'RELEVANCE' | 'PRICE_ASC' | 'PRICE_DESC' | 'TIME_ASC';

export interface SearchFilters {
  kind?: 'PRODUCT' | 'RECIPE' | null;
  diets?: Diet[] | null;
  maxTimeMin?: number | null;
  maxPriceCents?: number | null;
  excludeAllergens?: Allergen[] | null;
}

export interface SearchInput {
  query: string;
  filters?: SearchFilters | null;
  sort?: SortOrder | null;
}

const WEIGHT_NAME = 3;
const WEIGHT_INGREDIENT = 2;
const WEIGHT_OTHER = 1;

/**
 * Lowercase words, without a plural "s", so "tomato" finds "Tomatoes" and "lemons" finds "lemon".
 * A word is a run of letters, combining marks and digits in any script ("żurek" stays one word).
 * NFC first, so "é" typed as two code points matches the one-code-point form.
 */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/(es|s)$/, '') : word));
}

interface IndexedItem {
  item: CatalogItem;
  name: string[];
  ingredients: string[];
  other: string[];
}

function words(text: string): string[] {
  return tokenize(text.replaceAll('_', ' '));
}

export function buildIndex(catalog: Catalog): IndexedItem[] {
  return catalog.items.map((item) => ({
    item,
    name: words(item.name),
    ingredients:
      item.kind === 'RECIPE'
        ? item.ingredients.flatMap((ingredient) =>
            words(catalog.productsById.get(ingredient.productId)?.name ?? ''),
          )
        : [],
    other: [
      ...words(item.description),
      ...item.diets.flatMap(words),
      ...(item.kind === 'PRODUCT' ? words(item.category) : ['recipe']),
    ],
  }));
}

function matches(wordList: string[], token: string): boolean {
  return wordList.some((word) => word.startsWith(token));
}

/** 0 when a token matches nowhere: every word of the query must match (AND). */
function score(entry: IndexedItem, tokens: string[]): number {
  let total = 0;
  for (const token of tokens) {
    const tokenScore = matches(entry.name, token)
      ? WEIGHT_NAME
      : matches(entry.ingredients, token)
        ? WEIGHT_INGREDIENT
        : matches(entry.other, token)
          ? WEIGHT_OTHER
          : 0;
    if (tokenScore === 0) return 0;
    total += tokenScore;
  }
  return total;
}

function passesFilters(item: CatalogItem, filters: SearchFilters): boolean {
  if (filters.kind && item.kind !== filters.kind) return false;
  if (filters.diets?.some((diet) => !item.diets.includes(diet))) return false;
  if (filters.excludeAllergens?.some((allergen) => item.allergens.includes(allergen))) return false;
  if (filters.maxPriceCents != null && item.priceCents > filters.maxPriceCents) return false;
  if (filters.maxTimeMin != null) {
    // Products have no cook time, so a time filter means "recipes only".
    if (item.kind !== 'RECIPE' || item.cookTimeMin > filters.maxTimeMin) return false;
  }
  return true;
}

export function search(index: readonly IndexedItem[], input: SearchInput): CatalogItem[] {
  const tokens = tokenize(input.query);
  const filters = input.filters ?? {};

  const hits = index
    .map((entry, position) => ({
      item: entry.item,
      position,
      score: tokens.length === 0 ? 1 : score(entry, tokens),
    }))
    .filter((hit) => hit.score > 0 && passesFilters(hit.item, filters));

  const cookTime = (item: CatalogItem) =>
    item.kind === 'RECIPE' ? item.cookTimeMin : Number.POSITIVE_INFINITY;

  // `position` breaks ties, so the order is total and cursors stay valid between requests.
  hits.sort((a, b) => {
    let diff: number;
    switch (input.sort ?? 'RELEVANCE') {
      case 'PRICE_ASC':
        diff = a.item.priceCents - b.item.priceCents;
        break;
      case 'PRICE_DESC':
        diff = b.item.priceCents - a.item.priceCents;
        break;
      case 'TIME_ASC':
        diff = cookTime(a.item) === cookTime(b.item) ? 0 : cookTime(a.item) - cookTime(b.item);
        break;
      case 'RELEVANCE':
        diff = b.score - a.score;
        break;
    }
    return diff || a.position - b.position;
  });

  return hits.map((hit) => hit.item);
}

const EXTRA_TERMS = [
  'vegan',
  'vegetarian',
  'gluten free',
  'dairy free',
  'quick dinner',
  'breakfast',
];
export const MAX_SUGGESTIONS = 8;

/** Typeahead. Names that start with the prefix come before names that contain a word starting with it. */
export function suggest(catalog: Catalog, prefix: string): string[] {
  const needle = prefix.trim().toLowerCase();
  if (needle.length === 0) return [];

  const startsWith: string[] = [];
  const wordStartsWith: string[] = [];
  const candidates = [...EXTRA_TERMS, ...catalog.items.map((item) => item.name)];
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    if (lower.startsWith(needle)) startsWith.push(candidate);
    else if (lower.split(/\s+/).some((word) => word.startsWith(needle)))
      wordStartsWith.push(candidate);
  }
  return [...new Set([...startsWith, ...wordStartsWith])].slice(0, MAX_SUGGESTIONS);
}
