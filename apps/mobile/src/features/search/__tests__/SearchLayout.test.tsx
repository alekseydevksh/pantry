import type { ReactNode } from 'react';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { configureFlags, getFlagsRuntime } from '@/flags';
import { SettingsScreen } from '@/features/settings';
import { makeCatalog } from '@/test/fixtures';
import { noSuggestions, searchOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { trackedEvents } from '@/test/analytics';
import { renderWithProviders } from '@/test/render';

import { SearchScreen } from '../components/SearchScreen';

const everyoneGets = (variant: 'list' | 'grid') => ({
  search_layout: {
    weights: { list: variant === 'list' ? 1 : 0, grid: variant === 'grid' ? 1 : 0 },
  },
});

const exposures = () => trackedEvents().named('flag_exposure');
const setOverride = (variant: 'list' | 'grid') =>
  act(() => getFlagsRuntime().overridesStore.getState().setOverride('search_layout', variant));

/** See SearchResults.test.tsx: the router fakes the timers, and a request needs the real ones. */
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
}

let restoreFlags = () => {};
afterEach(() => restoreFlags());

describe('SearchScreen: search_layout', () => {
  beforeEach(() => server.use(noSuggestions(), searchOf(makeCatalog(6))));

  it('shows a list to the list group and logs the exposure when the results render', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('list') });

    await renderSearch('/search?q=pasta');
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();

    expect(screen.queryByTestId('search-grid-cell')).not.toBeOnTheScreen();
    expect(exposures().map((event) => event.props)).toEqual([
      { flag: 'search_layout', variant: 'list', source: 'assignment' },
    ]);
  });

  it('shows a grid to the grid group', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('grid') });

    await renderSearch('/search?q=pasta');

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.getAllByTestId('search-grid-cell').length).toBeGreaterThan(0);
    expect(exposures().map((event) => event.props)).toEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
    ]);
  });

  it('does not log an exposure while the search has no results to show', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('grid') });
    server.use(searchOf([]));

    await renderSearch('/search?q=nothing-matches');

    expect(await screen.findByText(/no results/i)).toBeOnTheScreen();
    expect(exposures()).toHaveLength(0);
  });

  it('switches the layout when an override changes, and logs the new variant once', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('list') });
    await renderSearch('/search?q=pasta');
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByTestId('search-grid-cell')).not.toBeOnTheScreen();

    await setOverride('grid');

    expect(await screen.findAllByTestId('search-grid-cell')).not.toHaveLength(0);
    expect(exposures().map((event) => event.props)).toEqual([
      { flag: 'search_layout', variant: 'list', source: 'assignment' },
      { flag: 'search_layout', variant: 'grid', source: 'override' },
    ]);
  });
});

describe('Settings: flag debug panel', () => {
  it('shows the variant and why, overrides it, and resets it', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('list') });
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    expect(screen.getByText('search_layout')).toBeOnTheScreen();
    expect(screen.getByText('Variant: list (assigned)')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Use grid for search_layout' }));

    expect(screen.getByText('Variant: grid (override)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Use grid for search_layout' })).toBeSelected();
    expect(getFlagsRuntime().overridesStore.getState().overrides).toEqual({
      search_layout: 'grid',
    });

    await user.press(screen.getByRole('button', { name: 'Remove the override of search_layout' }));

    expect(screen.getByText('Variant: list (assigned)')).toBeOnTheScreen();
    expect(getFlagsRuntime().overridesStore.getState().overrides).toEqual({});
  });

  it('does not log an exposure for looking at the panel', async () => {
    restoreFlags = configureFlags({ config: everyoneGets('list') });
    await render(<SettingsScreen />);

    expect(exposures()).toHaveLength(0);
  });
});
