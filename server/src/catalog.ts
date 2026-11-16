// The in-memory catalog, loaded once from the committed seed files.
import productsJson from '../data/products.json';
import recipesJson from '../data/recipes.json';
import {
  seedProductsSchema,
  seedRecipesSchema,
  type SeedProduct,
  type SeedRecipe,
} from './seed/schema';

export type ProductItem = SeedProduct & { kind: 'PRODUCT' };
export type RecipeItem = SeedRecipe & { kind: 'RECIPE' };
export type CatalogItem = ProductItem | RecipeItem;

export interface Catalog {
  products: ProductItem[];
  recipes: RecipeItem[];
  productsById: Map<string, ProductItem>;
  recipesById: Map<string, RecipeItem>;
  /** Products and recipes mixed in a fixed order. The feed order, and the base order for search. */
  items: CatalogItem[];
}

/** Products per recipe in the mixed order. */
const PRODUCTS_PER_RECIPE = 3;
/** Stride for a fixed "shuffle" of the products, so the feed is not grouped by category. */
const STRIDE = 37;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function mixItems(products: ProductItem[], recipes: RecipeItem[]): CatalogItem[] {
  // Walking the list with a stride that shares no factor with its length visits every product once.
  let stride = STRIDE;
  while (gcd(stride, products.length) !== 1) stride += 1;
  const shuffled = products.map((_, index) => products[(index * stride) % products.length]!);

  const items: CatalogItem[] = [];
  let recipeIndex = 0;
  shuffled.forEach((product, index) => {
    if (index % PRODUCTS_PER_RECIPE === 0 && recipeIndex < recipes.length) {
      items.push(recipes[recipeIndex++]!);
    }
    items.push(product);
  });
  items.push(...recipes.slice(recipeIndex));
  return items;
}

export function loadCatalog(): Catalog {
  const products = seedProductsSchema
    .parse(productsJson)
    .map((product): ProductItem => ({ ...product, kind: 'PRODUCT' }));
  const recipes = seedRecipesSchema
    .parse(recipesJson)
    .map((recipe): RecipeItem => ({ ...recipe, kind: 'RECIPE' }));
  return {
    products,
    recipes,
    productsById: new Map(products.map((product) => [product.id, product])),
    recipesById: new Map(recipes.map((recipe) => [recipe.id, recipe])),
    items: mixItems(products, recipes),
  };
}
