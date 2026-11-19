# ADR 0014: Cart UI: the queue projection is the optimistic layer

- Status: Accepted
- Date: 2026-11-19
- Task: [PLAN 3.10](../PLAN.md)

## Context

PLAN 3.10 asks for "Apollo optimistic responses, rollback on error with a toast, queue used when offline, sync on reconnect". [ADR 0013](0013-offline-cart-queue.md) already decided that the cart on screen is the server cart with the queued operations applied by a pure function, and that every write goes through `setCartQty`, online and offline. Two optimistic mechanisms would now exist for one change: the queue projection and an Apollo `optimisticResponse`.

## Decision 1: no `optimisticResponse`; the queue is the optimistic layer

A change is put in the queue first ([useCartActions](../../apps/mobile/src/features/cart/hooks/useCartActions.ts)); the screen reads the queue ([useCart](../../apps/mobile/src/features/cart/hooks/useCart.ts)), so it shows the change in the same render, before any request. The mutation is sent by the replayer and carries no `optimisticResponse`.

- **Rollback is the operation leaving the queue.** A refused operation (`never`) or a given-up one is removed by `settle`, the screen shows the server cart again, and the replayer refetches it (ADR 0013, Decision 4). There is no rollback code to write and none to get wrong.
- **One path.** An Apollo optimistic layer exists only while a request is in flight. It would cover the online case and the queue the offline one, with two ways to show a change and two ways to undo it. Offline, the optimistic layer is gone as soon as the request fails; the projection stays.
- **No flicker on success.** The mutation response is the whole cart; Apollo writes it to the cache before `client.mutate` resolves, and only then does the replayer remove the operation. For that moment the server cart already has the quantity and the queue says the same absolute quantity.

## Decision 2: `CartSync` sends the queue, and lives in the root layout

[CartSync](../../apps/mobile/src/features/cart/components/CartSync.tsx) renders nothing. A change made on the product screen must be sent when the cart tab was never opened, so the replayer cannot belong to the cart screen.

- It replays on every change of the queue, and once when it mounts (what the last session left) and whenever the device comes back online (`replayNow`, which skips the backoffs).
- **Offline, it does not send.** An attempt marks the operation as sent (ADR 0013, Decision 2), which stops it from being merged. Operations made offline stay unsent, so two taps on "+" become one `set`. The test checks that one request is sent after reconnecting.
- A rejected operation is shown as a toast ([lib/toast](../../apps/mobile/src/lib/toast)) and removed from `rejected`, so it is shown once, also when it was refused in the previous session.
- The replayer is started in a microtask. `markSending` notifies the store's subscribers, `CartSync` is one of them and calls `replay()`, so a replayer that starts synchronously runs a second copy of itself inside the first. This was found while wiring this task; see the regression tests in `replayer.test.ts`.

## Decision 3: the cart is loaded where a write can start

The target quantity of an `add` comes from the server cart the device last saw (ADR 0013, Decision 1). So `useCartActions` also runs the cart query, with `cache-first`: the button on the product screen has the cart before the user presses it. A device with nothing cached and no network counts from an empty cart (ADR 0013, "last write wins").

## Decision 4: the catalog does not import the cart

The cart screen shows catalog images, so `cart` imports `catalog` through its `index.ts`. The product screen needs the add-to-cart button, which would make the dependency go both ways. `ProductScreen` takes an `actions` render prop, and the route file ([app/product/[id].tsx](../../apps/mobile/app/product/%5Bid%5D.tsx)) passes the button from the cart feature.

## Alternatives

- **`optimisticResponse` on the mutation, and the queue only for offline.** The usual Apollo way. Rejected because of the two paths above, and because an optimistic response for a `Cart` has to rebuild the whole cart (lines, totals, product fields) by hand.
- **A replayer owned by the cart screen.** Simpler, but nothing is sent while another tab is open.
- **A toast per rejection kept in the queue state.** The queue already has `rejected`; a second list would need its own persistence.

## Consequences

- The product screen and the cart show the same quantity, with the changes that are still waiting for the server (the cart screen says how many).
- `add_to_cart` is tracked when the user acts, not when the server accepts it, so an offline add is a funnel step.
- Tests use `renderWithProviders`, which mounts `CartSync` and `ToastHost` like the root layout does, and a fake cart server (`test/msw/cartServer.ts`) with the real server's idempotency rule.
- The replayer keeps its backoff timer running while the device is offline (at most one attempt a minute). Stopping it would need to start it again later; left for when battery use shows up in profiling.
