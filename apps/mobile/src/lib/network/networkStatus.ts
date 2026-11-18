// What the app does with the device's network state. Pure: no React, no native module.

export type NetworkStatus = 'online' | 'offline' | 'unknown';

/** The part of `expo-network`'s state that the app uses. Both fields are missing until the first reading. */
export type NetworkReading = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

/**
 * `offline` when the device says it has no connection, or is connected to a network with no
 * internet (a Wi-Fi with a login page, a router with no uplink). `unknown` until the first reading:
 * the UI treats it as online, because a banner that flashes on every launch is worse than a request
 * that fails and is reported.
 */
export function networkStatusOf({
  isConnected,
  isInternetReachable,
}: NetworkReading): NetworkStatus {
  if (isConnected === false || isInternetReachable === false) return 'offline';
  if (isConnected === true) return 'online';
  return 'unknown';
}
