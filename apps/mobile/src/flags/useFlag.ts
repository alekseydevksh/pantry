import { useEffect } from 'react';
import { useStore } from 'zustand';

import type { FlagKey, Variant } from './definitions';
import { getFlagsRuntime } from './runtime';

export type UseFlagOptions = {
  /**
   * When the exposure is logged (ADR 0012).
   * - `auto` (default): when the component mounts, and again if the variant changes.
   * - `manual`: only when the caller calls `expose()`, at the point where the variant changes what
   *   the user sees. Use it when the component mounts before that (results that are still loading),
   *   so users who never saw the difference do not dilute the experiment.
   */
  expose?: 'auto' | 'manual';
};

export type ManualFlag<K extends FlagKey> = {
  variant: Variant<K>;
  /** Logs the exposure. Safe to call often: it is logged once per session, flag and variant. */
  expose: () => void;
};

/** The variant of `key`. Re-renders when an override changes it. */
export function useFlag<K extends FlagKey>(key: K, options?: { expose?: 'auto' }): Variant<K>;
export function useFlag<K extends FlagKey>(key: K, options: { expose: 'manual' }): ManualFlag<K>;
export function useFlag<K extends FlagKey>(
  key: K,
  { expose: mode = 'auto' }: UseFlagOptions = {},
): Variant<K> | ManualFlag<K> {
  const { flags, overridesStore } = getFlagsRuntime();
  // Resolved against the store's state, so a change in the debug panel re-renders the component.
  const overrides = useStore(overridesStore, (state) => state.overrides);
  const { variant, source } = flags.peek(key, overrides);

  // In an effect, not during render: a render React throws away must not log an exposure.
  useEffect(() => {
    if (mode === 'auto') flags.expose(key, { variant, source });
  }, [flags, mode, key, variant, source]);

  if (mode === 'manual') return { variant, expose: () => flags.expose(key, { variant, source }) };
  return variant;
}
