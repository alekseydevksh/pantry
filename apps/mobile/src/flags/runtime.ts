// The app's flags instance (ADR 0012): the local JSON provider, the anonymous user of lib/session, the
// persisted overrides, and exposures sent as `flag_exposure` in the current analytics session.
import { getAnalytics, track } from '@/analytics';
import { reportError } from '@/lib/observability';
import { currentUserId } from '@/lib/session';
import { createMemoryStorage, createMMKVStorage, STORAGE_IDS } from '@/lib/storage';

import { createFlags, type Flags } from './flags';
import rolloutConfig from './flags.json';
import { createOverridesStore, type OverridesStore } from './overridesStore';
import { createLocalJsonProvider, type FlagProvider } from './provider';

export type FlagsRuntime = { flags: Flags; overridesStore: OverridesStore; provider: FlagProvider };

function createRuntime(
  provider: FlagProvider,
  userId: () => string,
  overridesStore: OverridesStore,
): FlagsRuntime {
  const flags = createFlags({
    provider,
    userId,
    overrides: () => overridesStore.getState().overrides,
    sessionId: () => getAnalytics().sessionId,
    onExposure: (exposure) => track('flag_exposure', exposure),
    onError: (error, flag) => reportError(error, { source: 'flags', extra: { flag } }),
  });
  return { flags, overridesStore, provider };
}

const reportIssue = ({ flag, message }: { flag: string; message: string }) =>
  reportError(new Error(`Bad flag config: ${message}`), { source: 'flags', extra: { flag } });

let runtime = createRuntime(
  createLocalJsonProvider(rolloutConfig, { onIssue: reportIssue }),
  currentUserId,
  createOverridesStore(createMMKVStorage(STORAGE_IDS.app)),
);

export function getFlagsRuntime(): FlagsRuntime {
  return runtime;
}

/**
 * Replaces the app's flags with ones built from `config` for `userId`, with empty overrides in
 * memory. Returns a function that brings back the previous ones. For tests.
 */
export function configureFlags({
  config = rolloutConfig,
  userId = 'anon-test',
}: { config?: unknown; userId?: string } = {}): () => void {
  const previous = runtime;
  runtime = createRuntime(
    createLocalJsonProvider(config, { onIssue: reportIssue }),
    () => userId,
    createOverridesStore(createMemoryStorage()),
  );
  return () => {
    runtime = previous;
  };
}
