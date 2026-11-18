import type { AppStateStatus } from 'react-native';

import { flushOnAppStateChange } from '../flushOnAppStateChange';

function fakeAppState() {
  let listener: ((state: AppStateStatus) => void) | null = null;
  const remove = jest.fn(() => {
    listener = null;
  });
  return {
    appState: {
      addEventListener: (_type: 'change', next: (state: AppStateStatus) => void) => {
        listener = next;
        return { remove };
      },
    },
    emit: (state: AppStateStatus) => listener?.(state),
    remove,
  };
}

describe('flushOnAppStateChange', () => {
  it.each<[AppStateStatus, number]>([
    ['inactive', 1], // iOS: app switcher, Control Center
    ['background', 1], // both platforms
    ['active', 0],
  ])('on %s flushes %i time(s)', (state, times) => {
    const persistor = { flush: jest.fn() };
    const { appState, emit } = fakeAppState();
    flushOnAppStateChange(persistor, appState);

    emit(state);

    expect(persistor.flush).toHaveBeenCalledTimes(times);
  });

  it('flushes on each step of active → inactive → background', () => {
    const persistor = { flush: jest.fn() };
    const { appState, emit } = fakeAppState();
    flushOnAppStateChange(persistor, appState);

    emit('inactive');
    emit('background');

    expect(persistor.flush).toHaveBeenCalledTimes(2);
  });

  it('removes the listener', () => {
    const persistor = { flush: jest.fn() };
    const { appState, emit, remove } = fakeAppState();
    const unsubscribe = flushOnAppStateChange(persistor, appState);

    unsubscribe();
    emit('background');

    expect(remove).toHaveBeenCalled();
    expect(persistor.flush).not.toHaveBeenCalled();
  });
});
