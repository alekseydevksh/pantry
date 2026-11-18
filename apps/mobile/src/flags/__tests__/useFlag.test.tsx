import { act, render, screen, userEvent } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { trackedEvents } from '@/test/analytics';

import { configureFlags, getFlagsRuntime, useFlag } from '../index';

const ALL_GRID = { search_layout: { weights: { list: 0, grid: 1 } } };

const exposures = () => trackedEvents().named('flag_exposure');
const exposureProps = () => exposures().map((event) => event.props);
const setOverride = (variant: 'list' | 'grid') =>
  act(() => getFlagsRuntime().overridesStore.getState().setOverride('search_layout', variant));

let restoreFlags = () => {};
beforeEach(() => {
  restoreFlags = configureFlags({ config: ALL_GRID });
});
afterEach(() => restoreFlags());

/** Shows the variant; `label` only forces a re-render from the outside. */
function AutoLayout({ label }: { label: string }) {
  const layout = useFlag('search_layout');
  return <Text>{`${label}: ${layout}`}</Text>;
}

/**
 * Like the search screen in 3.8: the flag is read on mount, but the variant only matters once the
 * results are shown, and that is when the exposure is logged.
 */
function ManualLayout() {
  const { variant, expose } = useFlag('search_layout', { expose: 'manual' });
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) expose();
  });

  return (
    <>
      <Text>{shown ? `results as ${variant}` : 'loading'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show"
        onPress={() => setShown(true)}
      >
        <Text>Show</Text>
      </Pressable>
    </>
  );
}

describe('useFlag: auto exposure (the default)', () => {
  it('returns the assigned variant and logs the exposure once on mount', async () => {
    const { rerender } = await render(<AutoLayout label="a" />);

    expect(screen.getByText('a: grid')).toBeOnTheScreen();
    await rerender(<AutoLayout label="b" />);
    expect(screen.getByText('b: grid')).toBeOnTheScreen();

    expect(exposureProps()).toStrictEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
    ]);
  });

  it('logs once per session for every component that reads the flag', async () => {
    await render(
      <>
        <AutoLayout label="first" />
        <AutoLayout label="second" />
      </>,
    );

    expect(exposures()).toHaveLength(1);
  });

  it('re-renders with an override, and logs the new variant once', async () => {
    await render(<AutoLayout label="a" />);

    await setOverride('list');
    expect(screen.getByText('a: list')).toBeOnTheScreen();
    await setOverride('grid');
    await setOverride('list');

    expect(exposureProps()).toStrictEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
      { flag: 'search_layout', variant: 'list', source: 'override' },
      // Back to `grid`, now as an override: a new source, but the same variant, so not logged.
    ]);
  });

  it('logs in the analytics session, with its session id', async () => {
    await render(<AutoLayout label="a" />);

    const [exposure] = exposures();
    expect(exposure?.sessionId).toEqual(expect.any(String));
    expect(new Set(trackedEvents().events.map((event) => event.sessionId)).size).toBe(1);
  });

  it('uses the default when the flag is off, and says so', async () => {
    restoreFlags();
    restoreFlags = configureFlags({
      config: { search_layout: { enabled: false, weights: { grid: 1 } } },
    });

    await render(<AutoLayout label="a" />);

    expect(screen.getByText('a: list')).toBeOnTheScreen();
    expect(exposureProps()).toStrictEqual([
      { flag: 'search_layout', variant: 'list', source: 'default' },
    ]);
  });
});

describe('useFlag: manual exposure', () => {
  it('returns the variant at once but logs nothing until the caller exposes it', async () => {
    const user = userEvent.setup();
    await render(<ManualLayout />);

    expect(screen.getByText('loading')).toBeOnTheScreen();
    expect(exposures()).toStrictEqual([]);

    await user.press(screen.getByRole('button', { name: 'Show' }));

    expect(screen.getByText('results as grid')).toBeOnTheScreen();
    expect(exposureProps()).toStrictEqual([
      { flag: 'search_layout', variant: 'grid', source: 'assignment' },
    ]);
  });

  it('logs once however often expose is called', async () => {
    const user = userEvent.setup();
    await render(<ManualLayout />);

    await user.press(screen.getByRole('button', { name: 'Show' }));
    await user.press(screen.getByRole('button', { name: 'Show' }));
    await setOverride('grid');

    expect(exposures()).toHaveLength(1);
  });

  it('logs nothing for a user who never got to see the variant', async () => {
    const { unmount } = await render(<ManualLayout />);
    await setOverride('list');

    await unmount();

    expect(exposures()).toStrictEqual([]);
  });

  it('exposes the new variant after an override switches it', async () => {
    const user = userEvent.setup();
    await render(<ManualLayout />);
    await user.press(screen.getByRole('button', { name: 'Show' }));

    await setOverride('list');

    expect(screen.getByText('results as list')).toBeOnTheScreen();
    expect(exposureProps().map(({ variant, source }) => `${variant}/${source}`)).toStrictEqual([
      'grid/assignment',
      'list/override',
    ]);
  });
});

describe('useFlag: types', () => {
  it('returns the variant union in auto mode and an object in manual mode', () => {
    // Never called: only compiled.
    function useTypeChecks() {
      const auto: 'list' | 'grid' = useFlag('search_layout');
      const manual = useFlag('search_layout', { expose: 'manual' });
      const variant: 'list' | 'grid' = manual.variant;
      // @ts-expect-error Not a flag.
      useFlag('search_grid');
      // @ts-expect-error Auto mode returns the variant, not an object.
      void useFlag('search_layout').expose;
      return [auto, variant];
    }
    expect(useTypeChecks).toBeInstanceOf(Function);
  });
});
