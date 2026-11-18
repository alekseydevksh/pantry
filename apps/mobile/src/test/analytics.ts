// Analytics in tests: each test gets a fresh session whose only sink is a memory sink, so a test
// asserts on the events it caused (see setup.ts).
import { getAnalytics, startAnalyticsSession } from '@/analytics';
import { createMemorySink, type MemorySink } from '@/analytics/sinks';

let sink: MemorySink = createMemorySink();
let restore: (() => void) | null = null;

/** Called by setup.ts before each test. */
export function startTestAnalytics(): void {
  restore?.();
  sink = createMemorySink();
  restore = startAnalyticsSession([sink]);
}

/** The events of this test, from the memory sink. Use `.named('search_submitted')` to filter. */
export function trackedEvents(): MemorySink {
  return sink;
}

/** The current analytics session (its `sessionId` and `attribution()`). */
export const testAnalyticsSession = getAnalytics;
