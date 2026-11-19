import { createMemoryStorage, type KeyValueStorage } from '@/lib/storage';

import { applyOp, projectCart, type CartIntent, type CartLine, type CartOp } from '../model/cart';
import { enqueue, GAVE_UP, MAX_UNKNOWN_FAILURES, type SendResult } from '../model/queue';
import { createQueueStore, type QueueStore } from '../model/queueStore';
import { createReplayer, type ReplayerOptions } from '../model/replayer';

/**
 * What happens to one request.
 * - `ok`: applied, answered.
 * - `offline`: never reached the server.
 * - `5xx`: reached it, failed before applying.
 * - `lost`: applied, then the response was lost (the client sees a network error).
 * - `unknown`: not applied, an error the client cannot classify.
 * - `lost-unknown`: applied, then an error the client cannot classify.
 * - `reject`: refused for good (`NOT_FOUND`), not applied.
 */
type Outcome = 'ok' | 'offline' | '5xx' | 'lost' | 'unknown' | 'lost-unknown' | 'reject';

/**
 * A server with the real server's rules (server/src/cart.ts): `setCartQty` by key, and a key that
 * was applied before changes nothing. It counts how often each key changed the cart.
 */
class FakeCartServer {
  lines: CartLine[] = [];
  /** How many times each key changed the cart. Must never be more than 1. */
  readonly appliedTimes = new Map<string, number>();
  /** Every request, in order, by key. */
  readonly requests: string[] = [];

  constructor(private readonly script: Outcome[] = []) {}

  private apply(op: CartOp) {
    if (this.appliedTimes.has(op.key)) return; // the server's idempotency check
    this.lines = applyOp(this.lines, op);
    this.appliedTimes.set(op.key, 1);
  }

  readonly send = async (op: CartOp): Promise<SendResult> => {
    this.requests.push(op.key);
    switch (this.script.shift() ?? 'ok') {
      case 'ok':
        this.apply(op);
        return { ok: true };
      case 'offline':
      case '5xx':
        return { ok: false, retry: 'network' };
      case 'lost':
        this.apply(op);
        return { ok: false, retry: 'network' };
      case 'unknown':
        return { ok: false, retry: 'unknown' };
      case 'lost-unknown':
        this.apply(op);
        return { ok: false, retry: 'unknown' };
      case 'reject':
        return { ok: false, retry: 'never', code: 'NOT_FOUND' };
    }
  };
}

const add = (productId: string, qty = 1): CartIntent => ({ kind: 'add', productId, qty });
const remove = (productId: string): CartIntent => ({ kind: 'remove', productId });
const lines = (...entries: [string, number][]): CartLine[] =>
  entries.map(([productId, qty]) => ({ productId, qty }));

let nextKey = 0;
/** What the UI does in 3.10: enqueue against the server cart it has (the Apollo cache). */
function userDoes(store: QueueStore, server: FakeCartServer, ...intents: CartIntent[]) {
  for (const intent of intents) {
    store.getState().update((queue) =>
      enqueue(queue, intent, {
        serverLines: server.lines,
        key: `key-${++nextKey}`,
        now: Date.now(),
      }),
    );
  }
}

function setup(
  script: Outcome[] = [],
  {
    storage = createMemoryStorage(),
    ...options
  }: Partial<ReplayerOptions> & { storage?: KeyValueStorage } = {},
) {
  const server = new FakeCartServer(script);
  const store = createQueueStore(storage);
  const refetchCart = jest.fn();
  const replayer = createReplayer({
    store,
    send: server.send,
    refetchCart,
    random: () => 1,
    ...options,
  });
  const shown = () => projectCart(server.lines, store.getState().queue.ops);
  return { server, store, replayer, refetchCart, shown };
}

/** Replays to the end, running the backoff timers. */
async function replayAll(replayer: ReturnType<typeof createReplayer>) {
  const done = replayer.replay();
  await jest.runAllTimersAsync();
  await done;
}

beforeEach(() => {
  jest.useFakeTimers();
  nextKey = 0;
});

