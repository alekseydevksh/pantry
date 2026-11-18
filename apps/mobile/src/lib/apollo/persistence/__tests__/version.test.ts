import {
  CACHE_FORMAT_VERSION,
  CACHE_VERSION,
  fnv1a32,
  SCHEMA_HASH,
  utf8ByteLength,
} from '../version';

// Jest runs on Node, so `fs` and `path` exist here. The app's tsconfig has no Node types on purpose
// (it is a React Native app), so the two functions this test needs are typed by hand.
const { readFileSync } = jest.requireActual<{
  readFileSync(path: string, encoding: 'utf8'): string;
}>('fs');
const { dirname, resolve } = jest.requireActual<{
  dirname(path: string): string;
  resolve(...paths: string[]): string;
}>('path');

/** apps/mobile/src/lib/apollo/persistence/__tests__ → repo root → packages/shared/schema.graphql */
function readSchema(): string {
  const testDir = dirname(expect.getState().testPath ?? '');
  return readFileSync(
    resolve(testDir, '../../../../../../../packages/shared/schema.graphql'),
    'utf8',
  );
}

describe('cache version guard', () => {
  it('matches the current schema', () => {
    const schema = readSchema();
    const actual = fnv1a32(schema);

    if (actual !== SCHEMA_HASH) {
      throw new Error(
        `schema.graphql changed. Set SCHEMA_HASH to '${actual}' in ` +
          'src/lib/apollo/persistence/version.ts. The persisted cache of older app versions ' +
          'is then dropped on the next launch.',
      );
    }
    expect(CACHE_VERSION).toBe(`${CACHE_FORMAT_VERSION}:${actual}`);
  });
});

describe('fnv1a32', () => {
  it('gives 8 hex digits and known values', () => {
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
  });

  it('changes when the text changes', () => {
    expect(fnv1a32('type Query { a: Int }')).not.toBe(fnv1a32('type Query { b: Int }'));
  });

  it('ignores CRLF vs LF line endings', () => {
    expect(fnv1a32('a\r\nb\r\n')).toBe(fnv1a32('a\nb\n'));
  });
});

describe('utf8ByteLength', () => {
  it.each([
    ['', 0],
    ['abc', 3],
    ['ż', 2],
    ['Żółć', 8],
    ['€', 3],
    ['🍅', 4],
    ['a🍅b', 6],
  ])('%p is %i bytes', (text, bytes) => {
    expect(utf8ByteLength(text)).toBe(bytes);
    // The same answer as the platform encoder.
    expect(utf8ByteLength(text)).toBe(new TextEncoder().encode(text).length);
  });
});
