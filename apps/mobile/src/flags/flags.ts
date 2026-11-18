// Reading flags and logging exposure (ADR 0012). No React: the hook (useFlag.ts) and code outside
// components (the AI router in Phase 4) use the same object.
import type { FlagKey, FlagOverrides, FlagSource, ResolvedFlag } from './definitions';
import { resolveFlag } from './model/resolve';
import type { FlagProvider } from './provider';

export type FlagExposure = { flag: FlagKey; variant: string; source: FlagSource };

export type FlagsOptions = {
  provider: FlagProvider;
  /** The user to assign. A function, so a sign-in can change it (see the ADR for what that does). */
  userId: () => string;
  /** The current local overrides. */
  overrides: () => FlagOverrides;
  /** The current analytics session. Exposure is logged once per session, flag and variant. */
  sessionId: () => string;
  /** Logs one exposure (the app sends `flag_exposure`). */
  onExposure: (exposure: FlagExposure) => void;
  /** The provider threw. The flag uses its default. */
  onError?: (error: unknown, flag: FlagKey) => void;
};

export type Flags = ReturnType<typeof createFlags>;

export function createFlags({
  provider,
  userId,
  overrides,
  sessionId,
  onExposure,
  onError = () => {},
}: FlagsOptions) {
  // The exposures of the current session, as `flag:variant`. A new session starts a new set.
  let exposedSession: string | null = null;
  let exposed = new Set<string>();

  function assigned<K extends FlagKey>(key: K) {
    try {
      return provider.getVariant(key, { userId: userId() });
    } catch (error) {
      onError(error, key);
      return null;
    }
  }

  /**
   * The variant of `key` and why, without logging exposure. Pass `current` overrides to resolve
   * against a snapshot (the hook passes the store's state, so React re-renders on a change).
   */
  function peek<K extends FlagKey>(key: K, current: FlagOverrides = overrides()): ResolvedFlag<K> {
    return resolveFlag(key, { override: current[key], assigned: assigned(key) });
  }

  /**
   * Logs that the user saw `resolved`. Once per session, flag and variant: an override that
   * switches the variant logs the new one once more.
   */
  function expose<K extends FlagKey>(key: K, resolved: ResolvedFlag<K>): void {
    const session = sessionId();
    if (session !== exposedSession) {
      exposedSession = session;
      exposed = new Set();
    }
    const id = `${key}:${resolved.variant}`;
    if (exposed.has(id)) return;
    exposed.add(id);
    onExposure({ flag: key, variant: resolved.variant, source: resolved.source });
  }

  return {
    peek,
    expose,
    /** The variant of `key`, logging exposure. For code outside React that acts on the variant now. */
    get<K extends FlagKey>(key: K): ResolvedFlag<K>['variant'] {
      const resolved = peek(key);
      expose(key, resolved);
      return resolved.variant;
    },
  };
}
