import { randomId } from '../ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
