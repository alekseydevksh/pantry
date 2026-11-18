import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { SearchResultsDocument } from '@pantry/shared';

import { makeProduct } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { pageOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';

type Input = { query: string; filters?: unknown; sort?: unknown };

/** The search answers every input with one product, and records the inputs it was asked for. */
function recordedSearch() {
  const inputs: Input[] = [];
  const handler = api.query(SearchResultsDocument, ({ variables }) => {
    inputs.push(variables.input);
    const items = [makeProduct(1)];
    return { search: { ...pageOf(items, variables.first), totalCount: items.length } };
  });
  return { inputs, handler };
}

// The router turns on fake timers, and a request does not finish while time is faked (see
// test/render.tsx). The screen asks for its results as soon as it renders, so the real timers are
// back before that, from inside the first render.
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
  const user = userEvent.setup();
  return user;
}

const openFilters = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole('button', { name: /^Filters/ }));
const chip = (name: string) => screen.getByRole('button', { name });

describe('SearchScreen: filters from the link', () => {
  it('opens with the filters of the link applied, and shows them as selected', async () => {
    const { inputs, handler } = recordedSearch();
    server.use(handler);

    const user = await renderSearch('/search?q=pasta&diet=vegan');

    await screen.findByText('Product 1');
    expect(inputs).toStrictEqual([{ query: 'pasta', filters: { diets: ['VEGAN'] } }]);
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeOnTheScreen();
    await openFilters(user);
    expect(chip('Vegan')).toBeSelected();
    expect(chip('Vegetarian')).not.toBeSelected();
  });

  it('applies every kind of filter and the sort of a link', async () => {
    const { inputs, handler } = recordedSearch();
    server.use(handler);

    await renderSearch(
      '/search?q=pasta&diet=vegan,gluten-free&maxTime=30&maxPriceCents=1000&exclude=nuts&sort=price-asc',
    );

    await screen.findByText('Product 1');
    expect(inputs).toStrictEqual([
      {
        query: 'pasta',
        filters: {
          diets: ['VEGAN', 'GLUTEN_FREE'],
          maxTimeMin: 30,
          maxPriceCents: 1000,
          excludeAllergens: ['NUTS'],
        },
        sort: 'PRICE_ASC',
      },
    ]);
  });

  it('shows a time from a link that is not a chip, so that it can be turned off', async () => {
    server.use(recordedSearch().handler);
    const user = await renderSearch('/search?q=pasta&maxTime=45');
    await screen.findByText('Product 1');
    await openFilters(user);

    expect(chip('Up to 45 min')).toBeSelected();

    await user.press(chip('Up to 45 min'));
    expect(screen).toHaveSearchParams({ q: 'pasta' });
  });

  it('ignores a bad value of a link and keeps the rest', async () => {
    const { inputs, handler } = recordedSearch();
    server.use(handler);

    await renderSearch('/search?q=pasta&diet=vegan,banana&maxTime=abc');

    await screen.findByText('Product 1');
    expect(inputs).toStrictEqual([{ query: 'pasta', filters: { diets: ['VEGAN'] } }]);
  });
});

describe('SearchScreen: chips write the route', () => {
  it('a chip adds its param to the URL, and the search runs with it', async () => {
    const { inputs, handler } = recordedSearch();
    server.use(handler);
    const user = await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');
    await openFilters(user);

    await user.press(chip('Vegan'));
    await user.press(chip('Gluten-free'));
    await user.press(chip('Up to 30 min'));
    await user.press(chip('Up to €10.00'));
    await user.press(chip('No nuts'));
    await user.press(chip('Price: low to high'));

    expect(screen).toHaveSearchParams({
      q: 'pasta',
      diet: 'vegan,gluten-free',
      maxTime: '30',
      maxPriceCents: '1000',
      exclude: 'nuts',
      sort: 'price-asc',
    });
    expect(chip('Gluten-free')).toBeSelected();
    expect(chip('Price: low to high')).toBeSelected();
    expect(chip('Relevance')).not.toBeSelected();
    expect(inputs.at(-1)).toStrictEqual({
      query: 'pasta',
      filters: {
        diets: ['VEGAN', 'GLUTEN_FREE'],
        maxTimeMin: 30,
        maxPriceCents: 1000,
        excludeAllergens: ['NUTS'],
      },
      sort: 'PRICE_ASC',
    });
  });

  it('turning a filter off removes its param: no key stays, not even as "undefined"', async () => {
    server.use(recordedSearch().handler);
    const user = await renderSearch('/search?q=pasta&diet=vegan&sort=price-desc');
    await screen.findByText('Product 1');
    await openFilters(user);

    await user.press(chip('Vegan'));
    expect(screen).toHaveSearchParams({ q: 'pasta', sort: 'price-desc' });

    await user.press(chip('Relevance'));
    expect(screen).toHaveSearchParams({ q: 'pasta' });
    expect(screen).toHavePathnameWithParams('/search?q=pasta');
  });

  it('keeps the text the user submitted when a chip changes', async () => {
    server.use(recordedSearch().handler);
    const user = await renderSearch('/search?q=pasta');
    await screen.findByText('Product 1');
    await openFilters(user);

    await user.press(chip('Vegan'));

    expect(screen.getByLabelText('Search groceries and recipes')).toHaveDisplayValue('pasta');
  });
});

// Why the screen writes its params with `replaceParams`: the day Expo Router's `setParams` removes
// a param set to `undefined`, this test fails, and `useSearchRoute` can go back to `setParams`
// (ADR 0010, amendment).
describe('Expo Router: setParams and undefined', () => {
  it('does not remove a param that is set to undefined', async () => {
    // A blank search, so the screen asks for nothing.
    await renderWithProviders(<SearchScreen />, { route: { pattern: 'search', url: '/search' } });

    await act(async () => router.setParams({ maxTime: undefined }));

    expect(screen).toHavePathnameWithParams('/search?maxTime=undefined');
  });
});
