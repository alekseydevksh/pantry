# ADR 0006: AI provider abstraction and routing

- Status: Accepted
- Date: 2026-11-16

## Context

The assistant must work in three situations: with an on-device model, with a cloud model, and with no model at all. LLM output is non-deterministic, can be slow, costs money, and can be wrong. The user should still always get a useful result.

## Decision

### 1. One small interface that we own

```ts
interface AIProvider {
  readonly id: 'on-device' | 'cloud' | 'keyword';
  isAvailable(): Promise<boolean>;
  stream(req: AIRequest, signal: AbortSignal): AsyncIterable<Chunk>;
}

type Chunk =
  | { type: 'text'; delta: string }
  | { type: 'intent'; intent: SearchIntent }
  | { type: 'refusal' }
  | { type: 'usage'; tokens: number }
  | { type: 'done' };
```

Three implementations: `OnDeviceProvider` (Apple Foundation Models, Phase 6), `CloudProvider` (server proxy), `KeywordFallback` (rules, no model).

The Vercel AI SDK is used **inside** the cloud and on-device providers. It does not appear in the interface, the router, the hook or the UI.

### 2. The model returns an intent, never products

The model's only job is to turn a sentence into a structured `SearchIntent` (`query`, `filters`, `servings`, `maxTime`) plus a short text answer. The app validates the intent with Zod and runs the normal GraphQL `search` query. Cards on screen always come from the catalog.

Invalid intent → one retry with a repair prompt → the provider fails and the router moves on.

### 3. A router picks the provider per request

```
order = policy(aiMode, flag, deviceCapability, batterySaver, network)
for provider in order:
  if not available → next
  if no first chunk within the timeout, or error, or invalid output → next
KeywordFallback is always last and cannot fail.
```

The router reports which provider served the request. The UI shows it as a chip ("On-device", "Cloud", "Basic search"), and analytics records it in `ai_request`.

### 4. Safety is enforced in code

Allergen exclusions from the user's message and settings are merged into the search filters by the app after the intent is parsed. The model cannot remove them. The system prompt limits the topic to food and shopping, but the prompt is not the safety mechanism.

### 5. The API key stays on the server

The app calls a proxy route in `server/`. The proxy has `LLM_MODE=mock` (scripted streams, the default, used by tests, CI and E2E) and `LLM_MODE=anthropic` (real model, key and model name from env variables).

## Why our own interface and not the AI SDK's provider type

- `KeywordFallback` is not a language model. With our interface it is just another provider, so the router has no special case.
- The router, the state machine and their tests have no dependency on an SDK that releases major versions often.
- Fake providers for tests (fast, slow, broken, invalid JSON) are a few lines each.
- The interface is small enough to draw on a whiteboard.

## Alternatives

- **Call the AI SDK from the UI directly.** Fastest to build. But fallback, timeouts and the no-model path end up spread across components.
- **Let the model call a `search` tool and return products.** Fewer round trips. But the model could then describe products that the search did not return, and allergen filtering would depend on the model passing the right arguments.
- **Cloud only.** Simpler, but there is no answer offline or when the service is down, and every request costs money.

## Consequences

- Two steps per request (model → intent, then search) add one network call. Accepted: search is fast, and the result is always real.
- If a provider fails after it has already streamed some text, the router starts the next provider and the UI replaces the partial text. The state machine must handle this without mixing two answers ([PLAN 4.3, 4.7](../PLAN.md)).
- The streaming transport between app and proxy is decided in its own ADR after the Phase 4 spike (task 4.1).
- Timeouts, history length and max tokens are flag values, so they can be tuned or used as a kill switch without a release.
