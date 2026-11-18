// The app's analytics session (ADR 0011). Features call `track()`; the deep link handler calls
// `captureCampaign()`. Both go to one `Analytics` instance, made when this module first loads, so
// one JS runtime is one session.
import { reportError } from '@/lib/observability';

import { createAnalytics, type Analytics, type AnalyticsSink } from './analytics';
import type { AnalyticsEvents, EventName } from './events';
import { createConsoleSink } from './sinks';

function defaultSinks(): AnalyticsSink[] {
  // No sink in a release build until a vendor sink exists (Phase 5). Tests install their own.
  return __DEV__ && process.env.NODE_ENV !== 'test' ? [createConsoleSink()] : [];
}

function create(sinks: AnalyticsSink[]): Analytics {
  return createAnalytics({
    sinks,
    onError: (error, context) => reportError(error, { source: 'analytics', extra: context }),
  });
}

let current: Analytics = create(defaultSinks());

export function track<N extends EventName>(name: N, props: AnalyticsEvents[N]): void {
  current.track(name, props);
}

/** Records the campaign (`utm_*`) of a link that opened the app. Never throws. */
export function captureCampaign(url: string): void {
  current.captureCampaign(url);
}

/** The current session, for reading `sessionId` and `attribution()`. */
export function getAnalytics(): Analytics {
  return current;
}

/**
 * Starts a new session with these sinks, and returns a function that brings back the old one.
 * For tests (src/test/analytics.ts); Phase 5 wires a vendor sink here at startup.
 */
export function startAnalyticsSession(sinks: AnalyticsSink[]): () => void {
  const previous = current;
  current = create(sinks);
  return () => {
    current = previous;
  };
}

export type { Campaign } from './attribution';
export type { AnalyticsSink, TrackedEvent, TrackedEventOf } from './analytics';
export type { AnalyticsEvents, CatalogItemType, EventName, SearchSource } from './events';
