// The rollout config (flags.json today, a remote config later), validated per flag. Pure.
//
// The config comes from outside the code, so it is untrusted: a broken flag falls back to its
// default on its own, and never breaks the other flags or the app.
import { z } from 'zod';

import { FLAGS, isFlagKey, type FlagKey, type Variant } from '../definitions';
import type { Weights } from './assign';

export type FlagRollout<K extends FlagKey> = {
  /** `false` is the kill switch: everyone gets the default. */
  enabled: boolean;
  /** One entry per variant of the definition, in its order. A variant the config left out has 0. */
  weights: Weights<Variant<K>>;
  salt?: string;
};

export type FlagsConfig = { [K in FlagKey]?: FlagRollout<K> };

/** A problem found in the config. The flag it names uses its default (or ignores the bad part). */
export type ConfigIssue = { flag: string; message: string };

const rolloutSchema = z.object({
  enabled: z.boolean().default(true),
  weights: z.record(z.string(), z.number().int().nonnegative()),
  salt: z.string().optional(),
});

function parseRollout<K extends FlagKey>(
  key: K,
  raw: unknown,
  report: (message: string) => void,
): FlagRollout<K> | null {
  const parsed = rolloutSchema.safeParse(raw);
  if (!parsed.success) {
    report(z.prettifyError(parsed.error));
    return null;
  }
  const { enabled, weights, salt } = parsed.data;
  const variants = FLAGS[key].variants as readonly Variant<K>[];
  for (const name of Object.keys(weights)) {
    if (!(variants as readonly string[]).includes(name)) report(`unknown variant "${name}"`);
  }
  return {
    enabled,
    // The definition's order, not the JSON's, so reordering keys in the file moves nobody.
    weights: variants.map((variant) => [variant, weights[variant] ?? 0] as const),
    ...(salt !== undefined ? { salt } : {}),
  };
}

/** The valid part of `raw`. Unknown flags and broken flags are left out and reported. */
export function parseFlagsConfig(
  raw: unknown,
  onIssue: (issue: ConfigIssue) => void = () => {},
): FlagsConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    onIssue({ flag: '*', message: 'the config is not an object' });
    return {};
  }

  const config: Record<string, unknown> = {};
  for (const [flag, value] of Object.entries(raw)) {
    if (!isFlagKey(flag)) {
      onIssue({ flag, message: 'unknown flag' });
      continue;
    }
    const rollout = parseRollout(flag, value, (message) => onIssue({ flag, message }));
    if (rollout) config[flag] = rollout;
  }
  return config as FlagsConfig;
}
