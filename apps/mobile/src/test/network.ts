// `expo-network` in Jest. The library is native code, so tests use this mock: the device is online
// until a test calls `setTestNetwork('offline')`. A component that reads the state re-renders when
// it changes, like on a device. `setup.ts` puts it back to online after every test.
import { useSyncExternalStore } from 'react';

type State = { isConnected: boolean; isInternetReachable: boolean };

const ONLINE: State = { isConnected: true, isInternetReachable: true };
const OFFLINE: State = { isConnected: false, isInternetReachable: false };

let state: State = ONLINE;
const listeners = new Set<() => void>();

/** Switch the device's network in a test. Wrap in `act` when a component is mounted. */
export function setTestNetwork(status: 'online' | 'offline') {
  state = status === 'online' ? ONLINE : OFFLINE;
  listeners.forEach((listener) => listener());
}

export function resetTestNetwork() {
  setTestNetwork('online');
}

export const expoNetworkMock = {
  useNetworkState: () =>
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      () => state,
    ),
  getNetworkStateAsync: async () => state,
};
