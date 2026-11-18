// Every feature screen is wrapped in a FeatureErrorBoundary (CLAUDE.md: no red screens), and a
// render error inside a real screen shows a retry that works.
import { screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AssistantScreen } from '@/features/assistant';
import { CartScreen } from '@/features/cart';
import { HomeScreen, ProductScreen, RecipeScreen } from '@/features/catalog';
import { SearchScreen } from '@/features/search';
import { SettingsScreen } from '@/features/settings';
import { setErrorReporter, type ErrorContext } from '@/lib/observability';
import { makeCatalog } from '@/test/fixtures';
import { feedOf, productsOf, recipesOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

// The real boundary, wrapped so a test can see which feature asked for one.
const mockFeatures: string[] = [];
jest.mock('@/lib/error-boundary', () => {
  const actual = jest.requireActual('@/lib/error-boundary');
  return {
    FeatureErrorBoundary: (props: { feature: string; children: ReactNode }) => {
      mockFeatures.push(props.feature);
      return actual.FeatureErrorBoundary(props);
    },
  };
});

describe('feature screens', () => {
  beforeEach(() => {
    mockFeatures.length = 0;
    server.use(feedOf([]), recipesOf([]), productsOf([]));
  });

  it.each([
    ['home', <HomeScreen key="home" />],
    ['recipe', <RecipeScreen key="recipe" id="r1" />],
    ['product', <ProductScreen key="product" id="p1" />],
    ['search', <SearchScreen key="search" />],
    ['cart', <CartScreen key="cart" />],
    ['settings', <SettingsScreen key="settings" />],
    ['assistant', <AssistantScreen key="assistant" onClose={() => {}} />],
  ])('%s is wrapped in a feature error boundary', async (feature, screenElement) => {
    await renderWithProviders(screenElement);

    expect(mockFeatures).toContain(feature);
  });
});

describe('a render error in a screen', () => {
  const reports: { error: unknown; context: ErrorContext }[] = [];
  let restoreReporter = () => {};

  beforeEach(() => {
    reports.length = 0;
    restoreReporter = setErrorReporter((error, context) => reports.push({ error, context }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    restoreReporter();
    jest.restoreAllMocks();
  });

  it('shows a retry that brings the feed back, instead of a red screen', async () => {
    server.use(feedOf(makeCatalog(3)));
    // Formatting a price fails, so the first card throws while it renders: a bug in one card.
    // (It keeps failing until the test says otherwise: React renders a failed tree once more
    // before it gives up, so a single failure would be hidden by that second attempt.)
    const format = jest.requireActual('@/lib/i18n/format');
    const realFormatPrice = format.formatPrice;
    let broken = true;
    jest.spyOn(format, 'formatPrice').mockImplementation((...args: unknown[]) => {
      if (broken) throw new Error('bad price');
      return realFormatPrice(...args);
    });
    const user = userEvent.setup();
    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    expect(reports.map((report) => report.context.extra?.feature)).toEqual(['home']);

    broken = false;
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Something went wrong')).not.toBeOnTheScreen();
  });
});
