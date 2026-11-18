import type { ReactNode } from 'react';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import { SearchResultsDocument } from '@pantry/shared';

import { makeCatalog, makeProduct, type CatalogFixture } from '@/test/fixtures';
import { scrollListTo } from '@/test/flashlist-events';
import { api } from '@/test/msw/api';
import { noSuggestions, pageOf, searchOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';
import { SEARCH_PAGE_SIZE } from '../model/results';

type Request = { query: string; after?: string | null };

/** `search` serves `items`, page by page, and records every request. */
function recordedSearch(items: CatalogFixture[], hold?: (request: Request) => Promise<void>) {
  const requests: Request[] = [];
  const handler = api.query(SearchResultsDocument, async ({ variables }) => {
    const request = { query: variables.input.query, after: variables.after };
    requests.push(request);
    await hold?.(request);
    return {
      search: { ...pageOf(items, variables.first, variables.after), totalCount: items.length },
    };
  });
  return { requests, handler };
}

/**
 * The router turns on fake timers, and a request does not finish while time is faked (see
 * test/render.tsx). The screen asks for its results as soon as it renders, so the real timers are
 * back before that, from inside the first render.
 */
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

const scrollNearEnd = (loadedRows: number) =>
  scrollListTo('search-list', loadedRows - 5, loadedRows);

describe('SearchScreen: results', () => {
  it('shows the results of the search in the link, and the number of them', async () => {
    const { requests, handler } = recordedSearch(makeCatalog(60));
    server.use(handler);

    await renderSearch('/search?q=pasta');

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('Recipe 3')).toBeOnTheScreen();
    expect(screen.getByText('60 results')).toBeOnTheScreen();
    // One page only, until the user scrolls.
    expect(requests).toEqual([{ query: 'pasta', after: undefined }]);
    expect(screen.queryByText('Product 22')).not.toBeOnTheScreen();
  });

  it('searches when the text is submitted', async () => {
    server.use(noSuggestions(), searchOf([makeProduct(1), makeProduct(2)]));
    const user = await renderSearch('/search');
    // A blank search asks for nothing.
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Search groceries and recipes'), 'pasta', {
      submitEditing: true,
    });

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('2 results')).toBeOnTheScreen();
    expect(screen).toHavePathnameWithParams('/search?q=pasta');
  });

  it('shows placeholders while the first page loads', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(recordedSearch([makeProduct(1)], () => gate).handler);

    await renderSearch('/search?q=pasta');

    expect(screen.getByRole('progressbar', { name: 'Loading the results' })).toBeOnTheScreen();
    release();
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('describes each result to a screen reader like the cards of the feed', async () => {
    server.use(searchOf([makeProduct(1, { unit: '1 kg', priceCents: 249 })]));

    await renderSearch('/search?q=pasta');

    expect(
      await screen.findByRole('button', { name: 'Product 1, product, 1 kg, €2.49' }),
    ).toBeOnTheScreen();
  });
});

describe('SearchScreen: more pages', () => {
  it('loads the next page near the end, and adds it to the list', async () => {
    const { requests, handler } = recordedSearch(makeCatalog(60));
    server.use(handler);
    await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    await scrollNearEnd(SEARCH_PAGE_SIZE);
    await waitFor(() => expect(requests).toHaveLength(2));

    expect(requests[1]).toEqual({ query: 'pasta', after: 'cursor-19' });
    await scrollListTo('search-list', 27, 2 * SEARCH_PAGE_SIZE);
    expect(await screen.findByText('Product 29')).toBeOnTheScreen();
  });

  it('asks for one page at a time, however often the list reports the end', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { requests, handler } = recordedSearch(makeCatalog(60), async (request) => {
      if (request.after) await gate;
    });
    server.use(handler);
    await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    await scrollNearEnd(SEARCH_PAGE_SIZE);
    await scrollNearEnd(SEARCH_PAGE_SIZE);
    await scrollNearEnd(SEARCH_PAGE_SIZE);
    expect(screen.getByLabelText('Loading more…')).toBeOnTheScreen();
    release();
    await waitFor(() => expect(screen.queryByLabelText('Loading more…')).not.toBeOnTheScreen());

    expect(requests.filter((request) => request.after)).toHaveLength(1);
  });

  it('stops asking after the last page', async () => {
    const { requests, handler } = recordedSearch(makeCatalog(25));
    server.use(handler);
    await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    await scrollNearEnd(SEARCH_PAGE_SIZE);
    await waitFor(() => expect(requests).toHaveLength(2));
    await scrollNearEnd(25);

    expect(await screen.findByText('That is everything.')).toBeOnTheScreen();
    expect(requests).toHaveLength(2);
  });

  it('shows a retry in the footer when a page fails, and keeps the rows it has', async () => {
    const items = makeCatalog(60);
    server.use(
      api.query(SearchResultsDocument, ({ variables, callCount }) =>
        // The first request works. The next three are the attempts of the second request (the retry
        // link tries three times). The fifth, after the retry button, works.
        callCount >= 2 && callCount <= 4
          ? api.networkError()
          : {
              search: {
                ...pageOf(items, variables.first, variables.after),
                totalCount: items.length,
              },
            },
      ),
    );
    await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');

    await scrollNearEnd(SEARCH_PAGE_SIZE);
    expect(await screen.findByText('Could not load more items.')).toBeOnTheScreen();
    expect(screen.getByText('Recipe 18')).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(screen.queryByText('Could not load more items.')).not.toBeOnTheScreen(),
    );
  });
});

describe('SearchScreen: a new search', () => {
  it('keeps the previous results on screen while the new ones load', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      noSuggestions(),
      api.query(SearchResultsDocument, async ({ variables }) => {
        const soup = variables.input.query === 'soup';
        if (soup) await gate;
        const items = soup ? [makeProduct(7)] : [makeProduct(1)];
        return { search: { ...pageOf(items, variables.first), totalCount: items.length } };
      }),
    );
    const user = await renderSearch('/search?q=pasta');
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();

    const input = screen.getByLabelText('Search groceries and recipes');
    await user.clear(input);
    await user.type(input, 'soup', { submitEditing: true });

    // "soup" is loading: no empty list, no placeholders, the rows of "pasta" are still there.
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(screen).toHavePathnameWithParams('/search?q=soup');

    await act(async () => release());

    expect(await screen.findByText('Product 7')).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
  });
});

describe('SearchScreen: pull to refresh', () => {
  it('asks for the first page again and replaces the list', async () => {
    let version = 1;
    server.use(
      api.query(SearchResultsDocument, ({ variables }) => {
        const items = [makeProduct(version)];
        return { search: { ...pageOf(items, variables.first), totalCount: items.length } };
      }),
    );
    await renderSearch('/search?q=pasta');
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();

    version = 2;
    const { refreshControl } = screen.getByTestId('search-list').props;
    await act(async () => {
      refreshControl.props.onRefresh();
    });

    expect(await screen.findByText('Product 2')).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
  });
});
