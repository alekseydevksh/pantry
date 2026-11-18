import { act, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SearchResultsDocument } from '@pantry/shared';

import { makeProduct } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { noSuggestions, pageOf, searchOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { setTestNetwork } from '@/test/network';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';

// The router turns on fake timers, and a request does not finish while time is faked (see
// test/render.tsx). The screen asks for its results as soon as it renders, so the real timers are
// back before that, from inside the first render.
function RealTimers({ children }: { children: ReactNode }) {
  jest.useRealTimers();
  return children;
}

async function renderSearch(url: string, language?: 'pl') {
  await renderWithProviders(
    <RealTimers>
      <SearchScreen />
    </RealTimers>,
    { route: { pattern: 'search', url }, language },
  );
  return userEvent.setup();
}

const noResults = () =>
  api.query(SearchResultsDocument, ({ variables }) => ({
    search: { ...pageOf([], variables.first), totalCount: 0 },
  }));

describe('SearchScreen: nothing searched yet', () => {
  it('prompts, offers searches to try, and asks the server for nothing', async () => {
    // No handler for `search`: a request would fail the test.
    await renderSearch('/search');

    expect(screen.getByRole('header', { name: 'Find groceries and recipes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Search for pasta' })).toBeOnTheScreen();
  });

  it('searches for a suggested query when it is tapped', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1)]));
    const user = await renderSearch('/search');

    await user.press(screen.getByRole('button', { name: 'Search for soup' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen).toHaveSearchParams({ q: 'soup' });
    expect(screen.getByLabelText('Search groceries and recipes')).toHaveDisplayValue('soup');
  });
});

describe('SearchScreen: no results', () => {
  it('says what was searched for, why it may have failed, and offers searches to try', async () => {
    server.use(noResults());

    await renderSearch('/search?q=xyzzy');

    expect(await screen.findByRole('header', { name: 'No results for "xyzzy"' })).toBeOnTheScreen();
    expect(
      screen.getByText('Check the spelling, or try a shorter or different word.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Search for pasta' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeOnTheScreen();
    expect(screen.queryByText(/results$/)).not.toBeOnTheScreen();
  });

  it('with filters on, offers to clear them, and clearing searches again without them', async () => {
    const inputs: unknown[] = [];
    server.use(
      api.query(SearchResultsDocument, ({ variables }) => {
        inputs.push(variables.input);
        const items = variables.input.filters ? [] : [makeProduct(1)];
        return { search: { ...pageOf(items, variables.first), totalCount: items.length } };
      }),
    );
    const user = await renderSearch('/search?q=pasta&diet=vegan&sort=price-asc');

    expect(
      await screen.findByText('Nothing matches all of these filters. Try removing some.'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    // The text and the sort stay.
    expect(screen).toHaveSearchParams({ q: 'pasta', sort: 'price-asc' });
    expect(inputs.at(-1)).toStrictEqual({ query: 'pasta', sort: 'PRICE_ASC' });
  });

  it('explains a link that asks for products with a cooking time', async () => {
    server.use(noResults());

    await renderSearch('/search?kind=product&maxTime=30');

    expect(await screen.findByRole('header', { name: 'No results' })).toBeOnTheScreen();
    expect(screen.getByText(/Products have no cooking time/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeOnTheScreen();
  });

  it('speaks Polish', async () => {
    server.use(noResults());

    await renderSearch('/search?q=xyzzy', 'pl');

    expect(
      await screen.findByRole('header', { name: 'Brak wyników dla „xyzzy”' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Szukaj: pasta' })).toBeOnTheScreen();
  });
});

describe('SearchScreen: server error', () => {
  it('shows an inline error with a retry, and the retry loads the results', async () => {
    server.use(
      api.query(SearchResultsDocument, ({ variables, callCount }) =>
        callCount === 1
          ? api.graphqlError('boom')
          : { search: { ...pageOf([makeProduct(1)], variables.first), totalCount: 1 } },
      ),
    );
    const user = await renderSearch('/search?q=pasta');

    expect(await screen.findByText('Could not load the results')).toBeOnTheScreen();
    // The field is still there, so the user can change the search instead.
    expect(screen.getByLabelText('Search groceries and recipes')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Could not load the results')).not.toBeOnTheScreen();
  });

  it('shows the same error when the server is down, after the retries', async () => {
    server.use(api.query(SearchResultsDocument, () => api.httpError(503)));

    await renderSearch('/search?q=pasta');

    expect(await screen.findByText('Could not load the results')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });

  it('does not show the rows of the previous search under a search that failed', async () => {
    server.use(
      noSuggestions(),
      api.query(SearchResultsDocument, ({ variables }) =>
        variables.input.query === 'soup'
          ? api.graphqlError('boom')
          : { search: { ...pageOf([makeProduct(1)], variables.first), totalCount: 1 } },
      ),
    );
    const user = await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    const input = screen.getByLabelText('Search groceries and recipes');
    await user.clear(input);
    await user.type(input, 'soup', { submitEditing: true });

    expect(await screen.findByText('Could not load the results')).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
  });
});

describe('SearchScreen: offline', () => {
  it('shows the offline banner when the device is offline, and hides it when it is back', async () => {
    await renderSearch('/search');
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();

    await act(async () => setTestNetwork('offline'));
    expect(screen.getByText('You are offline. What you see may be out of date.')).toBeOnTheScreen();

    await act(async () => setTestNetwork('online'));
    expect(
      screen.queryByText('You are offline. What you see may be out of date.'),
    ).not.toBeOnTheScreen();
  });
});
