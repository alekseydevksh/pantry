import { render, screen, userEvent } from '@testing-library/react-native';

import { ErrorState } from '../primitives/ErrorState';

describe('ErrorState', () => {
  it('shows what went wrong and what to do, and calls onRetry from the button', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <ErrorState
        title="Could not load"
        message="Check your connection."
        retryLabel="Try again"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Could not load')).toBeOnTheScreen();
    expect(screen.getByText('Check your connection.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('works without a message', async () => {
    await render(<ErrorState title="Could not load" retryLabel="Try again" onRetry={() => {}} />);

    expect(screen.getByText('Could not load')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});
