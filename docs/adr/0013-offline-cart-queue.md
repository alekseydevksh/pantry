# ADR 0013: The offline cart queue

- Status: Accepted
- Date: 2026-11-19
- Task: [PLAN 3.9](../PLAN.md)

## Context

The cart must work offline and sync later (SPEC 1). [ADR 0005](0005-server-state-apollo-client-state-zustand.md) already decided the shape: the queue holds **operations**, persisted in a Zustand store over MMKV, and the cart on screen is the server cart from the Apollo cache with the queued operations applied by a pure function. The server takes an `idempotencyKey` on every cart mutation and applies a key once (server/src/cart.ts).

What can go wrong: a request fails before it reaches the server, fails after the server applied it (the response is lost), the server refuses it for good, or the app is killed during it. Through all of that, an operation must never be applied twice, the queue must survive a restart, and the cart on screen must not jump.

## Decision 1: every operation is an absolute quantity

The user's intent (`add 1`, `remove`, `set 3`) becomes, at enqueue time, the absolute quantity the user wants: what they see (the projection) plus the change. The operation is sent as `setCartQty(productId, qty, key)`. The intent is kept on the operation for messages ("could not add ...").

**Why.** A relative `add` is not idempotent on the client side. If `add 1` is applied on the server, its response is lost, and the cart is then refetched (pull-to-refresh, coming back to the foreground, another mutation's response), the projection applies the still-queued `add 1` on top of a server cart that already has it: the user sees 2 instead of 1 until the queue settles. With `set 2`, applying it once or twice gives the same cart, so the projection over a refreshed server cart equals the projection over the old one. The tests check this at every step of a failing replay.

**Accepted cost: last write wins across devices.** The target is computed from the server cart this device last saw. If another device changes the same line between that read and our write, our `set` overwrites it. The mock has one user on one device; a real multi-device cart would need one of the alternatives below.

**Alternative (b): the server returns the recently applied idempotency keys on `Cart`, and the projection skips queued operations whose key is there.** It keeps relative adds (two devices adding at once both count), but it changes the schema, it only works while the server still remembers the key (its key TTL), and every cart view depends on how fresh that key list is. It is the better design once multi-device carts matter. A server-side merge (send the base quantity with the target, and let the server rebase) is a third option.

All cart writes in the app go through `setCartQty`, online and offline (PLAN 3.10), so both paths send the same thing.

## Decision 2: a sent operation is frozen

Before each attempt, `attempts + 1` is written to storage, **then** the request goes out (write-ahead; MMKV writes are synchronous). An operation with `attempts > 0` may have reached the server, so:

- it is never merged, re-keyed or dropped, except by its own result;
- every retry uses the same key, and the server applies it once;
- after a crash during a request, the restarted app finds it marked as sent and resends it with the same key.

The tests guard this rule: removing the guard from `enqueue` makes three of them fail (checked once by hand while writing them).

## Decision 3: coalescing only touches unsent operations

Because operations are absolute, the unsent operations of one product collapse to the newest target, with the newest key (no unsent key has been used). An operation that would change nothing (its target equals the quantity under it, the server cart plus the sent operations) is not added. So "add, then remove" before anything is sent leaves no operation when the server cart did not have the product, and a single `set 0` when it did.

## Decision 4: replay in order, one at a time, with backoff

[replayer.ts](../../apps/mobile/src/features/cart/model/replayer.ts) sends the first operation, waits for its result, and goes on. A retryable failure blocks the queue (head of line), so operations keep their order.

| Result (classified by the API layer, PLAN 3.10) | What happens |
|---|---|
| success | removed |
| `network` (offline, timeout, HTTP 5xx) | kept, frozen, retried after a backoff; no limit, because offline can last days |
| `unknown` (anything else that may pass) | the same, but given up after 5 such failures (`GAVE_UP`) |
| `never` (`BAD_USER_INPUT`, `NOT_FOUND`) | removed, recorded in `rejected` for a toast, replay goes on |

- **Backoff:** full jitter, a random wait up to `min(60 s, 1 s × 2^(attempt − 1))`, at least 250 ms so a broken server cannot cause a busy loop.
- **`replayNow()`** clears the backoffs and wakes a waiting run; PLAN 3.10 calls it when the network comes back.
- **Single flight:** `replay()` during a run returns that run; operations added during it are sent in it.
- **After a refusal or `GAVE_UP`, the server cart is fetched again** (`refetchCart`). The server may have applied the operation (a request that failed after the change, then an error), and the projection rolls back as soon as the operation leaves the queue, so the screen must show the server's truth, not a guess.

## Decision 5: storage

The queue is a Zustand store persisted under `pantry.cart-queue` in the `app` MMKV instance ([queueStore.ts](../../apps/mobile/src/features/cart/model/queueStore.ts)). On load, Zod drops damaged entries one by one (and a second entry with an already-seen key); losing one queued change is better than losing the queue or crashing at startup.

## Proof

[replayer.test.ts](../../apps/mobile/src/features/cart/__tests__/replayer.test.ts) runs a fake server with the real server's rules against a failure-injection table: offline, 5xx, lost responses, a refusal in the middle, unknown errors until giving up (also when the server did apply it), add-then-remove. Each row checks the final server cart, the rejections, the refetches, and that no key changed the cart more than once. Separate tests cover the lost-response + refetch case (the cart on screen is the same before and after the refetch), the app killed before and after the server applied a request, the backoff timing, `replayNow`, and single flight.

## Known limitations

- **Idempotency keys expire on a real server.** A real service keeps keys for a limited time (a TTL), not forever like the mock. An operation queued longer than that could be applied twice. With absolute quantities a duplicate is harmless on its own, but it could overwrite a later change from another device. The queue should expire operations older than the key TTL and ask the user, or re-read the cart first.
- **Last write wins across devices** (Decision 1).
- **One slow operation blocks the rest.** Per-product parallel replay would be faster, but the order across products is cheap to keep and easy to reason about.

## Alternatives

- **Relative operations with key-aware projection** (option b above), or a server-side merge.
- **Per-product queues replayed in parallel.** Faster after a long offline period; more state and harder failure handling.
- **An Apollo offline link package** (queueing mutations in the link chain). It would queue Apollo operations, not intents, mix the queue into the cache lifecycle (ADR 0005), and hide the projection rules this app wants to test on their own.