describe('replay: failure injection', () => {
  type Row = {
    name: string;
    intents: CartIntent[];
    script: Outcome[];
    cart: CartLine[];
    rejected?: string[];
    refetches?: number;
  };

  it.each<Row>([
    {
      name: 'everything succeeds',
      intents: [add('p1'), add('p1'), add('p2')],
      script: [],
      cart: lines(['p1', 2], ['p2', 1]),
    },
    {
      name: 'offline, then back',
      intents: [add('p1'), add('p2')],
      script: ['offline', 'offline', 'ok'],
      cart: lines(['p1', 1], ['p2', 1]),
    },
    {
      name: 'a 5xx in the middle',
      intents: [add('p1'), add('p2'), add('p3')],
      script: ['ok', '5xx', '5xx', 'ok'],
      cart: lines(['p1', 1], ['p2', 1], ['p3', 1]),
    },
    {
      name: 'a lost response: retried with the same key, applied once',
      intents: [add('p1', 2), add('p2')],
      script: ['lost', 'ok'],
      cart: lines(['p1', 2], ['p2', 1]),
    },
    {
      name: 'two lost responses in a row',
      intents: [add('p1')],
      script: ['lost', 'lost', 'ok'],
      cart: lines(['p1', 1]),
    },
    {
      name: 'a refusal in the middle: dropped, recorded, refetched, the rest goes on',
      intents: [add('p1'), add('p2'), add('p3')],
      script: ['ok', 'reject', 'ok'],
      cart: lines(['p1', 1], ['p3', 1]),
      rejected: ['NOT_FOUND'],
      refetches: 1,
    },
    {
      name: 'unknown errors: given up, refetched, the rest goes on',
      intents: [add('p1'), add('p2')],
      script: Array<Outcome>(MAX_UNKNOWN_FAILURES).fill('unknown'),
      cart: lines(['p2', 1]),
      rejected: [GAVE_UP],
      refetches: 1,
    },
    {
      name: 'given up although the server applied it: the refetch shows the truth',
      intents: [add('p1')],
      script: Array<Outcome>(MAX_UNKNOWN_FAILURES).fill('lost-unknown'),
      cart: lines(['p1', 1]),
      rejected: [GAVE_UP],
      refetches: 1,
    },
    {
      name: 'add then remove before sending: nothing is sent',
      intents: [add('p1'), remove('p1')],
      script: [],
      cart: [],
    },
  ])('$name', async ({ intents, script, cart, rejected = [], refetches = 0 }) => {
    const { server, store, replayer, refetchCart } = setup(script);
    userDoes(store, server, ...intents);

    await replayAll(replayer);

    expect(server.lines).toStrictEqual(cart);
    expect(store.getState().queue.ops).toStrictEqual([]);
    expect(store.getState().queue.rejected.map((rejection) => rejection.code)).toStrictEqual(
      rejected,
    );
    expect(refetchCart).toHaveBeenCalledTimes(refetches);
    // No operation is ever applied twice.
    expect([...server.appliedTimes.values()].every((times) => times === 1)).toBe(true);
  });

  it('retries a failed operation with its own key, and sends nothing else before it', async () => {
    const { server, store, replayer } = setup(['lost', '5xx', 'ok']);
    userDoes(store, server, add('p1'), add('p2'));

    await replayAll(replayer);

    expect(server.requests).toStrictEqual(['key-1', 'key-1', 'key-1', 'key-2']);
  });
});

describe('replay: a lost response followed by a refetch', () => {
  it('shows the same cart before and after the refetch (no double count)', async () => {
    // The user had 1 and adds 1. The server applies it, the response is lost, and the cart is
    // fetched again (pull-to-refresh) while the operation is still queued.
    const { server, store, replayer, shown } = setup(['lost']);
    server.lines = lines(['p1', 1]);
    userDoes(store, server, add('p1'));
    const before = shown();

    const done = replayer.replay();
    await jest.advanceTimersByTimeAsync(0);
    // The server applied it; `shown()` projects the queue over the refetched server cart.
    expect(server.lines).toStrictEqual(lines(['p1', 2]));
    expect(store.getState().queue.ops).toHaveLength(1);
    expect(shown()).toStrictEqual(before);
    expect(shown()).toStrictEqual(lines(['p1', 2]));

    await jest.runAllTimersAsync();
    await done;
    expect(shown()).toStrictEqual(lines(['p1', 2]));
    expect(server.appliedTimes.get('key-1')).toBe(1);
  });

  it('keeps the shown cart steady at every step of a failing replay', async () => {
    const { server, store, shown } = setup(['lost', 'offline', 'lost', 'ok']);
    server.lines = lines(['p1', 1]);
    userDoes(store, server, add('p1'), add('p2', 3), remove('p1'), add('p3'));
    const expected = shown();
    const seen: CartLine[][] = [];
    const send = server.send;
    // Look at the cart on screen right after every request, as a refetch would.
    const watched = createReplayer({
      store,
      random: () => 1,
      refetchCart: () => {},
      send: async (op) => {
        const result = await send(op);
        seen.push(shown());
        return result;
      },
    });

    const done = watched.replay();
    await jest.runAllTimersAsync();
    await done;

    expect(seen.length).toBeGreaterThan(3);
    for (const cart of seen) expect(cart).toStrictEqual(expected);
    expect(server.lines).toStrictEqual(expected);
  });
});

