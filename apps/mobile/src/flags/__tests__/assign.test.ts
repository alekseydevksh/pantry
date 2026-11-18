import { assignVariant, hash32, type Weights } from '../model/assign';

const fiftyFifty: Weights<'list' | 'grid'> = [
  ['list', 50],
  ['grid', 50],
];

const ids = (count: number, prefix = 'anon-') =>
  Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

/** How often each variant is assigned to `users`, as a share of all users. */
function shares<V extends string>(users: string[], weights: Weights<V>, flagKey = 'search_layout') {
  const counts = new Map<V | null, number>();
  for (const userId of users) {
    const variant = assignVariant({ flagKey, userId, weights });
    counts.set(variant, (counts.get(variant) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].map(([variant, count]) => [variant, count / users.length]));
}

describe('hash32', () => {
  // Golden values: if one changes, every running experiment reshuffles its users. Change them only
  // on purpose, with a new salt for every flag (ADR 0012).
  it.each([
    ['', 2872998923],
    ['a', 444641715],
    ['pantry', 975897325],
    [':search_layout:anon-1', 760274469],
  ])('hash32(%j) is %d', (text, expected) => {
    expect(hash32(text)).toBe(expected);
  });

  it('returns an unsigned 32-bit integer', () => {
    for (const text of ids(1000)) {
      const hash = hash32(text);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });
});

describe('assignVariant: the same user always gets the same variant', () => {
  it('pins the variants of known users (golden values)', () => {
    expect(
      ids(6).map((userId) =>
        assignVariant({ flagKey: 'search_layout', userId, weights: fiftyFifty }),
      ),
    ).toStrictEqual(['list', 'grid', 'list', 'list', 'grid', 'list']);
  });

  it('gives the same answer on every call', () => {
    for (const userId of ids(200)) {
      const first = assignVariant({ flagKey: 'search_layout', userId, weights: fiftyFifty });
      expect(assignVariant({ flagKey: 'search_layout', userId, weights: fiftyFifty })).toBe(first);
    }
  });

  it('can move a user when the salt changes (a new run of the experiment)', () => {
    const users = ids(1000);
    const before = users.map((userId) =>
      assignVariant({ flagKey: 'search_layout', userId, weights: fiftyFifty }),
    );
    const after = users.map((userId) =>
      assignVariant({ flagKey: 'search_layout', userId, salt: 'run-2', weights: fiftyFifty }),
    );

    const moved = before.filter((variant, index) => variant !== after[index]).length;
    // Independent reshuffle: about half the users move.
    expect(moved / users.length).toBeGreaterThan(0.4);
    expect(moved / users.length).toBeLessThan(0.6);
  });
});

describe('assignVariant: the split follows the weights', () => {
  const users = ids(20_000);

  it.each<[string, Weights<'list' | 'grid'>, Record<string, number>]>([
    ['50/50', fiftyFifty, { list: 0.5, grid: 0.5 }],
    [
      '90/10',
      [
        ['list', 90],
        ['grid', 10],
      ],
      { list: 0.9, grid: 0.1 },
    ],
    [
      '1/3 on a 1:2 scale',
      [
        ['list', 1],
        ['grid', 2],
      ],
      { list: 1 / 3, grid: 2 / 3 },
    ],
  ])('%s over 20 000 ids is within 1.5 points', (_case, weights, expected) => {
    const actual = shares(users, weights);

    for (const [variant, share] of Object.entries(expected)) {
      expect(Math.abs((actual[variant] ?? 0) - share)).toBeLessThan(0.015);
    }
  });

  it('spreads ids that are not sequential the same way (UUID-like)', () => {
    const uuids = ids(20_000).map((id) => `anon-${hash32(id).toString(16).padStart(8, '0')}-x`);
    const actual = shares(uuids, fiftyFifty);

    expect(Math.abs((actual.list ?? 0) - 0.5)).toBeLessThan(0.015);
  });

  it('splits three variants by their weights', () => {
    const actual = shares(users, [
      ['a', 1],
      ['b', 1],
      ['c', 2],
    ] as const);

    expect(Math.abs((actual.a ?? 0) - 0.25)).toBeLessThan(0.015);
    expect(Math.abs((actual.b ?? 0) - 0.25)).toBeLessThan(0.015);
    expect(Math.abs((actual.c ?? 0) - 0.5)).toBeLessThan(0.015);
  });

  it('never assigns a variant with weight 0', () => {
    expect(
      shares(ids(5000), [
        ['list', 0],
        ['grid', 3],
      ]),
    ).toStrictEqual({ grid: 1 });
    expect(
      shares(ids(5000), [
        ['list', 3],
        ['grid', 0],
      ]),
    ).toStrictEqual({ list: 1 });
  });

  it('returns null when no variant has a weight', () => {
    expect(
      assignVariant({
        flagKey: 'f',
        userId: 'anon-1',
        weights: [
          ['list', 0],
          ['grid', 0],
        ],
      }),
    ).toBeNull();
    expect(assignVariant({ flagKey: 'f', userId: 'anon-1', weights: [] })).toBeNull();
  });

  it('assigns two flags independently of each other', () => {
    const joint = new Map<string, number>();
    for (const userId of users) {
      const a = assignVariant({ flagKey: 'flag_a', userId, weights: fiftyFifty });
      const b = assignVariant({ flagKey: 'flag_b', userId, weights: fiftyFifty });
      joint.set(`${a}/${b}`, (joint.get(`${a}/${b}`) ?? 0) + 1);
    }

    // Each of the four combinations gets about a quarter of the users.
    expect(joint.size).toBe(4);
    for (const count of joint.values()) {
      expect(Math.abs(count / users.length - 0.25)).toBeLessThan(0.015);
    }
  });
});
