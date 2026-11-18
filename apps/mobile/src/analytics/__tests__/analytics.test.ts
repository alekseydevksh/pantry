import { createAnalytics, type AnalyticsSink, type TrackedEvent } from '../analytics';
import { randomId } from '../ids';
import { createMemorySink } from '../sinks';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const submitted = { query: 'pasta', source: 'field', filterCount: 0, sort: 'RELEVANCE' } as const;

/** Ids `id-1`, `id-2`, ...: the first one is the session id. */
function sequentialIds() {
  let next = 0;
  return () => `id-${++next}`;
}

function setup(options: Parameters<typeof createAnalytics>[0] = {}) {
  const sink = createMemorySink();
  const analytics = createAnalytics({
    sinks: [sink],
    createId: sequentialIds(),
    now: () => new Date('2026-11-18T10:00:00.000Z'),
    ...options,
  });
  return { sink, analytics };
}

describe('createAnalytics: the envelope', () => {
  it('wraps the props with an event id, the session id and the time', () => {
    const { sink, analytics } = setup();

    analytics.track('search_submitted', submitted);

    expect(sink.events).toStrictEqual([
      {
        name: 'search_submitted',
        props: submitted,
        eventId: 'id-2',
        sessionId: 'id-1',
        at: '2026-11-18T10:00:00.000Z',
      },
    ]);
  });

  it('gives every event its own id and all events of a session the same session id', () => {
    const { sink, analytics } = setup({ createId: randomId });

    analytics.track('search_submitted', submitted);
    analytics.track('search_zero_results', { query: 'pasta', filterCount: 0 });
    analytics.track('search_submitted', submitted);

    const eventIds = sink.events.map((event) => event.eventId);
    expect(new Set(eventIds).size).toBe(3);
    expect(new Set(sink.events.map((event) => event.sessionId))).toStrictEqual(
      new Set([analytics.sessionId]),
    );
    for (const id of [...eventIds, analytics.sessionId]) expect(id).toMatch(UUID_V4);
  });

  it('gives a new session a new session id', () => {
    const first = createAnalytics();
    const second = createAnalytics();

    expect(first.sessionId).toMatch(UUID_V4);
    expect(second.sessionId).not.toBe(first.sessionId);
  });

  it('lets a sink narrow the props by the event name', () => {
    const { sink, analytics } = setup();
    analytics.track('search_result_clicked', {
      query: 'pasta',
      position: 2,
      itemId: 'p2',
      itemType: 'product',
    });

    expect(sink.named('search_result_clicked').map((event) => event.props.position)).toStrictEqual([
      2,
    ]);
    expect(sink.named('search_submitted')).toStrictEqual([]);
  });
});

describe('createAnalytics: sinks', () => {
  it('sends each event to every sink, in order', () => {
    const first = createMemorySink();
    const second = createMemorySink();
    const analytics = createAnalytics({ sinks: [first, second] });

    analytics.track('search_submitted', submitted);

    expect(first.events).toHaveLength(1);
    expect(second.events).toStrictEqual(first.events);
  });

  it('keeps going when a sink throws, and reports the error', () => {
    const broken: AnalyticsSink = {
      name: 'broken',
      send: () => {
        throw new Error('sink down');
      },
    };
    const onError = jest.fn();
    const sink = createMemorySink();
    const analytics = createAnalytics({ sinks: [broken, sink], onError });

    expect(() => analytics.track('search_submitted', submitted)).not.toThrow();
    expect(sink.events).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(new Error('sink down'), {
      operation: 'track',
      event: 'search_submitted',
      sink: 'broken',
    });
  });

  it('drops the event and reports when the envelope cannot be built', () => {
    const onError = jest.fn();
    const { sink, analytics } = setup({
      onError,
      now: () => new Date(Number.NaN), // `toISOString` throws for an invalid date
    });

    expect(() => analytics.track('search_submitted', submitted)).not.toThrow();
    expect(sink.events).toStrictEqual([]);
    expect(onError).toHaveBeenCalledWith(expect.any(RangeError), {
      operation: 'track',
      event: 'search_submitted',
    });
  });

  it('works with no sink at all', () => {
    expect(() => createAnalytics().track('search_submitted', submitted)).not.toThrow();
  });
});

describe('createAnalytics: campaign attribution', () => {
  const attributionOf = (events: readonly TrackedEvent[]) =>
    events.map((event) => event.attribution);

  it('has none until a link with a campaign opens the app', () => {
    const { sink, analytics } = setup();

    analytics.track('search_submitted', submitted);

    expect(analytics.attribution()).toBeNull();
    expect(sink.events[0]).not.toHaveProperty('attribution');
  });

  it('attaches the campaign of the link to every later event', () => {
    const { sink, analytics } = setup();

    analytics.captureCampaign('pantry://search?q=pasta&utm_source=newsletter&utm_campaign=spring');
    analytics.track('search_submitted', submitted);
    analytics.track('search_zero_results', { query: 'pasta', filterCount: 0 });

    expect(attributionOf(sink.events)).toStrictEqual([
      { source: 'newsletter', campaign: 'spring' },
      { source: 'newsletter', campaign: 'spring' },
    ]);
  });

  it('keeps the campaign when a later link has none', () => {
    const { sink, analytics } = setup();

    analytics.captureCampaign('/search?utm_source=newsletter');
    analytics.captureCampaign('/recipe/r1');
    analytics.track('search_submitted', submitted);

    expect(attributionOf(sink.events)).toStrictEqual([{ source: 'newsletter' }]);
  });

  it('replaces the campaign when a later link has one (last touch)', () => {
    const { sink, analytics } = setup();

    analytics.captureCampaign('/search?utm_source=newsletter&utm_campaign=spring');
    analytics.track('search_submitted', submitted);
    analytics.captureCampaign('/recipe/r1?utm_source=instagram');
    analytics.track('search_submitted', submitted);

    expect(attributionOf(sink.events)).toStrictEqual([
      { source: 'newsletter', campaign: 'spring' },
      { source: 'instagram' },
    ]);
  });

  it('does not let a sink change the campaign of later events', () => {
    const { sink, analytics } = setup();
    analytics.captureCampaign('/s?utm_source=newsletter');

    analytics.track('search_submitted', submitted);
    const first = sink.events[0];
    if (first?.attribution) first.attribution.source = 'changed';
    analytics.track('search_submitted', submitted);

    expect(sink.events[1]?.attribution).toStrictEqual({ source: 'newsletter' });
    expect(analytics.attribution()).toStrictEqual({ source: 'newsletter' });
  });
});

describe('randomId', () => {
  it('uses randomUUID when the engine has it', () => {
    expect(randomId({ randomUUID: () => 'from-crypto' })).toBe('from-crypto');
  });

  it('builds a v4 UUID from getRandomValues when randomUUID is missing', () => {
    const getRandomValues = <T extends Uint8Array>(bytes: T) => bytes.fill(0xff);

    expect(randomId({ getRandomValues })).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('falls back to Math.random without the Web Crypto API', () => {
    const ids = Array.from({ length: 50 }, () => randomId(undefined));

    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
