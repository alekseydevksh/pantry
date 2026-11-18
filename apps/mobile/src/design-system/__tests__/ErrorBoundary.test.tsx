import { act, render, screen, userEvent } from '@testing-library/react-native';
import { useState, type ReactElement } from 'react';
import { Pressable, Text } from 'react-native';

import { ErrorBoundary } from '../primitives/ErrorBoundary';

/** A child that throws while it renders, as long as `broken.value` is true. */
const broken = { value: true };
function Bomb({ label = 'Content' }: { label?: string }) {
  if (broken.value) throw new Error('boom');
  return <Text>{label}</Text>;
}

const fallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={reset}>
    <Text>{`Failed: ${error.message}`}</Text>
  </Pressable>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    broken.value = true;
    // React prints every caught render error; the tests expect them.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows the fallback instead of crashing when a child throws while rendering', async () => {
    await render(
      <ErrorBoundary fallback={fallback}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Failed: boom')).toBeOnTheScreen();
    expect(screen.queryByText('Content')).not.toBeOnTheScreen();
  });

  it('shows the children when nothing throws', async () => {
    broken.value = false;

    await render(
      <ErrorBoundary fallback={fallback}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  it('tries the children again on reset, and shows them when they work now', async () => {
    const user = userEvent.setup();
    await render(
      <ErrorBoundary fallback={fallback}>
        <Bomb />
      </ErrorBoundary>,
    );
    broken.value = false;

    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Content')).toBeOnTheScreen();
    expect(screen.queryByText(/Failed/)).not.toBeOnTheScreen();
  });

  it('shows the fallback again when the retry fails too', async () => {
    const user = userEvent.setup();
    await render(
      <ErrorBoundary fallback={fallback}>
        <Bomb />
      </ErrorBoundary>,
    );

    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Failed: boom')).toBeOnTheScreen();
  });

  it('mounts the children again on reset, so they do not keep state from before the error', async () => {
    const mounts: string[] = [];
    function Counter() {
      const [initial] = useState(() => {
        mounts.push('mounted');
        return mounts.length;
      });
      if (broken.value) throw new Error('boom');
      return <Text>{`Mount ${initial}`}</Text>;
    }
    const user = userEvent.setup();
    await render(
      <ErrorBoundary fallback={fallback}>
        <Counter />
      </ErrorBoundary>,
    );
    broken.value = false;

    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mounts.length).toBeGreaterThan(1);
    expect(screen.getByText(`Mount ${mounts.length}`)).toBeOnTheScreen();
  });

  it('reports each error once, with the component stack', async () => {
    const onError = jest.fn();

    await render(
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toEqual(new Error('boom'));
    expect(onError.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ componentStack: expect.stringContaining('ErrorBoundary') }),
    );
  });

  it('handles a thrown value that is not an Error', async () => {
    function Thrower(): ReactElement {
      throw 'plain text';
    }

    await render(
      <ErrorBoundary fallback={fallback}>
        <Thrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Failed: plain text')).toBeOnTheScreen();
  });

  it('resets by itself when the reset key changes, for example another item id', async () => {
    function Harness() {
      const [id, setId] = useState('a');
      return (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            onPress={() => setId('b')}
          >
            <Text>Next</Text>
          </Pressable>
          <ErrorBoundary fallback={fallback} resetKey={id}>
            <Bomb label={`Item ${id}`} />
          </ErrorBoundary>
        </>
      );
    }
    const user = userEvent.setup();
    await render(<Harness />);
    expect(screen.getByText('Failed: boom')).toBeOnTheScreen();
    broken.value = false;

    await user.press(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Item b')).toBeOnTheScreen();
  });

  it('keeps the fallback when something else changes', async () => {
    const { rerender } = await render(
      <ErrorBoundary fallback={fallback} resetKey="a">
        <Bomb />
      </ErrorBoundary>,
    );
    broken.value = false;

    await act(async () => {
      rerender(
        <ErrorBoundary fallback={fallback} resetKey="a">
          <Bomb />
        </ErrorBoundary>,
      );
    });

    expect(screen.getByText('Failed: boom')).toBeOnTheScreen();
  });
});
