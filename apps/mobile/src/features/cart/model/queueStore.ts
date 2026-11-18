// The offline cart queue, kept across restarts (ADR 0005: the cart queue is Zustand, persisted in
// MMKV through the storage interface). The store only holds the state; queue.ts changes it.
//
// MMKV writes are synchronous, so a `setState` is on disk when it returns. The replayer relies on
// that: it saves `attempts + 1` before it sends (write-ahead), so an app killed during a request
// restarts with the operation marked as sent, and resends it with the same key.
import { z } from 'zod';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { KeyValueStorage } from '@/lib/storage';

import { MAX_QTY } from './cart';
import { EMPTY_QUEUE, type QueuedOp, type QueueState, type Rejection } from './queue';

export type QueueStoreState = {
  queue: QueueState;
  /** Replaces the queue with `change(queue)`. */
  update: (change: (queue: QueueState) => QueueState) => void;
};

export const CART_QUEUE_STORAGE_KEY = 'pantry.cart-queue';

const count = z.number().int().nonnegative();
const cartOpSchema = z.object({
  productId: z.string().min(1),
  qty: count.max(MAX_QTY),
  key: z.string().min(1),
  intent: z.enum(['add', 'remove', 'set']),
  createdAt: z.number().finite(),
});
const queuedOpSchema = cartOpSchema.extend({
  attempts: count,
  unknownFailures: count,
  nextAttemptAt: z.number().finite(),
});
const rejectionSchema = z.object({ op: cartOpSchema, code: z.string() });

/** Keeps each valid entry of `items` (from storage, so untrusted) and drops the others. */
function validItems<T>(items: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * The valid part of a stored queue. A damaged entry is dropped on its own: losing one queued change
 * is better than losing the queue, or crashing at startup.
 */
export function sanitizeQueue(stored: unknown): QueueState {
  if (typeof stored !== 'object' || stored === null) return EMPTY_QUEUE;
  const { ops, rejected } = stored as Record<string, unknown>;
  const valid = validItems<QueuedOp>(ops, queuedOpSchema);
  // Two entries with one key would be two changes the server applies once: keep the first.
  const seen = new Set<string>();
  return {
    ops: valid.filter((op) => !seen.has(op.key) && Boolean(seen.add(op.key))),
    rejected: validItems<Rejection>(rejected, rejectionSchema),
  };
}

export function createQueueStore(storage: KeyValueStorage) {
  return createStore<QueueStoreState>()(
    persist(
      (set) => ({
        queue: EMPTY_QUEUE,
        update: (change) => set(({ queue }) => ({ queue: change(queue) })),
      }),
      {
        name: CART_QUEUE_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: ({ queue }) => ({ queue }),
        merge: (stored, current) => ({
          ...current,
          queue: sanitizeQueue((stored as { queue?: unknown } | null)?.queue),
        }),
      },
    ),
  );
}

export type QueueStore = ReturnType<typeof createQueueStore>;
