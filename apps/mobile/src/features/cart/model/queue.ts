// The offline cart queue as a state machine (ADR 0013). Pure: the replayer (replayer.ts) does the
// sending and the waiting, and calls these functions to move from one state to the next.
//
// Invariants:
// - Operations are sent in order, one at a time, so the sent operations are always a prefix.
// - A sent operation (`attempts > 0`) is frozen: never merged, never re-keyed, never dropped except
//   by its own result. It may have reached the server, and only its key keeps a retry safe.
import { backoffDelay } from './backoff';
import {
  isValidIntent,
  projectCart,
  qtyOf,
  targetQty,
  type CartIntent,
  type CartLine,
  type CartOp,
} from './cart';

export type QueuedOp = CartOp & {
  /** How many times it was sent. Saved before each send (write-ahead). */
  attempts: number;
  /** Failures the client could not classify; after `MAX_UNKNOWN_FAILURES` the op is given up. */
  unknownFailures: number;
  /** Not sent again before this time, in ms since the epoch. */
  nextAttemptAt: number;
};

/** An operation the server refused for good, or that was given up. For the toast in PLAN 3.10. */
export type Rejection = { op: CartOp; code: string };

export type QueueState = { ops: QueuedOp[]; rejected: Rejection[] };

export const EMPTY_QUEUE: QueueState = Object.freeze({ ops: [], rejected: [] }) as QueueState;

/** An error the client could not classify is sent at most this many times. */
export const MAX_UNKNOWN_FAILURES = 5;

/** The code of a rejection the client made itself, after `MAX_UNKNOWN_FAILURES`. */
export const GAVE_UP = 'GAVE_UP';

/**
 * The outcome of one send, as the API layer classifies it (PLAN 3.10).
 * - `network`: no answer, a timeout or HTTP 5xx. Retried with no limit (offline can last days).
 * - `unknown`: anything else that might pass on a retry. Retried a few times.
 * - `never`: the server refused it (`BAD_USER_INPUT`, `NOT_FOUND`). Sending it again cannot help.
 */
export type SendResult =
  | { ok: true }
  | { ok: false; retry: 'network' | 'unknown' }
  | { ok: false; retry: 'never'; code: string };

export const isSent = (op: QueuedOp): boolean => op.attempts > 0;

export type EnqueueContext = {
  /** The server cart as last fetched (the Apollo cache). */
  serverLines: readonly CartLine[];
  /** A new idempotency key. */
  key: string;
  now: number;
};

/**
 * Adds the user's intent to the queue, as the absolute quantity they want.
 *
 * - The target comes from what the user sees: the server cart with the queue applied.
 * - The unsent operations of the same product are replaced: only the newest target matters.
 * - An operation that would change nothing (the target equals the quantity under it, the server
 *   cart plus the sent operations) is not added. So "add, then remove" before anything is sent
 *   leaves no operation when the server cart did not have the product.
 *
 * Throws a `RangeError` for an invalid intent (a programming error: the UI never builds one).
 */
export function enqueue(
  state: QueueState,
  intent: CartIntent,
  { serverLines, key, now }: EnqueueContext,
): QueueState {
  if (!isValidIntent(intent))
    throw new RangeError(`Invalid cart intent: ${JSON.stringify(intent)}`);
  const { productId } = intent;

  const shown = qtyOf(projectCart(serverLines, state.ops), productId);
  const target = targetQty(shown, intent);

  const kept = state.ops.filter((op) => isSent(op) || op.productId !== productId);
  const under = qtyOf(projectCart(serverLines, kept), productId);
  if (target === under) return { ...state, ops: kept };

  const op: QueuedOp = {
    productId,
    qty: target,
    key,
    intent: intent.kind,
    createdAt: now,
    attempts: 0,
    unknownFailures: 0,
    nextAttemptAt: now,
  };
  return { ...state, ops: [...kept, op] };
}

export type Step =
  { type: 'idle' } | { type: 'wait'; until: number } | { type: 'send'; op: QueuedOp };

/** What the replayer does next: send the first operation, wait for its backoff, or nothing. */
export function nextStep(state: QueueState, now: number): Step {
  const head = state.ops[0];
  if (!head) return { type: 'idle' };
  if (head.nextAttemptAt > now) return { type: 'wait', until: head.nextAttemptAt };
  return { type: 'send', op: head };
}

function updateOp(state: QueueState, key: string, change: (op: QueuedOp) => QueuedOp): QueueState {
  return { ...state, ops: state.ops.map((op) => (op.key === key ? change(op) : op)) };
}

/** Marks the operation as sent once more. Saved before the request goes out (write-ahead). */
export function markSending(state: QueueState, key: string): QueueState {
  return updateOp(state, key, (op) => ({ ...op, attempts: op.attempts + 1 }));
}

function reject(state: QueueState, op: QueuedOp, code: string): QueueState {
  const { attempts: _a, unknownFailures: _u, nextAttemptAt: _n, ...cartOp } = op;
  return {
    ops: state.ops.filter((queued) => queued.key !== op.key),
    rejected: [...state.rejected, { op: cartOp, code }],
  };
}

export type Settled = {
  state: QueueState;
  /**
   * The server cart should be fetched again: the operation was refused or given up, and the server
   * may still have applied it (a request that failed after the server changed the cart).
   */
  refetch: boolean;
};

/** Applies the result of sending the operation with `key`. */
export function settle(
  state: QueueState,
  key: string,
  result: SendResult,
  { now, random }: { now: number; random: () => number },
): Settled {
  const op = state.ops.find((queued) => queued.key === key);
  if (!op) return { state, refetch: false };

  if (result.ok) {
    return {
      state: { ...state, ops: state.ops.filter((queued) => queued.key !== key) },
      refetch: false,
    };
  }
  if (result.retry === 'never') return { state: reject(state, op, result.code), refetch: true };

  const unknownFailures = op.unknownFailures + (result.retry === 'unknown' ? 1 : 0);
  if (unknownFailures >= MAX_UNKNOWN_FAILURES) {
    return { state: reject(state, op, GAVE_UP), refetch: true };
  }
  const nextAttemptAt = now + backoffDelay(op.attempts, random);
  return {
    state: updateOp(state, key, () => ({ ...op, unknownFailures, nextAttemptAt })),
    refetch: false,
  };
}

/** Clears every backoff, for example when the network comes back. */
export function retryNow(state: QueueState, now: number): QueueState {
  return {
    ...state,
    ops: state.ops.map((op) => ({ ...op, nextAttemptAt: Math.min(op.nextAttemptAt, now) })),
  };
}

/** The UI showed the rejections. */
export function dismissRejections(state: QueueState): QueueState {
  return { ...state, rejected: [] };
}
