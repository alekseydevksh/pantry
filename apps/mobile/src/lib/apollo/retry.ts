// Which failed requests the RetryLink sends again. Pure, so it is unit-tested on its own.
import type { ApolloLink } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError, ServerParseError } from '@apollo/client/errors';

export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = { initial: 300, max: 3000, jitter: true } as const;

type RetryOperation = Pick<ApolloLink.Operation, 'query' | 'variables'>;

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isMutation(operation: RetryOperation): boolean {
  return operation.query.definitions.some(
    (definition) =>
      definition.kind === 'OperationDefinition' && definition.operation === 'mutation',
  );
}

/**
 * - Network errors (no response, our fetch timeout) and HTTP 5xx: retry. They are often short.
 * - HTTP 4xx, a response that is not JSON, GraphQL errors: no. Sending the same request again
 *   gives the same answer.
 * - Aborted requests: no. Somebody cancelled them on purpose.
 * - Mutations only when they carry an `idempotencyKey`: the server then applies them once even if
 *   the first attempt did reach it and only the response was lost. A mutation without a key is
 *   never retried, so a new mutation cannot be applied twice by accident.
 */
export function shouldRetry(error: unknown, operation: RetryOperation): boolean {
  if (error == null || isAbort(error)) return false;
  if (CombinedGraphQLErrors.is(error) || ServerParseError.is(error)) return false;
  if (ServerError.is(error) && error.statusCode < 500) return false;

  if (isMutation(operation)) {
    const key = operation.variables?.idempotencyKey;
    return typeof key === 'string' && key.length > 0;
  }
  return true;
}
