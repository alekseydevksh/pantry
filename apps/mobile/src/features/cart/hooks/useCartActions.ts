import { useApolloClient, useQuery } from '@apollo/client/react';
import { useStore } from 'zustand';

import { CartDocument } from '@pantry/shared';

import { track } from '@/analytics';
import { randomId } from '@/lib/ids';

import { getCartQueueStore } from '../cartQueue';
import { projectCart, qtyOf, type CartIntent } from '../model/cart';
import { enqueue } from '../model/queue';

/**
 * Every cart write. It only puts the intent in the queue; `CartSync` sends the queue, online or
 * not, so both paths behave the same (ADR 0013, Decision 1).
 *
 * The target quantity comes from the server cart this device last saw, so the cart is loaded where
 * a write can start (this hook runs the cart query too). A device with no saved cart and no network
 * has nothing to base `add` on: it counts from an empty cart (the "last write wins" cost of ADR 0013).
 */
export function useCartActions() {
  const client = useApolloClient();
  const store = getCartQueueStore();
  useQuery(CartDocument, { fetchPolicy: 'cache-first', errorPolicy: 'ignore' });

  function apply(intent: CartIntent) {
    const cached = client.readQuery({ query: CartDocument });
    const serverLines = (cached?.cart.lines ?? []).map((line) => ({
      productId: line.product.id,
      qty: line.qty,
    }));
    store
      .getState()
      .update((queue) => enqueue(queue, intent, { serverLines, key: randomId(), now: Date.now() }));
  }

  return {
    add(productId: string, qty = 1) {
      apply({ kind: 'add', productId, qty });
      track('add_to_cart', { productId, qty });
    },
    setQty: (productId: string, qty: number) => apply({ kind: 'set', productId, qty }),
    remove: (productId: string) => apply({ kind: 'remove', productId }),
  };
}

/** How many of `productId` the user has in the cart, with the queued changes. */
export function useCartQuantity(productId: string): number {
  const { data } = useQuery(CartDocument, { fetchPolicy: 'cache-first', errorPolicy: 'ignore' });
  const ops = useStore(getCartQueueStore(), (state) => state.queue.ops);
  const serverLines = (data?.cart.lines ?? []).map((line) => ({
    productId: line.product.id,
    qty: line.qty,
  }));
  return qtyOf(projectCart(serverLines, ops), productId);
}
