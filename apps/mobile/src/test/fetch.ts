// Hand-made `fetch` mocks for tests that need an API response. MSW replaces them in task 2.4.

/** A JSON response, as Apollo's HttpLink expects it (it reads the body with `text()`). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Replaces the global `fetch`. Restore with `jest.restoreAllMocks()`. */
export function mockFetch(
  implementation: (...args: Parameters<typeof fetch>) => Promise<Response>,
) {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(implementation);
}

/** Every request gets an empty feed, so screens that load the feed render without a server. */
export function mockEmptyFeedFetch() {
  return mockFetch(async () =>
    jsonResponse({
      data: { feed: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    }),
  );
}
