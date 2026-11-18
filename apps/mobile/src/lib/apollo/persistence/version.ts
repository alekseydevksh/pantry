// The version of the persisted cache (ADR 0007, decision 4).
//
// A cache saved by an older app version may not fit the new schema or type policies. When the
// stored version differs from this one, the persistor drops the stored cache instead of restoring it.
//
// The version has two parts:
// - CACHE_FORMAT_VERSION: bump it by hand when the cache shape changes without a schema change,
//   for example a new `keyFields`, a changed merge function or a new type policy.
// - SCHEMA_HASH: FNV-1a hash of `packages/shared/schema.graphql`. The guard test
//   (__tests__/version.test.ts) fails when the schema changes and this hash was not updated, so a
//   schema change always drops old caches.

export const CACHE_FORMAT_VERSION = 1;

/** `fnv1a32(schema.graphql)`. Update it when the guard test says so. */
export const SCHEMA_HASH = '7081a234';

export const CACHE_VERSION = `${CACHE_FORMAT_VERSION}:${SCHEMA_HASH}`;

/**
 * 32-bit FNV-1a hash as 8 hex digits. Small and fast; not for security, only to notice a change.
 * Line endings are normalized, so a checkout with CRLF gives the same hash.
 */
export function fnv1a32(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n');
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Bytes of `text` in UTF-8, which is how MMKV stores a string. `'ż'` is 2 bytes, not 1. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      // A surrogate pair is one code point outside the BMP (an emoji): 4 bytes for two UTF-16 units.
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}
