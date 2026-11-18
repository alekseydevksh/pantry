// The built-in sinks. A vendor sink (Segment, Amplitude, our own collector) is Phase 5 and plugs in
// the same way: an object with `send`.
import type { AnalyticsSink, TrackedEvent, TrackedEventOf } from './analytics';
import type { EventName } from './events';

/** Prints each event. The app uses it in development (see ./index.ts). */
export function createConsoleSink(log: (...args: unknown[]) => void = console.info): AnalyticsSink {
  return {
    name: 'console',
    send: (event) =>
      log(`[analytics] ${event.name}`, event.props, { attribution: event.attribution }),
  };
}

export type MemorySink = AnalyticsSink & {
  /** Every event sent so far, oldest first. */
  readonly events: readonly TrackedEvent[];
  /** The events with this name, with their props typed. */
  named<N extends EventName>(name: N): TrackedEventOf<N>[];
  clear(): void;
};

/** Keeps events in memory. Tests read them (see src/test/analytics.ts). */
export function createMemorySink(): MemorySink {
  const events: TrackedEvent[] = [];

  return {
    name: 'memory',
    events,
    send: (event) => {
      events.push(event);
    },
    named: <N extends EventName>(name: N) =>
      events.filter((event): event is TrackedEventOf<N> => event.name === name),
    clear: () => {
      events.length = 0;
    },
  };
}