describe('replay: the app is killed during a request', () => {
  it.each<[string, Outcome]>([
    ['before the server applied it', 'offline'],
    ['after the server applied it', 'lost'],
  ])('resends it with the same key after the restart, %s', async (_case, firstOutcome) => {
    const storage = createMemoryStorage();
    const server = new FakeCartServer();
    const first = createQueueStore(storage);
    userDoes(first, server, add('p1', 2), add('p2'));
    // The first run: the request goes out and never comes back, because the app dies.
    const dying = createReplayer({
      store: first,
      refetchCart: () => {},
      send: (op) => {
        if (firstOutcome === 'lost') server.lines = applyOp(server.lines, op);
        if (firstOutcome === 'lost') server.appliedTimes.set(op.key, 1);
        server.requests.push(op.key);
        return new Promise<SendResult>(() => {});
      },
    });
    void dying.replay();
    await jest.advanceTimersByTimeAsync(0);

    // The restart: a new store from the same storage, a new replayer.
    const restarted = createQueueStore(storage);
    expect(restarted.getState().queue.ops[0]).toMatchObject({ key: 'key-1', attempts: 1 });
    const replayer = createReplayer({ store: restarted, send: server.send, refetchCart: () => {} });
    await replayAll(replayer);

    expect(server.requests).toStrictEqual(['key-1', 'key-1', 'key-2']);
    expect(server.lines).toStrictEqual(lines(['p1', 2], ['p2', 1]));
    expect([...server.appliedTimes.values()].every((times) => times === 1)).toBe(true);
    expect(restarted.getState().queue.ops).toStrictEqual([]);
  });
});

describe('replay: scheduling', () => {
  it('waits out the backoff before it sends again', async () => {
    const { server, store, replayer } = setup(['offline', 'ok']);
    userDoes(store, server, add('p1'));

    const done = replayer.replay();
    await jest.advanceTimersByTimeAsync(0);
    expect(server.requests).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(999);
    expect(server.requests).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(server.requests).toHaveLength(2);
    await done;
  });

  it('sends at once on replayNow (the network came back), without waiting for the backoff', async () => {
    const { server, store, replayer } = setup(['offline', 'offline', 'offline', 'ok']);
    userDoes(store, server, add('p1'));
    const done = replayer.replay();
    await jest.advanceTimersByTimeAsync(1000 + 2000); // two backoffs: three requests
    expect(server.requests).toHaveLength(3);

    const now = replayer.replayNow();
    await jest.advanceTimersByTimeAsync(0);

    expect(server.requests).toHaveLength(4);
    expect(server.lines).toStrictEqual(lines(['p1', 1]));
    await Promise.all([done, now]);
  });

  it('runs one replay at a time and picks up operations added during it', async () => {
    const { server, store, replayer } = setup();
    userDoes(store, server, add('p1'));

    const first = replayer.replay();
    const second = replayer.replay();
    userDoes(store, server, add('p2'));
    await jest.runAllTimersAsync();
    await Promise.all([first, second]);

    expect(second).toBe(first);
    expect(server.requests).toStrictEqual(['key-1', 'key-2']);
    expect(server.lines).toStrictEqual(lines(['p1', 1], ['p2', 1]));
  });

  it('starts a new run for an operation added after the queue went idle', async () => {
    const { server, store, replayer } = setup();
    userDoes(store, server, add('p1'));
    await replayAll(replayer);

    userDoes(store, server, add('p2'));
    await replayAll(replayer);

    expect(server.lines).toStrictEqual(lines(['p1', 1], ['p2', 1]));
  });

  it('does not start a second run when a subscriber replays while the first one changes the queue', async () => {
    // CartSync replays on every change of the queue, including the ones the replayer makes.
    const { server, store, replayer } = setup();
    const runs: Promise<void>[] = [];
    store.subscribe(() => runs.push(replayer.replay()));
    userDoes(store, server, add('p1'));

    await jest.runAllTimersAsync();
    await Promise.all(runs);

    expect(server.requests).toStrictEqual(['key-1']);
    expect(new Set(runs).size).toBe(1);
  });

  it('starts a run for an operation added after a replay found the queue empty', async () => {
    // The app does this at launch: it replays whatever is saved, which is nothing, and later the
    // user adds something. An empty replay finishes before it returns, which must not count as
    // "a run is going".
    const { server, store, replayer } = setup();
    await replayer.replay();

    userDoes(store, server, add('p1'));
    await replayAll(replayer);

    expect(server.requests).toStrictEqual(['key-1']);
    expect(server.lines).toStrictEqual(lines(['p1', 1]));
  });

  it('treats a send that throws as an unknown failure, and reports it', async () => {
    const onError = jest.fn();
    let calls = 0;
    const { server, store, replayer } = setup([], {
      onError,
      send: async () => {
        calls += 1;
        throw new Error('bug in send');
      },
    });
    userDoes(store, server, add('p1'));

    await replayAll(replayer);

    expect(calls).toBe(MAX_UNKNOWN_FAILURES);
    expect(onError).toHaveBeenCalledWith(new Error('bug in send'));
    expect(store.getState().queue.rejected.map((rejection) => rejection.code)).toStrictEqual([
      GAVE_UP,
    ]);
  });

  it('stops after stop(), and leaves the queue in storage', async () => {
    const { server, store, replayer } = setup(['offline']);
    userDoes(store, server, add('p1'));

    const done = replayer.replay();
    await jest.advanceTimersByTimeAsync(0);
    replayer.stop();
    await done;

    expect(store.getState().queue.ops).toHaveLength(1);
    await expect(replayer.replay()).resolves.toBeUndefined();
    expect(server.requests).toHaveLength(1);
  });
});
