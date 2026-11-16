import { readConfig } from '../config';
import { createTestClient } from './helpers';

const QUERY = `query { suggestions(prefix: "to") }`;

describe('simulated delay and errors', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers without delay or errors by default (the test configuration)', async () => {
    const { gql } = createTestClient();
    const result = await gql(QUERY);
    expect(result.status).toBe(200);
    expect(result.errors).toBeUndefined();
  });

  it('fails every operation with a 503 and a code when the error rate is 1', async () => {
    const { gql } = createTestClient({ errorRate: 1 });
    const result = await gql(QUERY);
    expect(result.status).toBe(503);
    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      message: 'Simulated server error',
      extensions: { code: 'SIMULATED_ERROR' },
    });
  });

  it('fails only the share of operations given by the error rate', async () => {
    // A fixed sequence instead of real randomness: 0.1 fails (below 0.5), 0.9 passes.
    const sequence = [0.1, 0.9, 0.9, 0.1];
    let call = 0;
    const { gql } = createTestClient({ errorRate: 0.5, random: () => sequence[call++ % sequence.length]! });

    const statuses = [];
    for (let i = 0; i < 4; i += 1) statuses.push((await gql(QUERY)).status);
    expect(statuses).toEqual([503, 200, 200, 503]);
  });

  it('waits for the configured delay before answering', async () => {
    jest.useFakeTimers();
    const { gql } = createTestClient({ delayMs: { min: 100, max: 800 }, random: () => 0.5 });

    let settled = false;
    const pending = gql(QUERY).then((result) => {
      settled = true;
      return result;
    });

    await jest.advanceTimersByTimeAsync(449); // 100 + 0.5 * 700 = 450 ms
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(200);
  });
});

describe('readConfig', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults to a 100–800 ms delay and no errors', () => {
    delete process.env.DELAY_MIN_MS;
    delete process.env.DELAY_MAX_MS;
    delete process.env.ERROR_RATE;
    delete process.env.PORT;
    expect(readConfig()).toEqual({
      port: 4000,
      app: { delayMs: { min: 100, max: 800 }, errorRate: 0, logging: true },
    });
  });

  it('turns the delay off when both limits are 0, and reads the error rate', () => {
    Object.assign(process.env, { DELAY_MIN_MS: '0', DELAY_MAX_MS: '0', ERROR_RATE: '0.2', PORT: '4100' });
    expect(readConfig()).toEqual({ port: 4100, app: { delayMs: null, errorRate: 0.2, logging: true } });
  });

  it('rejects values that make no sense', () => {
    process.env.ERROR_RATE = '2';
    expect(() => readConfig()).toThrow('ERROR_RATE');
    process.env.ERROR_RATE = 'often';
    expect(() => readConfig()).toThrow('ERROR_RATE');
  });
});
