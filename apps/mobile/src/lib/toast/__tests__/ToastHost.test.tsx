import { act, render, screen, userEvent } from '@testing-library/react-native';

import { showToast } from '../toastStore';
import { TOAST_DURATION_MS, ToastHost } from '../ToastHost';

describe('ToastHost', () => {
  beforeEach(() => jest.useFakeTimers());

  it('shows a toast as an alert and removes it after a while', async () => {
    await render(<ToastHost />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();

    await act(() => showToast('Could not add Pasta to your cart.'));

    expect(
      screen.getByRole('alert', { name: 'Could not add Pasta to your cart.' }),
    ).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTimeAsync(TOAST_DURATION_MS));

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('closes on a tap', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<ToastHost />);
    await act(() => showToast('Saved'));

    await user.press(screen.getByRole('alert'));

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('shows the newest toast and gives it the whole time', async () => {
    await render(<ToastHost />);
    await act(() => showToast('First'));
    await act(() => jest.advanceTimersByTimeAsync(TOAST_DURATION_MS - 1000));

    await act(() => showToast('Second'));
    await act(() => jest.advanceTimersByTimeAsync(TOAST_DURATION_MS - 1000));

    expect(screen.queryByText('First')).not.toBeOnTheScreen();
    expect(screen.getByText('Second')).toBeOnTheScreen();
  });
});
