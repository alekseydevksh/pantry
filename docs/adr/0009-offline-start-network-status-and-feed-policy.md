# ADR 0009: Offline start: network status and the feed's fetch policy

- Status: Accepted
- Date: 2026-11-18
- Task: [PLAN 2.9](../PLAN.md)

## Context

The persisted Apollo cache is restored before the first render ([ADR 0007](0007-apollo-cache-pagination-masking-persistence.md)), so the app has data at launch. Two things were still missing: the feed must show that data first and update it when the server answers, and the user must be told when what they see may be out of date.

## Decision 1: the feed uses `cache-and-network`, then `cache-first`

```ts
fetchPolicy: 'cache-and-network',
nextFetchPolicy: 'cache-first',
```

- **`cache-and-network`** returns the cached list at once and sends a request for page one in the background. With no network the request fails, the screen keeps the cached list, and no error screen replaces it.
- **`nextFetchPolicy: 'cache-first'`** is not optional. Without it the query keeps the `cache-and-network` policy, and every cache write (for example a page added by `fetchMore`) starts a new request for page one. That request replaces the list ([pagination.ts](../../apps/mobile/src/lib/apollo/pagination.ts)) and throws away the pages the user scrolled to.
- **The first request counts as "busy".** While it runs, `onEndReached` does not load the next page: a page appended before the answer arrives would be replaced by it.
- **A failed background request is reported on screen** ("Could not refresh") unless the banner already says the device is offline.

**Consequence.** An app opened with five saved pages shows page one after the server answers: the list is a fresh first page, as after a pull-to-refresh. Keeping the pages would need a different merge rule, which is not worth the risk of stale rows.

**Alternatives.** `cache-first` for the feed: the saved list would never update until the user pulls to refresh. `network-only`: no data at launch.

## Decision 2: `expo-network` for the network status

- `expo-network` is versioned with the Expo SDK and reads the OS state. `useNetworkState` returns `isConnected` and `isInternetReachable`.
- `@react-native-community/netinfo` is the common alternative. Its default reachability check makes a request to a third party's server, which this app should not do, and it needs configuration to turn that off.
- **Offline means** not connected, or connected with no internet ([networkStatus.ts](../../apps/mobile/src/lib/network/networkStatus.ts)). The status is `unknown` until the first reading, and the UI treats it as online: a banner that flashes at every launch is worse than one failed request.
- **The OS state is a hint, not a promise.** A connected phone can still have a server that is down, so the banner is a separate message from the failed-request notice, and failed requests are handled whatever the hint says.

## Consequences

- Task 3.10 (offline cart queue) uses `useNetworkStatus` to know when to replay.
- Tests set the network with `setTestNetwork('offline')` ([network.ts](../../apps/mobile/src/test/network.ts)), and the restart is simulated by a new cache that restores from the same MMKV store.
- `expo-network` is a native module: the dev build needs a rebuild.
