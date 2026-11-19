// Turns what a failed `setCartQty` threw into the result the replayer understands (ADR 0013,
// Decision 4). It reads the error, not the message text: GraphQL errors by `extensions.code`, HTTP
// errors by status.
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

import type { SendResult } from '../model/queue';

/** The server says the operation can never work: sending it again gives the same answer. */
const REFUSAL_CODES = ['BAD_USER_INPUT', 'NOT_FOUND'] as const;

/** The server failed on purpose or by accident, and may be well on the next request. */
const TRANSIENT_CODES = ['SIMULATED_ERROR', 'INTERNAL_SERVER_ERROR'];

const isRefusal = (code: unknown): code is (typeof REFUSAL_CODES)[number] =>
  REFUSAL_CODES.some((refusal) => refusal === code);

/** Errors `fetch` throws without an answer, and our own timeout (`RequestTimeoutError`). */
function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error instanceof TypeError ||
    error.name === 'AbortError' ||
    error.name === 'RequestTimeoutError'
  );
}

export function classifyCartError(error: unknown): SendResult {
  if (CombinedGraphQLErrors.is(error)) {
    const codes = error.errors.map((graphqlError) => graphqlError.extensions?.code);
    const refusal = codes.find(isRefusal);
    if (refusal) return { ok: false, retry: 'never', code: refusal };
    if (codes.some((code) => typeof code === 'string' && TRANSIENT_CODES.includes(code))) {
      return { ok: false, retry: 'network' };
    }
    return { ok: false, retry: 'unknown' };
  }
  if (ServerError.is(error)) {
    return { ok: false, retry: error.statusCode >= 500 ? 'network' : 'unknown' };
  }
  if (isConnectionError(error)) return { ok: false, retry: 'network' };
  return { ok: false, retry: 'unknown' };
}
