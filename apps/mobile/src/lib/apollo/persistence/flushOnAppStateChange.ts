import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import type { CachePersistor } from './cachePersistor';

type AppStateLike = {
  addEventListener(
    type: 'change',
    listener: (state: AppStateStatus) => void,
  ): Pick<NativeEventSubscription, 'remove'>;
};

/**
 * Saves a pending cache write as soon as the app leaves the foreground, because the user may kill it
 * before the debounce runs out.
 * - `inactive`: iOS only, when the app switcher or Control Center opens. A swipe-up kill from the
 *   app switcher may never reach `background`, so this is the last safe moment.
 * - `background`: both platforms. Android goes straight from `active` to `background`.
 *
 * Returns a function that removes the listener.
 */
export function flushOnAppStateChange(
  persistor: Pick<CachePersistor, 'flush'>,
  appState: AppStateLike = AppState,
): () => void {
  const subscription = appState.addEventListener('change', (state) => {
    if (state === 'inactive' || state === 'background') persistor.flush();
  });
  return () => subscription.remove();
}
