import { detailsStatus, joinLabels } from '../model/details';

describe('detailsStatus', () => {
  it.each([
    ['nothing yet', { hasData: false, isMissing: false, hasError: false }, 'loading'],
    ['the item is loaded', { hasData: true, isMissing: false, hasError: false }, 'ready'],
    [
      'the server says there is no such item',
      { hasData: true, isMissing: true, hasError: false },
      'notFound',
    ],
    [
      'the request failed and there is nothing to show',
      { hasData: false, isMissing: false, hasError: true },
      'error',
    ],
    // A result beats an error: for example a refetch failed, but the item is on screen.
    [
      'an error after the item was loaded',
      { hasData: true, isMissing: false, hasError: true },
      'ready',
    ],
  ] as const)('is %s', (_name, state, expected) => {
    expect(detailsStatus(state)).toBe(expected);
  });
});

describe('joinLabels', () => {
  it('names each value and joins them with commas', () => {
    expect(joinLabels(['A', 'B'], (value) => value.toLowerCase())).toBe('a, b');
  });

  it('gives an empty string for no values', () => {
    expect(joinLabels([], (value) => value)).toBe('');
  });
});
