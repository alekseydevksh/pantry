import { act, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';
import { setTestNetwork } from '@/test/network';

import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  it('shows nothing while the device is online', async () => {
    await renderWithProviders(<OfflineBanner />);

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.queryByText(/offline/)).not.toBeOnTheScreen();
  });

  it('shows the banner when the device is offline, as a live region a screen reader announces', async () => {
    setTestNetwork('offline');

    await renderWithProviders(<OfflineBanner />);

    expect(screen.getByText('You are offline. What you see may be out of date.')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('appears when the device goes offline, and goes away when it is back', async () => {
    await renderWithProviders(<OfflineBanner />);

    await act(async () => setTestNetwork('offline'));
    expect(screen.getByText(/You are offline/)).toBeOnTheScreen();

    await act(async () => setTestNetwork('online'));
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();
  });

  it('is in Polish when the language is Polish', async () => {
    setTestNetwork('offline');

    await renderWithProviders(<OfflineBanner />, { language: 'pl' });

    expect(
      screen.getByText('Jesteś offline. To, co widzisz, może być nieaktualne.'),
    ).toBeOnTheScreen();
  });
});
