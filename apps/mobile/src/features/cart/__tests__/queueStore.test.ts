import { createMemoryStorage, createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { enqueue, markSending } from '../model/queue';
import { CART_QUEUE_STORAGE_KEY, createQueueStore, sanitizeQueue } from '../model/queueStore';

const op = (key: string, overrides: Record<string, unknown> = {}) => ({
  productId: 'p1',
  qty: 1,
  key,
  intent: 'add',
  createdAt: 1,
  attempts: 0,
  unknownFailures: 0,
  nextAttemptAt: 1,
  ...overrides,
});

describe('createQueueStore', () => {
  it('starts empty', () => {
    expect(createQueueStore(createMemoryStorage()).getState().queue).toStrictEqual({
      ops: [],
      rejected: [],
    });
  });

  it('keeps the queue, attempts included, in a new store, as after an app restart', () => {
    const storage = createMMKVStorage(STORAGE_IDS.app);
    const store = createQueueStore(storage);
    store
      .getState()
      .update((queue) =>
        markSending(
          enqueue(
            queue,
            { kind: 'add', productId: 'p1', qty: 2 },
            { serverLines: [], key: 'k1', now: 5 },
          ),
          'k1',
        ),
      );

    const restarted = createQueueStore(createMMKVStorage(STORAGE_IDS.app));

    expect(restarted.getState().queue).toStrictEqual(store.getState().queue);
    expect(restarted.getState().queue.ops[0]).toMatchObject({ key: 'k1', qty: 2, attempts: 1 });
  });

  it('starts empty when the stored value is not JSON', () => {
    const storage = createMemoryStorage({ [CART_QUEUE_STORAGE_KEY]: '{broken' });

    expect(createQueueStore(storage).getState().queue.ops).toStrictEqual([]);
  });
});

describe('sanitizeQueue', () => {
  it('keeps valid operations and drops damaged ones on their own', () => {
    const stored = {
      ops: [
        op('k1'),
        op('k2', { qty: -1 }),
        op('k3', { qty: 100 }),
        op('k4', { intent: 'double' }),
        op('', {}),
        op('k5', { attempts: 'one' }),
        { productId: 'p1' },
        null,
        op('k6', { productId: 'p2', qty: 0, intent: 'remove' }),
      ],
      rejected: [
        { op: op('k7'), code: 'NOT_FOUND' },
        { op: null, code: 'x' },
      ],
    };

    const queue = sanitizeQueue(stored);

    expect(queue.ops.map((queued) => queued.key)).toStrictEqual(['k1', 'k6']);
    expect(queue.rejected.map((rejection) => rejection.op.key)).toStrictEqual(['k7']);
  });

  it('keeps the first of two operations with the same key', () => {
    const queue = sanitizeQueue({
      ops: [op('k1', { qty: 1 }), op('k1', { qty: 5 })],
      rejected: [],
    });

    expect(queue.ops.map((queued) => queued.qty)).toStrictEqual([1]);
  });

  it.each([null, 'queue', 42, { ops: 'nope' }])('gives an empty queue for %j', (stored) => {
    expect(sanitizeQueue(stored)).toStrictEqual({ ops: [], rejected: [] });
  });
});
