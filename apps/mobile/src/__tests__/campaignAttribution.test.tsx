import { act, userEvent } from '@testing-library/react-native';
import { screen } from 'expo-router/testing-library';

import { trackedEvents, testAnalyticsSession } from '@/test/analytics';
import { makeProduct } from '@/test/fixtures';
import { emptyFeed, noSuggestions, searchOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderApp } from '@/test/render';

// The search screen rewrites its params to the canonical form and drops the ones it does not know,
// such as `utm_source` (ADR 0010). The campaign is read from the link by `app/+native-intent.tsx`
// before that (ADR 0011), so it is still on the events after the rewrite.
//
// On a device the router gets the full link (`pantry://search?...`); in Jest it gets the path (see
// deepLinks.test.tsx). `parseCampaign` reads both, see attribution.test.ts.

const LINK =
  '/search?q=pasta&diet=vegan&utm_source=newsletter&utm_campaign=spring&utm_medium=email';

describe('campaign attribution from the link that opened the app', () => {
  beforeEach(() => {
    server.use(emptyFeed(), noSuggestions(), searchOf([makeProduct(1)]));
  });

  it('keeps the campaign of the link after the search drops it from the route', async () => {
    await renderApp(LINK);
    // `renderApp` fakes the timers; the typing below waits for the typeahead debounce on them.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // Read before the screen changed anything.
    expect(testAnalyticsSession().attribution()).toStrictEqual({
      source: 'newsletter',
      medium: 'email',
      campaign: 'spring',
    });
    expect(screen).toHaveSearchParams({
      q: 'pasta',
      diet: 'vegan',
      utm_source: 'newsletter',
      utm_campaign: 'spring',
      utm_medium: 'email',
    });

    // A filter change writes the canonical params: the utm params are gone from the route.
    await user.press(screen.getByRole('button', { name: /^Filters/ }));
    await user.press(screen.getByRole('button', { name: 'Vegetarian' }));
    expect(screen).toHaveSearchParams({ q: 'pasta', diet: 'vegetarian,vegan' });

    // ...and the next event still carries the campaign.
    const field = screen.getByLabelText('Search groceries and recipes');
    await user.clear(field);
    await user.type(field, 'soup', { submitEditing: true });
    await act(() => jest.runOnlyPendingTimersAsync());

    expect(screen).toHaveSearchParams({ q: 'soup', diet: 'vegetarian,vegan' });
    const [submitted, ...rest] = trackedEvents().named('search_submitted');
    expect(rest).toStrictEqual([]);
    expect(submitted).toMatchObject({
      props: { query: 'soup', source: 'field', filterCount: 2 },
      sessionId: testAnalyticsSession().sessionId,
      attribution: { source: 'newsletter', medium: 'email', campaign: 'spring' },
    });
  });

  it('has no attribution when the link had no campaign', async () => {
    await renderApp('/search?q=pasta');

    expect(testAnalyticsSession().attribution()).toBeNull();
  });
});
