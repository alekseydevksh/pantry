// A JSON response for the tests that give the Apollo link chain its own `fetch` (the link unit
// tests in src/lib/apollo). Screen and feature tests use MSW instead (see ./msw).

/** A JSON response, as Apollo's HttpLink expects it (it reads the body with `text()`). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
