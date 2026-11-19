import { useApolloClient } from '@apollo/client/react';
import { useEffect, useRef } from 'react';

import { CartDocument, ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { useTranslation } from '@/lib/i18n';
import { useNetworkStatus } from '@/lib/network';
import { reportError } from '@/lib/observability';
import { showToast } from '@/lib/toast';

import { sendCartOp } from '../api/sendCartOp';
import { getCartQueueStore } from '../cartQueue';
import { dismissRejections } from '../model/queue';
import { createReplayer, type Replayer } from '../model/replayer';

/**
 * Sends the cart queue to the server and tells the user what the server refused. It renders
 * nothing and lives in the root layout, so a change made on the product screen is sent whatever
 * screen is open (ADR 0013).
 *
 * - A change reaches the queue first, always; this component sends it, now if the device is online.
 * - Offline, nothing is sent, so the operations stay unsent and can still be merged.
 * - When the network comes back, the backoffs are cleared and the queue is sent at once.
 * - A refused operation leaves the queue, which rolls the screen back; the user gets a toast.
 */
export function CartSync() {
  const client = useApolloClient();
  const { t } = useTranslation();
  const network = useNetworkStatus();
  // `unknown` counts as online: the first reading comes a moment after launch.
  const online = network !== 'offline';
  const store = getCartQueueStore();
  const replayerRef = useRef<Replayer | null>(null);

  useEffect(() => {
    const replayer = createReplayer({
      store,
      send: (op) => sendCartOp(client, op),
      refetchCart: () => {
        // `network-only` writes the answer to the cache, also when no screen shows the cart.
        client
          .query({ query: CartDocument, fetchPolicy: 'network-only' })
          .catch((error: unknown) => reportError(error, { source: 'cart-sync' }));
      },
      onError: (error) => reportError(error, { source: 'cart-sync' }),
    });
    replayerRef.current = replayer;
    return () => {
      replayer.stop();
      replayerRef.current = null;
    };
  }, [client, store]);

  useEffect(() => {
    if (!online) return;
    // On launch this sends what the last session left; after offline it skips the backoffs.
    void replayerRef.current?.replayNow();
    return store.subscribe(() => void replayerRef.current?.replay());
  }, [online, store]);

  useEffect(() => {
    function announceRejections() {
      const { rejected } = store.getState().queue;
      if (rejected.length === 0) return;
      store.getState().update(dismissRejections);
      for (const { op } of rejected) {
        const product = client.readFragment({
          fragment: ProductHeaderFieldsFragmentDoc,
          from: { __typename: 'Product', id: op.productId },
        });
        const name = product?.name ?? t('cart.toast.thisProduct');
        showToast(
          t(op.intent === 'add' ? 'cart.toast.addFailed' : 'cart.toast.updateFailed', { name }),
        );
      }
    }
    announceRejections();
    return store.subscribe(announceRejections);
  }, [client, store, t]);

  return null;
}
