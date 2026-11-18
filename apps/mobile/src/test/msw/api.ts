// Typed GraphQL handlers for tests. The operation comes from a generated document, so the resolver
// gets typed variables and must return the exact result type of that operation:
//
//   server.use(api.query(ProductDocument, ({ variables }) => ({ product: makeProduct(variables.id) })));
//
// A resolver returns the `data` of the response: what the server sends, with the fields of every
// fragment (`Unmasked`). The app's own result types hide those fields (data masking, ADR 0007).
// To fail instead, use `api.networkError()`, `api.httpError(status)` or `api.graphqlError(message)`.
import type { TypedDocumentNode } from '@apollo/client';
import type { Unmasked } from '@apollo/client/masking';
import { HttpResponse } from 'msw';
import { graphql } from 'msw/graphql';

import { API_URL } from '@/lib/config';

type Resolver<TData, TVariables> = (info: {
  variables: TVariables;
  /** How many times this handler has been called, starting at 1. Useful for "fail once, then succeed". */
  callCount: number;
}) => Unmasked<TData> | Promise<Unmasked<TData>> | Response | Promise<Response>;

// (`result as TData`: the unmasked and the masked type describe the same JSON; MSW only knows the
// document's own, masked, type.)
// Only requests to the app's GraphQL endpoint match, so an unrelated request is still reported.
const endpoint = graphql.link(API_URL);

/** Answers a query. The handler matches by the operation name inside the document. */
export function query<
  TData extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
>(document: TypedDocumentNode<TData, TVariables>, resolver: Resolver<TData, TVariables>) {
  let callCount = 0;
  return endpoint.query(document, async ({ variables }) => {
    callCount += 1;
    const result = await resolver({ variables: variables as TVariables, callCount });
    return result instanceof Response ? result : HttpResponse.json({ data: result as TData });
  });
}

/** Answers a mutation. Same rules as `query`. */
export function mutation<
  TData extends Record<string, unknown>,
  TVariables extends Record<string, unknown>,
>(document: TypedDocumentNode<TData, TVariables>, resolver: Resolver<TData, TVariables>) {
  let callCount = 0;
  return endpoint.mutation(document, async ({ variables }) => {
    callCount += 1;
    const result = await resolver({ variables: variables as TVariables, callCount });
    return result instanceof Response ? result : HttpResponse.json({ data: result as TData });
  });
}

/** The request never reaches a server: what `fetch` reports offline ("Network request failed"). */
export function networkError(): Response {
  return HttpResponse.error();
}

/** The server answered, but with an HTTP error. 5xx is retried by the retry link, 4xx is not. */
export function httpError(status: number): Response {
  return new Response('error', { status });
}

/** A GraphQL error with no data, as the server sends it when a resolver throws. Never retried. */
export function graphqlError(message: string): Response {
  return HttpResponse.json({ data: null, errors: [{ message }] });
}

export const api = { query, mutation, networkError, httpError, graphqlError };
