// Sends the queued cart operations, one at a time, in order (ADR 0013). No React and no Apollo:
// `send` is given by the API layer (PLAN 3.10), which turns an operation into `setCartQty` and its
// error into a `SendResult`.
import type { CartOp } from './cart';
import { markSending, nextStep, retryNow, settle, type QueuedOp, type SendResult } from './queue';
import type { QueueStore } from './queueStore';

export type ReplayerOptions = {
  store: QueueStore;
  /** Sends one operation. A throw counts as an `unknown` failure. */
  send: (op: CartOp) => Promise<SendResult>;
  /** Fetches the server cart again (after a refused or given-up operation, see `settle`). */
  refetchCart: () => void;
  /** Default: `Date.now`. */
  now?: () => number;
  /** Default: `Math.random`, for the backoff jitter. */
  random?: () => number;
  /** `send` or `refetchCart` threw. */
  onError?: (error: unknown) => void;
};

export type Replayer = ReturnType<typeof createReplayer>;

function toCartOp({
  attempts: _a,
  unknownFailures: _u,
  nextAttemptAt: _n,
  ...op
}: QueuedOp): CartOp {
  return op;
}

export function createReplayer({
  store,
  send,
  refetchCart,
  now = Date.now,
  random = Math.random,
  onError = () => {},
}: ReplayerOptions) {
  let running: Promise<void> | null = null;
  let wake: (() => void) | null = null;
  let stopped = false;

  const update = (change: Parameters<ReturnType<QueueStore['getState']>['update']>[0]) =>
    store.getState().update(change);

  /** Waits `ms`, or less when `replayNow` or `stop` wakes it. */
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        wake = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      wake = done;
    });
  }

  async function sendOne(op: QueuedOp): Promise<void> {
    // Saved before the request goes out: if the app dies now, the operation restarts as sent.
    update((queue) => markSending(queue, op.key));
    let result: SendResult;
    try {
      result = await send(toCartOp(op));
    } catch (error) {
      onError(error);
      result = { ok: false, retry: 'unknown' };
    }

    let refetch = false;
    update((queue) => {
      const settled = settle(queue, op.key, result, { now: now(), random });
      refetch = settled.refetch;
      return settled.state;
    });
    if (refetch) {
      try {
        refetchCart();
      } catch (error) {
        onError(error);
      }
    }
  }

  async function run(): Promise<void> {
    try {
      while (!stopped) {
        const step = nextStep(store.getState().queue, now());
        if (step.type === 'idle') return;
        if (step.type === 'wait') await wait(step.until - now());
        else await sendOne(step.op);
      }
    } finally {
      // In the same synchronous step as the last "idle" check, so an operation added after it
      // starts a new run instead of joining one that is about to end.
      running = null;
    }
  }

  return {
    /**
     * Sends everything that is due, waits out backoffs, and resolves when the queue is empty (or
     * the replayer is stopped). A call while a run is going returns that run.
     */
    replay(): Promise<void> {
      if (stopped) return Promise.resolve();
      running ??= run();
      return running;
    },

    /** Clears the backoffs and replays at once, for example when the network comes back. */
    replayNow(): Promise<void> {
      update((queue) => retryNow(queue, now()));
      wake?.();
      return this.replay();
    },

    /** Stops after the request in flight, if any. The queue stays as it is, in storage. */
    stop(): void {
      stopped = true;
      wake?.();
    },
  };
}
