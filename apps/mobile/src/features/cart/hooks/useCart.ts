import { useApolloClient, useQuery } from '@apollo/client/react';
import { useStore } from 'zustand';

import { CartDocument, ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { getCartQueueStore } from '../cartQueue';
import { cartTotals, projectCart, type CartLine, type CartTotals } from '../model/cart';

export type CartState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({
      status: 'ready';
      /** What the user sees: the server cart with the queued operations applied (ADR 0013). */
      lines: CartLine[];
      /** Some changes are still waiting for the server (offline, or in flight). */
      pending: number;
      /** The last refresh failed; the cart shown is the one saved. */
      refreshFailed: boolean;
      refresh: () => void;
    } & CartTotals);

/**
 * The cart on screen: the server cart from the Apollo cache, plus the queued operations. A change
 * shows at once because it is in the queue before the request goes out, and it rolls back by itself
 * when the server refuses it, because the operation leaves the queue (ADR 0013).
 */
export function useCart(): CartState {
  const client = useApolloClient();
  const { data, error, refetch } = useQuery(CartDocument, { fetchPolicy: 'cache-and-network' });
  const ops = useStore(getCartQueueStore(), (state) => state.queue.ops);

  const retry = () => void refetch().catch(() => {});
  if (!data) return error ? { status: 'error', retry } : { status: 'loading' };

  const serverLines = data.cart.lines.map((line) => ({
    productId: line.product.id,
    qty: line.qty,
  }));
  const lines = projectCart(serverLines, ops);

  const knownPrices = new Map(
    data.cart.lines.map((line) => [line.product.id, line.product.priceCents]),
  );
  // A product added and not yet on the server is not in the cart response: its price is in the cache
  // from the screen it was added on. Read when the cart renders, which it does on every change.
  const priceOf = (productId: string) =>
    knownPrices.get(productId) ??
    client.readFragment({
      fragment: ProductHeaderFieldsFragmentDoc,
      from: { __typename: 'Product', id: productId },
    })?.priceCents;

  return {
    status: 'ready',
    lines,
    pending: ops.length,
    refreshFailed: error !== undefined,
    refresh: retry,
    ...cartTotals(lines, priceOf),
  };
}
