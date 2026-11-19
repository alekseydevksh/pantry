// A fake cart server for MSW tests: the `cart` query and the `setCartQty` mutation with the real
// server's rules (server/src/cart.ts): an absolute quantity, a line capped at 99, a key applied once.
// A test reads what the server holds (`lines()`) and what it received (`requests`), and can make a
// request fail with `failWith`.
import { HttpResponse } from 'msw';

import { CartDocument, SetCartQtyDocument } from '@pantry/shared';

import { makeProduct, type ProductFixture } from '../fixtures';
import { api } from './api';

export type SetCartQtyRequest = { productId: string; qty: number; idempotencyKey: string };

export type FakeCartOptions = {
  /** Products that exist, by id. Default: none; a line is added with `seed` or `set`. */
  products?: ProductFixture[];
  /** Lines the server cart starts with: product id and quantity. */
  lines?: { productId: string; qty: number }[];
  /**
   * Called for each `setCartQty` request, before the server applies it. Return a `Response` (for
   * example `api.graphqlError(...)`) to fail it, or nothing to let it through.
   */
  failWith?: (request: SetCartQtyRequest, callCount: number) => Response | undefined;
  /** Resolves when the server may answer a `setCartQty`. For looking at the screen in between. */
  hold?: (request: SetCartQtyRequest) => Promise<void>;
};

export function createFakeCart({
  products = [],
  lines: initial = [],
  failWith,
  hold,
}: FakeCartOptions = {}) {
  const catalog = new Map(products.map((product) => [product.id, product]));
  const quantities = new Map(initial.map(({ productId, qty }) => [productId, qty]));
  const applied = new Set<string>();
  const requests: SetCartQtyRequest[] = [];
  let setCalls = 0;
  let cartQueries = 0;

  function cart() {
    const lines = [...quantities].map(([productId, qty]) => {
      const product = catalog.get(productId) ?? makeProduct(Number(productId.slice(1)));
      return {
        __typename: 'CartLine' as const,
        id: productId,
        qty,
        product,
      };
    });
    return {
      __typename: 'Cart' as const,
      id: 'cart',
      itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
      totalCents: lines.reduce((sum, line) => sum + line.qty * line.product.priceCents, 0),
      lines,
    };
  }

  const handlers = [
    api.query(CartDocument, () => {
      cartQueries += 1;
      return { cart: cart() };
    }),
    api.mutation(SetCartQtyDocument, async ({ variables }) => {
      setCalls += 1;
      // (`ID` is `string | number` in the generated types; the app sends strings.)
      const request = {
        productId: String(variables.productId),
        qty: variables.qty,
        idempotencyKey: String(variables.idempotencyKey),
      };
      requests.push(request);
      await hold?.(request);
      const failure = failWith?.(request, setCalls);
      if (failure) return failure;
      if (!applied.has(request.idempotencyKey)) {
        applied.add(request.idempotencyKey);
        if (request.qty <= 0) quantities.delete(request.productId);
        else quantities.set(request.productId, Math.min(request.qty, 99));
      }
      // A `Response`, so every path returns the same type (a promise of data-or-response is not one).
      return HttpResponse.json({ data: { setCartQty: cart() } });
    }),
  ];

  return {
    /** Pass to `server.use(...)`. */
    handlers,
    requests,
    /** The cart as the server holds it: product id → quantity. */
    lines: () => Object.fromEntries(quantities),
    /** How many times the `cart` query was answered. */
    cartQueries: () => cartQueries,
  };
}
