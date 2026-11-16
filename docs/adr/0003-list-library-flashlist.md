# ADR 0003: FlashList v2 for lists

- Status: Accepted
- Date: 2026-11-16

## Context

The home feed and search results show 200+ items with images and cursor pagination. `FlatList` creates and destroys row components as you scroll, which causes blank areas and dropped frames on slower Android devices. The two current alternatives are FlashList v2 (Shopify) and Legend List.

## Decision

Use **FlashList v2** for the feed, search results and the cart.

## Why

- **Recycling.** Rows that leave the screen are reused for new data, so scrolling does not allocate new views.
- **No size estimates.** v2 was rewritten for the New Architecture and measures rows itself. v1 needed `estimatedItemSize`, and wrong values caused jumps.
- **Expo pins a version** for each SDK, so upgrades are tested together.
- **Most common in production apps**, so it is the one most likely to come up at work and in interviews.

## Alternatives

- **Legend List.** Pure TypeScript with no native code, also recycles, and is actively developed. A good choice, especially for chat-style lists. Not picked because FlashList is versioned with Expo and is more widely used. The assistant's message list is short, so it does not need it.
- **`FlatList`.** Fine for short lists. Used only where a list has a handful of rows.

## Consequences

- Recycling means row components keep their local state when reused for another item. Rows must derive everything from props, or reset state by item id. This is a common source of bugs; cover it in code review.
- Row components should be cheap and stable. The React Compiler handles memoization; check with the Profiler in Phase 5.
- All list screens use the same `ListEmptyComponent` / footer patterns, so a later switch to Legend List would be a small change.
