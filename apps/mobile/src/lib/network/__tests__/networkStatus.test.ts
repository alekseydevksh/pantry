import { networkStatusOf } from '../networkStatus';

describe('networkStatusOf', () => {
  it.each([
    [
      'connected, and the internet is reachable',
      { isConnected: true, isInternetReachable: true },
      'online',
    ],
    ['connected, reachability not known yet', { isConnected: true }, 'online'],
    ['not connected', { isConnected: false, isInternetReachable: false }, 'offline'],
    ['not connected, reachability not known', { isConnected: false }, 'offline'],
    // A Wi-Fi with a login page, or a router with no uplink: connected, but nothing gets through.
    [
      'connected, but the internet is not reachable',
      { isConnected: true, isInternetReachable: false },
      'offline',
    ],
    [
      'reachable, but not connected (a contradiction: believe "not connected")',
      { isConnected: false, isInternetReachable: true },
      'offline',
    ],
    // Before the first reading. Treated as online by the UI, so no banner flashes at launch.
    ['no reading yet', {}, 'unknown'],
  ] as const)('is %s', (_name, reading, expected) => {
    expect(networkStatusOf(reading)).toBe(expected);
  });
});
