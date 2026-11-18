import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import { SuggestionsDocument } from '@pantry/shared';

import { api } from '@/test/msw/api';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';
import { suggestionPrefix } from '../model/typeahead';

describe('suggestionPrefix', () => {
  it.each([
    ['pa', 'pa'],
    ['  pa ', 'pa'],
    ['to   ma', 'to ma'],
    ['', ''],
    ['   ', ''],
  ])('%j -> %j', (text, expected) => {
    expect(suggestionPrefix(text)).toBe(expected);
  });
});

/**
 * Renders the search screen under the real router and switches to fake timers for the debounce.
 * The router turns on Jest's fake timers by itself, including the microtask queue that MSW's
 * responses go through, so the timers are set again afterwards, without it.
 */
async function renderSearch(url = '/search') {
  await renderWithProviders(<SearchScreen />, { route: { pattern: 'search', url } });
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

const fieldLabel = 'Search groceries and recipes';
const settle = () => act(() => jest.advanceTimersByTimeAsync(250));
const suggestion = (name: string) => screen.queryByRole('button', { name });

/** Answers `suggestions` per prefix; a prefix in `held` answers only after `release(prefix)`. */
function suggestionsApi(answers: Record<string, string[]>, held: string[] = []) {
  const requests: string[] = [];
  const gates = new Map<string, () => void>();
  const handler = api.query(SuggestionsDocument, async ({ variables }) => {
    requests.push(variables.prefix);
    if (held.includes(variables.prefix)) {
      await new Promise<void>((resolve) => gates.set(variables.prefix, resolve));
    }
    return { suggestions: answers[variables.prefix] ?? [] };
  });
  const release = async (prefix: string) => {
    // The request may still be on its way to the handler.
    await waitFor(() => expect(gates.has(prefix)).toBe(true));
    await act(async () => gates.get(prefix)?.());
  };
  return { requests, handler, release };
}

describe('typeahead', () => {
  it('sends one request for fast typing, after 250 ms of silence', async () => {
    const { requests, handler } = suggestionsApi({ tomato: ['Tomato soup', 'Tomatoes'] });
    server.use(handler);
    const user = await renderSearch();

    const input = screen.getByLabelText(fieldLabel);
    await user.type(input, 'tom');
    await act(() => jest.advanceTimersByTimeAsync(100));
    await user.type(input, 'at');
    await act(() => jest.advanceTimersByTimeAsync(100));
    await user.type(input, 'o');
    expect(requests).toEqual([]);

    await settle();

    expect(await screen.findByRole('button', { name: 'Tomato soup' })).toBeOnTheScreen();
    expect(requests).toEqual(['tomato']);
  });

  it('never lets an old response replace a newer one', async () => {
    const { requests, handler, release } = suggestionsApi(
      { to: ['Old answer'], tom: ['Tomato soup'] },
      ['to'],
    );
    server.use(handler);
    const user = await renderSearch();
    const input = screen.getByLabelText(fieldLabel);

    await user.type(input, 'to');
    await settle();
    // Pending: the request is at the server, which has not answered yet.
    await waitFor(() => expect(requests).toEqual(['to']));

    await user.type(input, 'm');
    await settle();
    expect(await screen.findByRole('button', { name: 'Tomato soup' })).toBeOnTheScreen();

    await release('to'); // the answer for "to" arrives last

    expect(suggestion('Tomato soup')).toBeOnTheScreen();
    expect(suggestion('Old answer')).not.toBeOnTheScreen();
    expect(requests).toEqual(['to', 'tom']);
  });

  it('keeps the last good suggestions while the next ones load', async () => {
    const { handler, release } = suggestionsApi({ to: ['Tomato soup'], tom: ['Tomatoes'] }, [
      'tom',
    ]);
    server.use(handler);
    const user = await renderSearch();
    const input = screen.getByLabelText(fieldLabel);

    await user.type(input, 'to');
    await settle();
    expect(await screen.findByRole('button', { name: 'Tomato soup' })).toBeOnTheScreen();

    await user.type(input, 'm');
    await settle();
    // "tom" is loading: the list from "to" is still there.
    expect(suggestion('Tomato soup')).toBeOnTheScreen();

    await release('tom');
    expect(await screen.findByRole('button', { name: 'Tomatoes' })).toBeOnTheScreen();
    expect(suggestion('Tomato soup')).not.toBeOnTheScreen();
  });

  it('clears the suggestions at once when the text is cleared, with no request', async () => {
    const { requests, handler } = suggestionsApi({ to: ['Tomato soup'] });
    server.use(handler);
    const user = await renderSearch();

    await user.type(screen.getByLabelText(fieldLabel), 'to');
    await settle();
    expect(await screen.findByRole('button', { name: 'Tomato soup' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Clear the search' }));

    expect(suggestion('Tomato soup')).not.toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(500));
    expect(requests).toEqual(['to']);
  });

  it('keeps the suggestions when the next request fails', async () => {
    server.use(
      api.query(SuggestionsDocument, ({ variables }) =>
        variables.prefix === 'to' ? { suggestions: ['Tomato soup'] } : api.graphqlError('boom'),
      ),
    );
    const user = await renderSearch();
    const input = screen.getByLabelText(fieldLabel);

    await user.type(input, 'to');
    await settle();
    expect(await screen.findByRole('button', { name: 'Tomato soup' })).toBeOnTheScreen();

    await user.type(input, 'm');
    await settle();

    expect(suggestion('Tomato soup')).toBeOnTheScreen();
  });

  it('searches for a suggestion when it is tapped, and for the typed text on the return key', async () => {
    server.use(suggestionsApi({ to: ['Tomato soup'] }).handler);
    const user = await renderSearch();
    const input = screen.getByLabelText(fieldLabel);

    await user.type(input, 'to');
    await settle();
    await user.press(await screen.findByRole('button', { name: 'Tomato soup' }));

    // The route holds the search, and nothing else: no `kind=undefined`.
    expect(screen).toHavePathnameWithParams('/search?q=Tomato+soup');
    expect(input).toHaveDisplayValue('Tomato soup');
    // Submitted: the suggestions are gone.
    expect(suggestion('Tomato soup')).not.toBeOnTheScreen();

    await user.clear(input);
    await user.type(input, 'pasta', { submitEditing: true });
    expect(screen).toHavePathnameWithParams('/search?q=pasta');
  });

  it('shows the text of a link in the field', async () => {
    await renderSearch('/search?q=soup');

    expect(screen.getByLabelText(fieldLabel)).toHaveDisplayValue('soup');
    // No request: the text is already a search, there is nothing to suggest.
    await settle();
  });
});
