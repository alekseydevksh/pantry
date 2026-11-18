// The analytics layer (ADR 0011): `track()` builds an envelope around the event and hands it to
// every sink. Pure TypeScript, no React, so it works anywhere (the AI router in Phase 4, the Apollo
// links) and is tested without rendering.
import { parseCampaign, type Campaign } from './attribution';
import type { AnalyticsEvents, EventName } from './events';
import { randomId } from './ids';

/**
 * What a sink receives. A union over the event names, so `if (event.name === 'x')` narrows `props`.
 */
export type TrackedEvent = {
  [N in EventName]: {
    name: N;
    props: AnalyticsEvents[N];
    /** Unique per event. A backend drops a second copy with the same id (a sink that retried). */
    eventId: string;
    /** The same for every event of one app session, so events can be joined into a funnel. */
    sessionId: string;
    /** When `track` was called, ISO 8601 in UTC. */
    at: string;
    /** The campaign of the link that opened this session, when it had one. */
    attribution?: Campaign;
  };
}[EventName];

/** The event with name `N`. */
export type TrackedEventOf<N extends EventName> = Extract<TrackedEvent, { name: N }>;

/** Where events go: the console, a test buffer, later an analytics vendor (Phase 5). */
export interface AnalyticsSink {
  readonly name: string;
  /** Must not block. A sink that sends over the network queues and retries on its own. */
  send(event: TrackedEvent): void;
}

export type AnalyticsErrorContext = {
  operation: 'track' | 'captureCampaign';
  event?: EventName;
  /** The sink that threw. */
  sink?: string;
};

export type AnalyticsOptions = {
  sinks?: AnalyticsSink[];
  /** Default: random v4 UUIDs. */
  createId?: () => string;
  /** Default: the system clock. */
  now?: () => Date;
  /** Called when a sink throws. The other sinks still get the event. */
  onError?: (error: unknown, context: AnalyticsErrorContext) => void;
};

export type Analytics = ReturnType<typeof createAnalytics>;

/**
 * One analytics session. The app makes one when it starts (see ./index.ts), so a session is the
 * life of the JS runtime: a cold start begins a new one, coming back from the background does not.
 */
export function createAnalytics({
  sinks = [],
  createId = randomId,
  now = () => new Date(),
  onError = () => {},
}: AnalyticsOptions = {}) {
  const sessionId = createId();
  let attribution: Campaign | null = null;

  return {
    sessionId,

    /** Sends an event to every sink. Never throws: analytics must not break the feature. */
    track<N extends EventName>(name: N, props: AnalyticsEvents[N]): void {
      let event: TrackedEvent;
      try {
        // The cast: TypeScript cannot match a generic `N` to one member of the mapped union.
        event = {
          name,
          props,
          eventId: createId(),
          sessionId,
          at: now().toISOString(),
          ...(attribution ? { attribution: { ...attribution } } : {}),
        } as TrackedEvent;
      } catch (error) {
        onError(error, { operation: 'track', event: name });
        return;
      }
      for (const sink of sinks) {
        try {
          sink.send(event);
        } catch (error) {
          onError(error, { operation: 'track', event: name, sink: sink.name });
        }
      }
    },

    /**
     * Reads the campaign of a link that opened the app. A link with a campaign replaces the
     * current one (last touch); a link without one keeps it. Never throws.
     */
    captureCampaign(url: string): void {
      try {
        const campaign = parseCampaign(url);
        if (campaign) attribution = campaign;
      } catch (error) {
        onError(error, { operation: 'captureCampaign' });
      }
    },

    /** The campaign of this session, or `null`. */
    attribution(): Campaign | null {
      return attribution ? { ...attribution } : null;
    },
  };
}
