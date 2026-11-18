import { BACKOFF_MAX_MS, BACKOFF_MIN_MS, backoffDelay } from '../model/backoff';
import type { CartIntent, CartLine } from '../model/cart';
import {
  dismissRejections,
  EMPTY_QUEUE,
  enqueue,
  GAVE_UP,
  markSending,
  MAX_UNKNOWN_FAILURES,
  nextStep,
  retryNow,
  settle,
  type QueueState,
} from '../model/queue';

const NOW = 1_000_000;
const add = (productId: string, qty = 1): CartIntent => ({ kind: 'add', productId, qty });
const set = (productId: string, qty: number): CartIntent => ({ kind: 'set', productId, qty });
const remove = (productId: string): CartIntent => ({ kind: 'remove', productId });

/** Enqueues the intents in order with keys k1, k2, ... (or `prefix`1, ...). */
function queueOf(
  intents: CartIntent[],
  serverLines: CartLine[] = [],
  start = EMPTY_QUEUE,
  prefix = 'k',
) {
  return intents.reduce<QueueState>(
    (queue, intent, index) =>
      enqueue(queue, intent, { serverLines, key: `${prefix}${index + 1}`, now: NOW + index }),
    start,
  );
}

/** The queue as `productId=qty (key, intent)`, for short assertions. */
const summary = (queue: QueueState) =>
  queue.ops.map((op) => `${op.productId}=${op.qty} (${op.key}, ${op.intent})`);

/** Marks the first operation as sent. */
const sendFirst = (queue: QueueState) => markSending(queue, queue.ops[0]?.key ?? '');

describe('enqueue: intents become absolute quantities', () => {
  it('turns an add into the quantity the user will see', () => {
    expect(summary(queueOf([add('p1', 2)], [{ productId: 'p1', qty: 3 }]))).toStrictEqual([
      'p1=5 (k1, add)',
    ]);
  });

  it('starts an operation with no attempts, due now', () => {
    expect(queueOf([add('p1')]).ops[0]).toStrictEqual({
      productId: 'p1',
      qty: 1,
      key: 'k1',
      intent: 'add',
      createdAt: NOW,
      attempts: 0,
      unknownFailures: 0,
      nextAttemptAt: NOW,
    });
  });

  it('throws for an invalid intent', () => {
    expect(() => queueOf([add('p1', 0)])).toThrow(RangeError);
  });
});

describe('enqueue: coalescing of operations that were not sent', () => {
  const server = (qty: number): CartLine[] => (qty ? [{ productId: 'p1', qty }] : []);

  it.each<[string, CartIntent[], number, string[]]>([
    ['add + add → one set to the sum', [add('p1'), add('p1', 2)], 0, ['p1=3 (k2, add)']],
    ['add + remove on an empty cart → nothing (cancels out)', [add('p1'), remove('p1')], 0, []],
    [
      'add + remove when the server has the line → remove',
      [add('p1'), remove('p1')],
      2,
      ['p1=0 (k2, remove)'],
    ],
    ['add + set → the set', [add('p1'), set('p1', 7)], 0, ['p1=7 (k2, set)']],
    ['set + add → the set plus the add', [set('p1', 4), add('p1')], 0, ['p1=5 (k2, add)']],
    ['remove + add → a set to the add', [remove('p1'), add('p1')], 2, ['p1=1 (k2, add)']],
    ['a set to what the server has → nothing', [set('p1', 2)], 2, []],
    ['add + set back to the server quantity → nothing', [add('p1'), set('p1', 2)], 2, []],
  ])('%s', (_case, intents, serverQty, expected) => {
    expect(summary(queueOf(intents, server(serverQty)))).toStrictEqual(expected);
  });

  it('does not merge operations of different products', () => {
    expect(summary(queueOf([add('p1'), add('p2'), add('p1')]))).toStrictEqual([
      'p2=1 (k2, add)',
      'p1=2 (k3, add)',
    ]);
  });

  it('never merges into, re-keys or drops an operation that was sent', () => {
    const sent = sendFirst(queueOf([add('p1')]));

    const next = queueOf([add('p1')], [], sent, 'n');

    expect(summary(next)).toStrictEqual(['p1=1 (k1, add)', 'p1=2 (n1, add)']);
    expect(next.ops[0]).toMatchObject({ key: 'k1', qty: 1, attempts: 1 });
  });

  it('keeps a sent operation when the user undoes it, and adds the undo after it', () => {
    const sent = sendFirst(queueOf([add('p1')]));

    expect(summary(queueOf([remove('p1')], [], sent, 'n'))).toStrictEqual([
      'p1=1 (k1, add)',
      'p1=0 (n1, remove)',
    ]);
  });

  it('drops a new operation that the sent one already covers', () => {
    const sent = sendFirst(queueOf([add('p1')]));

    expect(summary(queueOf([set('p1', 1)], [], sent, 'n'))).toStrictEqual(['p1=1 (k1, add)']);
  });
});

