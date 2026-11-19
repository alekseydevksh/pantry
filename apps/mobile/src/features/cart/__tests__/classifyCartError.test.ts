import { CombinedGraphQLErrors, ServerError, ServerParseError } from '@apollo/client/errors';

import { RequestTimeoutError } from '@/lib/apollo/fetchWithTimeout';

import { classifyCartError } from '../api/classifyCartError';

const graphqlErrors = (...codes: (string | undefined)[]) =>
  new CombinedGraphQLErrors({
    data: null,
    errors: codes.map((code) => ({
      message: 'x',
      ...(code ? { extensions: { code } } : {}),
    })),
  });

const serverError = (statusCode: number) =>
  new ServerError('x', { response: new Response('x', { status: statusCode }), bodyText: 'x' });

describe('classifyCartError', () => {
  it.each([
    ['BAD_USER_INPUT', 'BAD_USER_INPUT'],
    ['NOT_FOUND', 'NOT_FOUND'],
  ])('never retries a refusal: %s', (code, expected) => {
    expect(classifyCartError(graphqlErrors(code))).toEqual({
      ok: false,
      retry: 'never',
      code: expected,
    });
  });

  it('a refusal wins over another error in the same response', () => {
    expect(classifyCartError(graphqlErrors('SIMULATED_ERROR', 'NOT_FOUND'))).toEqual({
      ok: false,
      retry: 'never',
      code: 'NOT_FOUND',
    });
  });

  it.each([
    ['a simulated server error', graphqlErrors('SIMULATED_ERROR')],
    ['an internal server error', graphqlErrors('INTERNAL_SERVER_ERROR')],
    ['HTTP 500', serverError(500)],
    ['HTTP 503', serverError(503)],
    ['fetch with no connection', new TypeError('Network request failed')],
    ['our request timeout', new RequestTimeoutError(15_000)],
    ['an aborted request', Object.assign(new Error('aborted'), { name: 'AbortError' })],
  ])('retries without a limit: %s', (_name, error) => {
    expect(classifyCartError(error)).toEqual({ ok: false, retry: 'network' });
  });

  it.each([
    ['a GraphQL error with another code', graphqlErrors('SOMETHING_NEW')],
    ['a GraphQL error with no code', graphqlErrors(undefined)],
    ['HTTP 400', serverError(400)],
    ['HTTP 429', serverError(429)],
    [
      'a response that is not JSON',
      new ServerParseError(new Error('x'), { response: new Response('x'), bodyText: 'x' }),
    ],
    ['a bug', new Error('undefined is not a function')],
    ['something that is not an error', 'oops'],
  ])('retries a few times: %s', (_name, error) => {
    expect(classifyCartError(error)).toEqual({ ok: false, retry: 'unknown' });
  });
});
