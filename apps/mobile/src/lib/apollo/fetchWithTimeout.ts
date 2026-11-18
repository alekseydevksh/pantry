// React Native's `fetch` has no timeout: a request to a server that never answers stays pending
// forever, so it never fails and is never retried. This wrapper aborts it after `timeoutMs`.

export const REQUEST_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
  override name = 'RequestTimeoutError';
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
  }
}

/**
 * Returns a `fetch` that fails with `RequestTimeoutError` after `timeoutMs`. The caller's own
 * signal (Apollo aborts a request when its query is unsubscribed) still works and still produces
 * an `AbortError`, so the retry link can tell a timeout (retry) from a cancel (do not retry).
 */
export function createFetchWithTimeout(
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  baseFetch: typeof fetch = (...args) => fetch(...args),
): typeof fetch {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const callerSignal = init.signal;
    let timedOut = false;

    const onCallerAbort = () => controller.abort();
    if (callerSignal?.aborted) {
      controller.abort();
    } else {
      callerSignal?.addEventListener('abort', onCallerAbort);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await baseFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      throw timedOut ? new RequestTimeoutError(timeoutMs) : error;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  };
}
