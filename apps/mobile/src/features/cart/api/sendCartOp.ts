import type { ApolloClient } from '@apollo/client';

import { SetCartQtyDocument } from '@pantry/shared';

import type { CartOp } from '../model/cart';
import type { SendResult } from '../model/queue';
import { classifyCartError } from './classifyCartError';

/**
 * Sends one queued operation as `setCartQty` with its idempotency key. The response is the whole
 * cart; Apollo writes it to the cache before this resolves, so when the replayer then removes the
 * operation from the queue, the server cart already has it and the screen does not flicker.
 */
export async function sendCartOp(client: ApolloClient, op: CartOp): Promise<SendResult> {
  try {
    await client.mutate({
      mutation: SetCartQtyDocument,
      variables: { productId: op.productId, qty: op.qty, idempotencyKey: op.key },
    });
    return { ok: true };
  } catch (error) {
    return classifyCartError(error);
  }
}
