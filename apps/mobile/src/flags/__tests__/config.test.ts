import { parseFlagsConfig, type ConfigIssue } from '../model/config';

function parse(raw: unknown) {
  const issues: ConfigIssue[] = [];
  const config = parseFlagsConfig(raw, (issue) => issues.push(issue));
  return { config, issues };
}

describe('parseFlagsConfig', () => {
  it('reads a valid flag, with the weights in the order of the definition', () => {
    const { config, issues } = parse({
      search_layout: { enabled: true, weights: { grid: 30, list: 70 }, salt: 'run-2' },
    });

    expect(config).toStrictEqual({
      search_layout: {
        enabled: true,
        weights: [
          ['list', 70],
          ['grid', 30],
        ],
        salt: 'run-2',
      },
    });
    expect(issues).toStrictEqual([]);
  });

  it('is on when `enabled` is left out, and gives a missing variant weight 0', () => {
    expect(parse({ search_layout: { weights: { grid: 1 } } }).config).toStrictEqual({
      search_layout: {
        enabled: true,
        weights: [
          ['list', 0],
          ['grid', 1],
        ],
      },
    });
  });

  it('keeps the kill switch', () => {
    expect(
      parse({ search_layout: { enabled: false, weights: { list: 1, grid: 1 } } }).config
        .search_layout?.enabled,
    ).toBe(false);
  });

  it('ignores an unknown variant, and reports it', () => {
    const { config, issues } = parse({
      search_layout: { weights: { list: 1, grid: 1, carousel: 5 } },
    });

    expect(config.search_layout?.weights).toStrictEqual([
      ['list', 1],
      ['grid', 1],
    ]);
    expect(issues).toStrictEqual([
      { flag: 'search_layout', message: 'unknown variant "carousel"' },
    ]);
  });

  it('ignores an unknown flag, and reports it', () => {
    const { config, issues } = parse({ old_flag: { weights: { on: 1 } } });

    expect(config).toStrictEqual({});
    expect(issues).toStrictEqual([{ flag: 'old_flag', message: 'unknown flag' }]);
  });

  it.each<[string, unknown]>([
    ['no weights', {}],
    ['weights that are not an object', { weights: [50, 50] }],
    ['a negative weight', { weights: { list: -1, grid: 2 } }],
    ['a fractional weight', { weights: { list: 0.5, grid: 0.5 } }],
    ['a weight that is a string', { weights: { list: '50', grid: 50 } }],
    ['an infinite weight', { weights: { list: Infinity, grid: 1 } }],
    ['`enabled` that is not a boolean', { enabled: 'yes', weights: { list: 1 } }],
    ['a salt that is not a string', { salt: 2, weights: { list: 1 } }],
    ['null', null],
    ['a string', 'on'],
  ])('drops a flag with %s and reports it', (_case, rollout) => {
    const { config, issues } = parse({ search_layout: rollout });

    expect(config).toStrictEqual({});
    expect(issues).toHaveLength(1);
    expect(issues[0]?.flag).toBe('search_layout');
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['an array', []],
    ['a number', 42],
  ])('returns no flags for a config that is %s', (_case, raw) => {
    const { config, issues } = parse(raw);

    expect(config).toStrictEqual({});
    expect(issues).toStrictEqual([{ flag: '*', message: 'the config is not an object' }]);
  });
});
