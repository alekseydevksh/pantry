import { GraphQLError } from 'graphql';

export type ErrorCode = 'BAD_USER_INPUT' | 'NOT_FOUND' | 'SIMULATED_ERROR';

/** A GraphQL error with a machine-readable `extensions.code`, so the client never matches on message text. */
export function apiError(code: ErrorCode, message: string, httpStatus?: number): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code, ...(httpStatus ? { http: { status: httpStatus } } : {}) },
  });
}
