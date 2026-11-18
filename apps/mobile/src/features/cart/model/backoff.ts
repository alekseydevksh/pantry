// How long the queue waits before it sends a failed operation again. Pure.

export const BACKOFF_BASE_MS = 1000;
/** Never retry at once: a wait of 0 would turn a broken server into a busy loop. */
export const BACKOFF_MIN_MS = 250;
export const BACKOFF_MAX_MS = 60_000;

/**
 * "Full jitter": a random wait up to min(max, base × 2^(attempt − 1)), and at least 250 ms. Many phones that come
 * back online at the same moment do not all retry at the same moment.
 *
 * @param attempt how many times the operation was sent, 1 or more
 * @param random a number in [0, 1), `Math.random` in the app
 */
export function backoffDelay(attempt: number, random: () => number): number {
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.max(BACKOFF_MIN_MS, Math.floor(random() * ceiling));
}
