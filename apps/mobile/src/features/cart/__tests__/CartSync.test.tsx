import { waitFor } from '@testing-library/react-native';

import { makeProduct } from '@/test/fixtures';
import { createFakeCart } from '@/test/msw/cartServer';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { getCartQueueStore } from '../cartQueue';
import { enqueue } from '../model/queue';

describe('CartSync', () => {
  it('sends what the last session left in the queue as soon as the app starts', async () => {
    const fake = createFakeCart({ products: [makeProduct(1)] });
    server.use(...fake.handlers);
    // The queue was saved by the previous launch: a change made offline.
    getCartQueueStore()
      .getState()
      .update((queue) =>
        enqueue(
          queue,
          { kind: 'set', productId: 'p1', qty: 4 },
          { serverLines: [], key: 'saved-key', now: Date.now() },
        ),
      );

    await renderWithProviders(<></>);

    await waitFor(() => expect(fake.lines()).toEqual({ p1: 4 }));
    expect(fake.requests).toEqual([{ productId: 'p1', qty: 4, idempotencyKey: 'saved-key' }]);
    await waitFor(() => expect(getCartQueueStore().getState().queue.ops).toEqual([]));
  });
});
