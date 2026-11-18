// The request chain: ErrorLink → RetryLink → HttpLink.
// The error link is outside the retry link, so it sees an error only once, after the retries ran
// out, and a request that succeeds on its second attempt is not reported.
import { ApolloLink, HttpLink } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

import { reportError, type ErrorContext } from '@/lib/observability';

import { createFetchWithTimeout } from './fetchWithTimeout';
import { RETRY_ATTEMPTS, RETRY_DELAY, shouldRetry } from './retry';

export type LinkOptions = {
  uri: string;
  /** Replaced in tests. Defaults to the global `fetch` with a timeout. */
  fetch?: typeof fetch;
  /** Replaced in tests to retry without waiting. */
  retryDelay?: RetryLink.Options['delay'];
};

type ErrorKind = 'graphql' | 'server' | 'network';

function errorKind(error: unknown): ErrorKind {
  if (CombinedGraphQLErrors.is(error)) return 'graphql';
  if (ServerError.is(error)) return 'server';
  return 'network';
}

export function createErrorLink(report = reportError): ErrorLink {
  return new ErrorLink(({ error, operation }) => {
    // A cancelled request (screen closed, query unsubscribed) is not a failure.
    if (error.name === 'AbortError') return;

    const extra: ErrorContext['extra'] = {
      operationName: operation.operationName ?? null,
      kind: errorKind(error),
      status: ServerError.is(error) ? error.statusCode : null,
    };
    report(error, { source: 'apollo', extra });
  });
}

export function createLink({ uri, fetch, retryDelay = RETRY_DELAY }: LinkOptions): ApolloLink {
  return ApolloLink.from([
    createErrorLink(),
    new RetryLink({
      delay: retryDelay,
      attempts: { max: RETRY_ATTEMPTS, retryIf: shouldRetry },
    }),
    new HttpLink({ uri, fetch: fetch ?? createFetchWithTimeout() }),
  ]);
}