describe('nextStep', () => {
  it('is idle for an empty queue', () => {
    expect(nextStep(EMPTY_QUEUE, NOW)).toStrictEqual({ type: 'idle' });
  });

  it('sends the first operation when it is due, and waits for its backoff otherwise', () => {
    const queue = queueOf([add('p1'), add('p2')]);
    expect(nextStep(queue, NOW)).toMatchObject({ type: 'send', op: { key: 'k1' } });

    const later = { ...queue, ops: queue.ops.map((op) => ({ ...op, nextAttemptAt: NOW + 500 })) };
    expect(nextStep(later, NOW)).toStrictEqual({ type: 'wait', until: NOW + 500 });
  });
});

describe('settle', () => {
  const options = { now: NOW, random: () => 1 };
  const sentQueue = () => sendFirst(queueOf([add('p1'), add('p2')]));

  it('removes the operation on success', () => {
    const { state, refetch } = settle(sentQueue(), 'k1', { ok: true }, options);

    expect(summary(state)).toStrictEqual(['p2=1 (k2, add)']);
    expect(refetch).toBe(false);
  });

  it('keeps the operation, frozen, with a backoff after a network failure', () => {
    const { state } = settle(sentQueue(), 'k1', { ok: false, retry: 'network' }, options);

    expect(state.ops[0]).toMatchObject({ key: 'k1', attempts: 1, nextAttemptAt: NOW + 1000 });
  });

  it('removes a refused operation, records it, and asks for a refetch', () => {
    const { state, refetch } = settle(
      sentQueue(),
      'k1',
      { ok: false, retry: 'never', code: 'NOT_FOUND' },
      options,
    );

    expect(summary(state)).toStrictEqual(['p2=1 (k2, add)']);
    expect(state.rejected).toStrictEqual([
      {
        op: { productId: 'p1', qty: 1, key: 'k1', intent: 'add', createdAt: NOW },
        code: 'NOT_FOUND',
      },
    ]);
    expect(refetch).toBe(true);
  });

  it('gives up after repeated unknown failures, and asks for a refetch', () => {
    let state = sentQueue();
    for (let failure = 1; failure < MAX_UNKNOWN_FAILURES; failure++) {
      const settled = settle(state, 'k1', { ok: false, retry: 'unknown' }, options);
      expect(settled.refetch).toBe(false);
      state = markSending(settled.state, 'k1');
    }

    const last = settle(state, 'k1', { ok: false, retry: 'unknown' }, options);

    expect(last.state.rejected.map((rejection) => rejection.code)).toStrictEqual([GAVE_UP]);
    expect(last.refetch).toBe(true);
  });

  it('never gives up on network failures', () => {
    let state = sentQueue();
    for (let failure = 0; failure < 50; failure++) {
      state = markSending(
        settle(state, 'k1', { ok: false, retry: 'network' }, options).state,
        'k1',
      );
    }

    expect(state.ops[0]).toMatchObject({ key: 'k1', attempts: 51 });
    expect(state.rejected).toStrictEqual([]);
  });

  it('ignores a result for an operation that is no longer queued', () => {
    const queue = sentQueue();

    expect(settle(queue, 'nope', { ok: true }, options)).toStrictEqual({
      state: queue,
      refetch: false,
    });
  });
});

describe('retryNow and dismissRejections', () => {
  it('makes every operation due now', () => {
    const queue = settle(
      sendFirst(queueOf([add('p1')])),
      'k1',
      { ok: false, retry: 'network' },
      {
        now: NOW,
        random: () => 1,
      },
    ).state;

    expect(nextStep(retryNow(queue, NOW), NOW)).toMatchObject({ type: 'send' });
  });

  it('clears the rejections', () => {
    const rejected = settle(
      sendFirst(queueOf([add('p1')])),
      'k1',
      { ok: false, retry: 'never', code: 'NOT_FOUND' },
      { now: NOW, random: () => 1 },
    ).state;

    expect(dismissRejections(rejected).rejected).toStrictEqual([]);
  });
});

describe('backoffDelay', () => {
  it('doubles from 1 s up to the cap (random = 1)', () => {
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8, 20].map((attempt) => backoffDelay(attempt, () => 1)),
    ).toStrictEqual([
      1000,
      2000,
      4000,
      8000,
      16_000,
      32_000,
      BACKOFF_MAX_MS,
      BACKOFF_MAX_MS,
      BACKOFF_MAX_MS,
    ]);
  });

  it('spreads the wait with jitter, but never below the minimum', () => {
    expect(backoffDelay(4, () => 0.5)).toBe(4000);
    expect(backoffDelay(4, () => 0)).toBe(BACKOFF_MIN_MS);
  });
});
