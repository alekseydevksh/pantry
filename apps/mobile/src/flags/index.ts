// The flags module (ADR 0012). Features read flags with `useFlag`.
export { configureFlags, getFlagsRuntime, type FlagsRuntime } from './runtime';
export { useFlag, type ManualFlag, type UseFlagOptions } from './useFlag';
export {
  FLAG_KEYS,
  FLAGS,
  type FlagKey,
  type FlagOverrides,
  type FlagSource,
  type ResolvedFlag,
  type Variant,
} from './definitions';
