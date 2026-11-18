import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { SearchResultsDocument, SuggestionsDocument } from '@pantry/shared';

import { trackedEvents } from '@/test/analytics';
import { makeProduct, makeRecipe } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { noSuggestions, pageOf, searchOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';

// The router turns on fake timers, and a request does not finish while time is faked (see
// test/render.tsx). The real timers are back before the screen's first request.
function RealTimers({ children }: { children: ReactNode }) {
  jest.useRealTimers();
  return children;
}

async function renderSearch(url: string) {
  await renderWithProviders(
    <RealTimers>
      <SearchScreen />
    </RealTimers>,
    { route: { pattern: 'search', url } },
  );
  return userEvent.setup();
}

afterEach(() => jest.restoreAllMocks());

const field = () => screen.getByLabelText('Search groceries and recipes');
const events = () => trackedEvents();

/** Every search returns nothing. */
const noResults = () =>
  api.query(SearchResultsDocument, ({ variables }) => ({
    search: { ...pageOf([], variables.first), totalCount: 0 },
  }));

describe('search analytics: search_submitted', () => {
  it('is sent once when the user submits text in the field', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1)]));
    const user = await renderSearch('/search?diet=vegan&sort=price-asc');

    await user.type(field(), '  Pasta ', { submitEditing: true });
    await screen.findByText('Product 1');

    expect(
      events()
        .named('search_submitted')
        .map((event) => event.props),
    ).toStrictEqual([{ query: 'Pasta', source: 'field', filterCount: 1, sort: 'PRICE_ASC' }]);
  });

  it('says the text came from a suggestion', async () => {
    server.use(
      api.query(SuggestionsDocument, () => ({ suggestions: ['Tomato soup'] })),
      searchOf([makeProduct(1)]),
    );
    const user = await renderSearch('/search');

    await user.type(field(), 'tom');
    await user.press(await screen.findByRole('button', { name: 'Tomato soup' }));
    await screen.findByText('Product 1');

    expect(
      events()
        .named('search_submitted')
        .map((event) => event.props),
    ).toStrictEqual([
      { query: 'Tomato soup', source: 'suggestion', filterCount: 0, sort: 'RELEVANCE' },
    ]);
  });

  it('says the text came from a suggested query of the empty state', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1)]));
    const user = await renderSearch('/search');

    await user.press(screen.getByRole('button', { name: 'Search for soup' }));
    await screen.findByText('Product 1');

    expect(
      events()
        .named('search_submitted')
        .map((event) => event.props.source),
    ).toStrictEqual(['empty_state']);
  });

  it('is not sent for a search opened by a link, or a blank submit', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1)]));
    const user = await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    await user.clear(field());
    await user.type(field(), '   ', { submitEditing: true });

    expect(events().named('search_submitted')).toStrictEqual([]);
  });
});

describe('search analytics: search_result_clicked', () => {
  it('is sent once with the 1-based position, the query and the item', async () => {
    server.use(searchOf([makeProduct(1), makeRecipe(2), makeProduct(3)]));
    const user = await renderSearch('/search?q=pasta');
    // After the render: rendering the router sets up `router` again, which would undo the spy.
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});

    await user.press(await screen.findByRole('button', { name: /^Recipe 2,/ }));

    expect(
      events()
        .named('search_result_clicked')
        .map((event) => event.props),
    ).toStrictEqual([{ query: 'pasta', position: 2, itemId: 'r2', itemType: 'recipe' }]);
    // The click is logged and the details still open.
    expect(push).toHaveBeenCalledWith({ pathname: '/recipe/[id]', params: { id: 'r2' } });
  });
});

describe('search analytics: search_zero_results', () => {
  it('is sent once when a search comes back empty, not on later re-renders', async () => {
    server.use(noSuggestions(), noResults());
    const user = await renderSearch('/search?q=xyzzy&diet=vegan');

    await screen.findByRole('header', { name: 'No results for "xyzzy"' });
    // Typing re-renders the screen; the search on the route stays the same.
    await user.type(field(), 'q');

    expect(
      events()
        .named('search_zero_results')
        .map((event) => event.props),
    ).toStrictEqual([{ query: 'xyzzy', filterCount: 1 }]);
  });

  it('is sent again for the next empty search', async () => {
    server.use(noSuggestions(), noResults());
    const user = await renderSearch('/search?q=xyzzy');
    await screen.findByRole('header', { name: 'No results for "xyzzy"' });

    await user.clear(field());
    await user.type(field(), 'plugh', { submitEditing: true });
    await screen.findByRole('header', { name: 'No results for "plugh"' });

    expect(
      events()
        .named('search_zero_results')
        .map((event) => event.props.query),
    ).toStrictEqual(['xyzzy', 'plugh']);
  });

  it('is not sent when the search finds something', async () => {
    server.use(searchOf([makeProduct(1)]));
    await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    expect(events().named('search_zero_results')).toStrictEqual([]);
  });
});

describe('search analytics: the envelope', () => {
  it('gives the events of one session one session id and each its own event id', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1)]));
    const user = await renderSearch('/search');
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});

    await user.type(field(), 'pasta', { submitEditing: true });
    await user.press(await screen.findByRole('button', { name: /^Product 1,/ }));

    const all = events().events;
    expect(all.map((event) => event.name)).toStrictEqual([
      'search_submitted',
      // The results rendered: the user saw the layout of the `search_layout` test (PLAN 3.8).
      'flag_exposure',
      'search_result_clicked',
    ]);
    expect(new Set(all.map((event) => event.sessionId)).size).toBe(1);
    expect(new Set(all.map((event) => event.eventId)).size).toBe(3);
    expect(push).toHaveBeenCalledTimes(1);
  });
});
