// Random ids for analytics events, sessions and the mock user: RFC 4122 version 4 UUIDs.
//
// Not a security token: an event id only lets a backend drop a duplicate when a sink retries, and a
// session id only groups events. So no native dependency (expo-crypto) is added for it: the Web
// Crypto API is used where the engine has it, and `Math.random` otherwise (ADR 0011).

type RandomSource = {
  randomUUID?: () => string;
  getRandomValues?: <T extends Uint8Array>(array: T) => T;
};

function randomBytes(source: RandomSource | undefined): Uint8Array {
  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === 'function') return source.getRandomValues(bytes);
  for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

/** A v4 UUID, lowercase, for example `1b4e28ba-2fa1-41d2-883f-0016d3cca427`. */
export function randomId(
  source: RandomSource | undefined = (globalThis as { crypto?: RandomSource }).crypto,
): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();

  const bytes = randomBytes(source);
  // The version (4) and the variant (10xx) bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
