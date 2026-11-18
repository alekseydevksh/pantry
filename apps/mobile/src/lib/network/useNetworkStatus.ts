import { useNetworkState } from 'expo-network';

import { networkStatusOf, type NetworkStatus } from './networkStatus';

/**
 * The network status of the device, kept up to date: a component that uses it re-renders when the
 * device goes offline or comes back. The cart sync (PLAN 3.10) uses it to know when to replay the queue.
 */
export function useNetworkStatus(): NetworkStatus {
  return networkStatusOf(useNetworkState());
}
