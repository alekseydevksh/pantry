// Jest mock for react-native-mmkv (registered in src/test/setup.ts).
//
// The library has its own test mock, but every `createMMKV()` call there gets a new, empty map, so a
// test cannot "restart the app" by creating the instance again. Here every id has one map that
// lives until the end of the test: a second `createMMKV({ id })` sees the first one's writes, as
// after a restart on a device. `resetTestMMKV()` clears everything after each test.
import type { MMKV } from 'react-native-mmkv';

type Value = string | number | boolean | ArrayBuffer;

const files = new Map<string, Map<string, Value>>();
let failingWrites = 0;

/** The next `count` writes (`set`, `remove`, `clearAll`) throw, as with a full disk. */
export function failNextMMKVWrites(count = 1): void {
  failingWrites = count;
}

export function resetTestMMKV(): void {
  // Empty each map instead of dropping it: an instance created at import time (the app's settings
  // store) keeps its map, and must keep sharing it with instances created later in a test.
  for (const values of files.values()) values.clear();
  failingWrites = 0;
}

function write<T>(operation: () => T): T {
  if (failingWrites > 0) {
    failingWrites -= 1;
    throw new Error('MMKV write failed (test)');
  }
  return operation();
}

function createMMKV(config: { id: string } = { id: 'mmkv.default' }): MMKV {
  const values = files.get(config.id) ?? new Map<string, Value>();
  files.set(config.id, values);

  const typed = <T extends Value>(key: string, type: string): T | undefined => {
    const value = values.get(key);
    return typeof value === type ? (value as T) : undefined;
  };

  const mock = {
    id: config.id,
    get length() {
      return values.size;
    },
    get byteSize() {
      let bytes = 0;
      for (const [key, value] of values) bytes += key.length + String(value).length;
      return bytes;
    },
    get size() {
      return this.byteSize;
    },
    isReadOnly: false,
    isEncrypted: false,
    set: (key: string, value: Value) => write(() => void values.set(key, value)),
    getString: (key: string) => typed<string>(key, 'string'),
    getNumber: (key: string) => typed<number>(key, 'number'),
    getBoolean: (key: string) => typed<boolean>(key, 'boolean'),
    getBuffer: (key: string) => {
      const value = values.get(key);
      return value instanceof ArrayBuffer ? value : undefined;
    },
    contains: (key: string) => values.has(key),
    remove: (key: string) => write(() => values.delete(key)),
    getAllKeys: () => [...values.keys()],
    clearAll: () => write(() => values.clear()),
  };

  // Only the methods the app uses are implemented; the native-only ones (encryption, listeners,
  // trim) are left out on purpose, so the cast is needed.
  return mock as unknown as MMKV;
}

export const mmkvMock = { createMMKV };
