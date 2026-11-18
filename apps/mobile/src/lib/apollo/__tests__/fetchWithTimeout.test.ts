import { createFetchWithTimeout, RequestTimeoutError } from '../fetchWithTimeout';

// `fetch` is overloaded, so `Parameters<typeof fetch>` would drop `URL` from the input type.
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

/**
 * A fetch that never answers on its own. Like the real one, it rejects with an AbortError when its
 * signal aborts, or at once when the signal is already aborted.
 */
function hangingFetch() {
  return jest.fn<Promise<Response>, FetchArgs>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(abortError());
          return;
        }
        init?.signal?.addEventListener('abort', () => reject(abortError()));
      }),
  );
}

describe('createFetchWithTimeout', () => {
  beforeEach(() => jest.useFakeTimers());

  it('fails with RequestTimeoutError when the server does not answer in time', async () => {
    const fetchWithTimeout = createFetchWithTimeout(1000, hangingFetch());

    const request = fetchWithTimeout('https://api.test/graphql');
    jest.advanceTimersByTime(1000);

    await expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it('does not time out before the limit', async () => {
    const base = hangingFetch();
    const fetchWithTimeout = createFetchWithTimeout(1000, base);

    void fetchWithTimeout('https://api.test/graphql').catch(() => {});
    jest.advanceTimersByTime(999);

    expect(base.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
  });

  it('keeps the AbortError when the caller cancels, so a cancel is not retried as a timeout', async () => {
    const caller = new AbortController();
    const fetchWithTimeout = createFetchWithTimeout(1000, hangingFetch());

    const request = fetchWithTimeout('https://api.test/graphql', { signal: caller.signal });
    caller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts at once when the caller signal is already aborted', async () => {
    const caller = new AbortController();
    caller.abort();
    const fetchWithTimeout = createFetchWithTimeout(1000, hangingFetch());

    await expect(
      fetchWithTimeout('https://api.test/graphql', { signal: caller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns the response and clears its timer when the server answers', async () => {
    const ok = new Response('{}', { status: 200 });
    const fetchWithTimeout = createFetchWithTimeout(1000, async () => ok);

    await expect(fetchWithTimeout('https://api.test/graphql')).resolves.toBe(ok);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('passes the request options through', async () => {
    const base = jest.fn(async () => new Response('{}'));
    const fetchWithTimeout = createFetchWithTimeout(1000, base);

    await fetchWithTimeout('https://api.test/graphql', { method: 'POST', body: 'x' });

    expect(base).toHaveBeenCalledWith(
      'https://api.test/graphql',
      expect.objectContaining({ method: 'POST', body: 'x', signal: expect.any(AbortSignal) }),
    );
  });
});
