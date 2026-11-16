// Resolvers for packages/shared/schema.graphql.
// Argument types are written by hand here; the app's operation types come from codegen.
import type { CartLineState, CartStore } from './cart';
import type { Catalog, CatalogItem, ProductItem, RecipeItem } from './catalog';
import { paginate } from './pagination';
import { buildIndex, search, suggest, type SearchInput } from './search';

export interface Context {
  catalog: Catalog;
  cart: CartStore;
}

interface PageArgs {
  first: number;
  after?: string | null;
}

interface RecContext {
  cartProductIds?: string[] | null;
  recentlyViewedIds?: string[] | null;
  limit?: number | null;
}

interface CartMutationArgs {
  productId: string;
  idempotencyKey: string;
}

const CART_ID = 'cart-mock-user';
const DEFAULT_RECOMMENDATIONS = 10;

/** The Cart type has no stored state of its own; its fields read the store. */
const cartRef = {};

export function createResolvers(catalog: Catalog) {
  const index = buildIndex(catalog);
  const resolveKind = (item: CatalogItem) => (item.kind === 'PRODUCT' ? 'Product' : 'Recipe');

  return {
    Query: {
      feed: (_: unknown, { first, after }: PageArgs) => paginate(catalog.items, first, after),

      search: (_: unknown, { input, first, after }: PageArgs & { input: SearchInput }) => {
        const results = search(index, input);
        return { ...paginate(results, first, after), totalCount: results.length };
      },

      suggestions: (_: unknown, { prefix }: { prefix: string }) => suggest(catalog, prefix),

      recipe: (_: unknown, { id }: { id: string }) => catalog.recipesById.get(id) ?? null,

      product: (_: unknown, { id }: { id: string }) => catalog.productsById.get(id) ?? null,

      // Stub until task 7.5: in-stock products the user does not already have, in feed order.
      recommendations: (_: unknown, { context }: { context: RecContext }) => {
        const known = new Set([
          ...(context.cartProductIds ?? []),
          ...(context.recentlyViewedIds ?? []),
        ]);
        const limit = Math.max(0, context.limit ?? DEFAULT_RECOMMENDATIONS);
        return catalog.items
          .filter(
            (item): item is ProductItem =>
              item.kind === 'PRODUCT' && item.inStock && !known.has(item.id),
          )
          .slice(0, limit);
      },

      cart: () => cartRef,
    },

    Mutation: {
      addToCart: (
        _: unknown,
        { productId, qty, idempotencyKey }: CartMutationArgs & { qty: number },
        { cart }: Context,
      ) => {
        cart.add(productId, qty, idempotencyKey);
        return cartRef;
      },

      removeFromCart: (
        _: unknown,
        { productId, idempotencyKey }: CartMutationArgs,
        { cart }: Context,
      ) => {
        cart.remove(productId, idempotencyKey);
        return cartRef;
      },

      setCartQty: (
        _: unknown,
        { productId, qty, idempotencyKey }: CartMutationArgs & { qty: number },
        { cart }: Context,
      ) => {
        cart.setQty(productId, qty, idempotencyKey);
        return cartRef;
      },
    },

    Cart: {
      id: () => CART_ID,
      lines: (_: unknown, __: unknown, { cart }: Context) => cart.getLines(),
      itemCount: (_: unknown, __: unknown, { cart }: Context) =>
        cart.getLines().reduce((sum, line) => sum + line.qty, 0),
      totalCents: (_: unknown, __: unknown, { cart }: Context) =>
        cart.getLines().reduce((sum, line) => sum + line.qty * line.product.priceCents, 0),
    },

    CartLine: {
      id: (line: CartLineState) => line.product.id,
      lineTotalCents: (line: CartLineState) => line.qty * line.product.priceCents,
    },

    Recipe: {
      ingredients: (recipe: RecipeItem) =>
        recipe.ingredients.map((ingredient) => ({
          quantity: ingredient.quantity,
          // The seed test guarantees that every ingredient points to an existing product.
          product: catalog.productsById.get(ingredient.productId),
        })),
    },

    CatalogItem: { __resolveType: resolveKind },
    Node: { __resolveType: resolveKind },
  };
}
