// Where assignments come from. The local JSON provider is the only one today; a GrowthBook or
// Statsig adapter (SPEC 7, stretch) implements the same interface (ADR 0012).
import type { FlagKey, Variant } from './definitions';
import { assignVariant } from './model/assign';
import { parseFlagsConfig, type ConfigIssue } from './model/config';

export type FlagContext = {
  /** Stable per user. Today the anonymous id of the install (lib/session). */
  userId: string;
};

export interface FlagProvider {
  readonly name: string;
  /**
   * The variant of `key` for this user, or `null` when the provider has no answer (the flag is off,
   * missing or broken). `null` means "use the default". Synchronous, so a render never waits: a
   * remote provider answers from its last fetched config.
   */
  getVariant<K extends FlagKey>(key: K, context: FlagContext): Variant<K> | null;
}

/** Assigns from a rollout config such as flags.json, by hashing the user id (see model/assign.ts). */
export function createLocalJsonProvider(
  rawConfig: unknown,
  { onIssue }: { onIssue?: (issue: ConfigIssue) => void } = {},
): FlagProvider {
  const config = parseFlagsConfig(rawConfig, onIssue);

  return {
    name: 'local-json',
    getVariant: (key, { userId }) => {
      const rollout = config[key];
      if (!rollout?.enabled) return null;
      return assignVariant({
        flagKey: key,
        userId,
        salt: rollout.salt,
        weights: rollout.weights,
      });
    },
  };
}
