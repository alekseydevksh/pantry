import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

import { API_URL } from '@/lib/config';

/**
 * Minimal typed GraphQL request over `fetch`. Temporary: Apollo Client replaces it in task 2.1.
 *
 * The result and variable types come from the generated document, so callers write no types by hand.
 */
export async function request<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  signal?: AbortSignal,
): Promise<TData> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: print(document), variables }),
    signal,
  });

  // The body is untyped JSON. Its `data` matches TData because the server implements the same
  // schema the document was generated from.
  const body = (await response.json()) as { data?: TData | null; errors?: { message: string }[] };
  if (body.errors?.length || !body.data) {
    throw new Error(body.errors?.[0]?.message ?? `Request failed with status ${response.status}`);
  }
  return body.data;
}
