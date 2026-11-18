# ADR 0012: Feature flags: deterministic assignment and exposure at the point of use

- Status: Accepted
- Date: 2026-11-18
- Task: [PLAN 3.7](../PLAN.md)

## Context

SPEC 2 asks for our own small `FlagProvider` interface with a local JSON config, typed flags, and every exposure logged as an analytics event. SPEC 6 needs the first A/B test: `search_layout` = `list` | `grid`, assigned per user, shown in a debug panel (PLAN 3.8). There is no real sign-in (SPEC 1) and the app must work offline.

An A/B test is only as good as two things: users stay in their group, and the exposure log contains the users who actually saw the difference.

## Decision 1: code owns the shape, the config owns the rollout

- [definitions.ts](../../apps/mobile/src/flags/definitions.ts): each flag's variants (a literal union, in a fixed order) and its default. `defineFlag` does not compile when the default is not a variant. `useFlag('search_layout')` returns `'list' | 'grid'`.
- [flags.json](../../apps/mobile/src/flags/flags.json): per flag `enabled` (the kill switch), `weights` (any non-negative integers), and an optional `salt`. It is untrusted input: [config.ts](../../apps/mobile/src/flags/model/config.ts) validates each flag with Zod on its own, so a broken flag falls back to its default and is reported, and never breaks another flag.

## Decision 2: assignment is a hash of salt, flag and user id

`assignVariant` ([assign.ts](../../apps/mobile/src/flags/model/assign.ts)) hashes `salt:flagKey:userId` to 32 bits and maps the hash onto the summed weights.

- **Stable without a server.** The same user gets the same variant on every launch, offline, and on any device with the same id. Nothing has to be stored per flag.
- **The hash:** FNV-1a, then the murmur3 finalizer. FNV-1a alone spreads ids that differ only at the end (`anon-1`, `anon-2`) poorly. Golden values in the tests pin the function, because changing it reshuffles every running experiment.
- **The flag key is in the hash**, so two flags do not split users the same way (tested: each of the four joint groups gets about 25%).
- **The weights follow the definition's variant order**, not the JSON key order, so reformatting the file moves nobody. Changing a weight moves only the users at the boundary.
- **`salt`** reshuffles a flag for a new run of an experiment.
- **The user id** is an anonymous `anon-<uuid>` made on first launch and kept in MMKV ([lib/session](../../apps/mobile/src/lib/session/sessionStore.ts), ADR 0005 "Session").

**Known limitation: the id can change.** When real accounts exist, switching from the anonymous id to an account id changes the hash input, so a user may change buckets at sign-in. Their exposures before and after would then count in two groups. A real rollout would pick one of: keep assigning by the anonymous (device) id for the experiment's lifetime; have the backend store the first assignment and return it after sign-in (sticky bucketing); or alias the two ids in the analytics backend and drop users who switched. Until then, `userId` is passed to `createFlags` as a function, so the change is a decision, not a refactor. The same limitation applies to reinstalling the app, which makes a new anonymous id.

## Decision 3: the resolution order and the provider interface

Order: a local override, then the provider's assignment, then the default ([resolve.ts](../../apps/mobile/src/flags/model/resolve.ts)). Each result carries its `source` (`override`, `assignment`, `default`).

`FlagProvider.getVariant(key, { userId })` is **synchronous** and returns a variant or `null` ("use the default"). A render never waits for flags; a remote provider (GrowthBook or Statsig, SPEC 7) answers from its last fetched config and implements the same interface. A provider that throws gives the default and is reported.

## Decision 4: exposure, at the point of use, once per session, flag and variant

An exposure is a `flag_exposure` analytics event `{ flag, variant, source }` in the current analytics session ([ADR 0011](0011-analytics-layer-and-campaign-attribution.md)).

- **Logged in an effect, not during render.** A render React throws away must not log.
- **`useFlag(key)` (`expose: 'auto'`, the default)** logs on mount. Right for a flag whose variant is visible as soon as the component is.
- **`useFlag(key, { expose: 'manual' })`** returns `{ variant, expose }`, and only `expose()` logs. A screen reads the flag on mount, but the variant may only matter later: the search screen of 3.8 mounts before any results exist, and the list/grid difference is visible only when results render. Logging on mount would count users who opened search and left, who never saw either layout, and dilute the measured effect. So 3.8 calls `expose()` when results render.
- **Deduped per (session, flag, variant).** Many components reading a flag log once. A new analytics session logs again. A variant that changes within a session (an override from the debug panel) logs the new variant once; switching back does not log again. In normal use the variant never changes within a session, so this matches "once per session per flag" and only differs for overrides.
- **`source` lets an analysis leave out** overrides (testers) and defaults (kill switch, broken config).
- **`peek`** resolves without logging, for the debug panel.

## Decision 5: overrides are local, persisted and cleaned

Overrides live in a Zustand store persisted in MMKV ([overridesStore.ts](../../apps/mobile/src/flags/overridesStore.ts)), as ADR 0005 says. Stored overrides of a flag or variant that no longer exists are dropped on load. `useFlag` resolves against the store's state, so a change in the debug panel re-renders every reader. Overrides work in every build because the Settings debug panel (3.8) is part of this demo; a production app would honour them only in internal builds.

## Alternatives

- **GrowthBook or Statsig now.** Dashboards, targeting and stats for free, but a network dependency at startup and a vendor in every call site. An adapter implements `FlagProvider` later (SPEC 7, stretch).
- **Random assignment stored on the device.** Also stable, but every flag needs storage, a reinstall reshuffles anyway, and a server cannot recompute who is in which group.
- **Server-side assignment** (the API returns the variants). The right choice with real accounts and sticky bucketing; needs a request before the first render and does not work on a first launch offline.
- **Exposure on every read.** Simple, but floods analytics and makes a user's count depend on how often a component re-renders.
- **Always expose on mount.** Simpler API, but dilutes experiments whose variant matters only later (see Decision 4).

## Consequences

- A flag is one entry in `definitions.ts` and one in `flags.json`; the compiler checks every `useFlag` call and every override.
- An experiment's exposure log holds the users who saw a variant, with session, campaign and source attached.
- Signing in with a real account may move a user to another bucket until one of the strategies above is picked.
