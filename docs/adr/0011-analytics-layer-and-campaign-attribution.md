# ADR 0011: The analytics layer and campaign attribution

- Status: Accepted
- Date: 2026-11-18
- Task: [PLAN 3.6](../PLAN.md)

## Context

SPEC 2 asks for our own typed `track(event)` layer with a console sink, and SPEC 6 for three search events. Later phases add more: `ai_request` (Phase 4), flag exposures (PLAN 3.7), add to cart (PLAN 3.10). A vendor SDK (Segment, Amplitude) is not part of the MVP, but the layer must be ready for one.

Two needs come from how the data is used:

- **Dedupe.** A real sink sends over the network and retries. A retry after a lost response sends the same event twice.
- **Funnels.** Search → click → add to cart is only a funnel if the three events can be joined.

And one from the router: the search screen writes its params with `replaceParams` in the canonical form ([ADR 0010](0010-search-url-params-and-canonical-search-input.md)), which drops params it does not know. A campaign link `pantry://search?q=pasta&utm_source=newsletter` loses `utm_source` on the first filter change.

## Decision 1: a typed event map, one `track`, pluggable sinks

[events.ts](../../apps/mobile/src/analytics/events.ts) is a type map from the event name to its props. `track<N>(name: N, props: AnalyticsEvents[N])` does not compile for an unknown name, a missing prop, a wrong type or another event's props ([events.types.test.ts](../../apps/mobile/src/analytics/__tests__/events.types.test.ts) holds `@ts-expect-error` cases that `pnpm typecheck` checks).

`track` wraps the props in an envelope and gives it to every sink:

| Field | Value | Why |
|---|---|---|
| `name`, `props` | from the call | |
| `eventId` | a v4 UUID, new per event | The backend drops a second event with the same id, so a sink can retry safely. |
| `sessionId` | a v4 UUID, one per app session | Joins search, click and add to cart into a funnel. |
| `at` | ISO 8601, UTC | Set when `track` is called, not when a sink sends, so a queued event keeps its real time. |
| `attribution` | the campaign of the session, if any | See Decision 2. |

- **`TrackedEvent` is a union over the names**, so a sink narrows `props` with `event.name === 'x'`.
- **`track` never throws.** A sink that throws is reported to `lib/observability` and the other sinks still get the event. Analytics must not break a feature.
- **Sinks:** the console in development, none in a release build until Phase 5, a memory sink in tests. `setup.ts` starts a new session with a memory sink before each test, and tests read it with `trackedEvents().named('search_submitted')`.
- **No runtime validation of the props.** The app is the only producer and the types already check every call. Zod is for data from outside (links, the model, storage).
- **Search event rules** are in [searchEvents.ts](../../apps/mobile/src/features/search/model/searchEvents.ts) (pure, unit-tested): `search_submitted` is sent when the user submits text (field, suggestion, suggested query), not for a search opened by a link and not for a blank search. `position` is 1-based. `search_zero_results` is sent once per search shown, not again on a refresh or a re-render.

**What a session is.** One JS runtime: the app makes the session when the analytics module loads. A cold start begins a new one; coming back from the background does not. An inactivity timeout (a new session after 30 minutes in the background, like web analytics) needs `AppState` and is left for when a real backend defines sessions. The session id is not persisted.

**The ids.** `crypto.randomUUID` where the engine has it, then `crypto.getRandomValues`, then `Math.random` ([ids.ts](../../apps/mobile/src/lib/ids.ts)). The ids are not secrets (they only dedupe and group), so no native module (`expo-crypto`) and no new dev build are needed for them. The `Math.random` fallback is not cryptographic and can be predicted, which does not matter for an id that only dedupes; collisions stay unlikely at app scale.

**Personal data.** The search text is free text, so it can hold anything a user types. It is cut to 100 code points (ADR 0010) and sent, because search analytics are useless without the query. A real deployment would add a scrubbing step in the vendor sink (emails, phone numbers) and honour an analytics opt-out before any sink runs.

## Decision 2: capture `utm_*` in `+native-intent`, before the route exists

Expo Router calls `redirectSystemPath({ path, initial })` from [app/+native-intent.tsx](../../apps/mobile/app/+native-intent.tsx) for every link that opens the app: the initial URL on a cold start (`initial: true`), and links that arrive while it runs. It runs **before** the link becomes route state (checked in `expo-router/build/getLinkingConfig.js`). Ours records the campaign and returns the path unchanged.

- [parseCampaign](../../apps/mobile/src/analytics/attribution.ts) reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` from a full link or a path. It splits the query string itself, because React Native's `URL` does not parse custom schemes. It is lenient like the search params: any key case, the first of a repeated key, trimmed values, empty values and bad `%` escapes skipped, values cut to 100 code points. It never throws, and `captureCampaign` catches anything else, so a bug here cannot block navigation.
- **Session attribution, last touch.** The campaign is kept in memory and copied onto every later event as `attribution`. A new link with a campaign replaces it; a link without one keeps it (a plain `pantry://recipe/r1` from a share is not a new campaign).
- The route still drops `utm_*` on its first rewrite, as ADR 0010 decided. The campaign is analytics data, not search state.

Proof: [campaignAttribution.test.tsx](../../apps/mobile/src/__tests__/campaignAttribution.test.tsx) opens the real routes on a link with `utm_*`, changes a filter, checks that the route lost the utm params, submits a search, and checks that the event still carries the campaign. Without `+native-intent.tsx` it fails.

## Alternatives

- **A vendor SDK now** (Segment, Amplitude, PostHog). It gives dashboards, but ties every call site to its API and adds a native dependency. A vendor becomes a sink in Phase 5 without touching the features.
- **`Linking.getInitialURL()` and a `url` listener in the root layout.** They give the same URL, but run in an effect after the first render, so the order against the screen's first param write depends on timing. `+native-intent` runs before routing by design.
- **Keep `utm_*` in the search route** (merge unknown params in `setInput`). Every search link the user shares would then carry the campaign of the link they came from, and the canonical URL of ADR 0010 would be lost.
- **Persist the attribution across launches.** That turns "this session came from a campaign" into "this user once came from a campaign", which is a user property a backend should own.
- **A server-made session id.** More correct across devices, but needs a request before the first event and does not work offline. A client id is enough to join one session's events.

## Consequences

- Every new event starts in `events.ts`; the compiler checks every call.
- Each event can be deduped by `eventId` and joined by `sessionId`; PLAN 3.10's add to cart lands in the same funnel without extra work.
- Flag exposures (PLAN 3.7) go through the same `track`, so they carry the same session and campaign.
- The campaign survives the canonical rewrite of the search route, and any other route that rewrites its params later.
