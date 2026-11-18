import { render, screen, userEvent } from '@testing-library/react-native';

import { Button, type ButtonVariant } from '../index';
import { darkTheme, lightTheme } from '../themes';
import { setTestTheme } from '@/test/unistyles';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];

describe('Button', () => {
  it.each(variants)(
    'renders the %s variant as a button with its title as the label',
    async (variant) => {
      await render(<Button title="Add to cart" variant={variant} onPress={() => {}} />);

      const button = screen.getByRole('button', { name: 'Add to cart' });
      expect(button).toBeOnTheScreen();
      expect(button).toBeEnabled();
    },
  );

  it('uses theme colors per variant', async () => {
    await render(<Button title="Go" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: lightTheme.colors.primary });

    await screen.rerender(<Button title="Go" variant="secondary" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: lightTheme.colors.surface });
  });

  it('follows the dark theme', async () => {
    setTestTheme('dark');
    await render(<Button title="Go" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: darkTheme.colors.primary });
  });

  it('is at least 44 pt tall and wide, and can grow', async () => {
    await render(<Button title="OK" />);
    expect(screen.getByRole('button')).toHaveStyle({
      minHeight: lightTheme.sizes.minTouchTarget,
      minWidth: lightTheme.sizes.minTouchTarget,
    });
  });

  it('calls onPress when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button title="Add" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button title="Add" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Add' });
    await user.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a busy state and ignores presses while loading', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button title="Saving" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Saving' });
    await user.press(button);

    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('lets a custom accessibility label replace the title', async () => {
    await render(<Button title="+" accessibilityLabel="Add one tomato" />);
    expect(screen.getByRole('button', { name: 'Add one tomato' })).toBeOnTheScreen();
  });
});
