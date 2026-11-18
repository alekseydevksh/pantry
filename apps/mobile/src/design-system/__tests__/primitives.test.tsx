import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text as NativeText } from 'react-native';

import { setTestReducedMotion } from '@/test/reanimated';

import { Card, Chip, IconButton, Skeleton, Text } from '../index';
import { lightTheme } from '../themes';

function FilterChip() {
  const [selected, setSelected] = useState(false);
  return <Chip label="Vegan" selected={selected} onPress={() => setSelected((value) => !value)} />;
}

describe('Chip', () => {
  it('toggles its selected state and tells assistive technology', async () => {
    const user = userEvent.setup();
    await render(<FilterChip />);

    const chip = screen.getByRole('button', { name: 'Vegan' });
    expect(chip).not.toBeSelected();
    expect(chip).toHaveStyle({ backgroundColor: lightTheme.colors.surface });

    await user.press(chip);

    expect(screen.getByRole('button', { name: 'Vegan' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Vegan' })).toHaveStyle({
      backgroundColor: lightTheme.colors.primarySoft,
    });
  });

  it('has a 44 pt touch target and ignores presses when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Chip label="Vegan" disabled onPress={onPress} />);

    const chip = screen.getByRole('button', { name: 'Vegan' });
    await user.press(chip);

    expect(chip).toHaveStyle({ minHeight: lightTheme.sizes.minTouchTarget });
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('is found by its label, is 44 pt square and can be pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <IconButton accessibilityLabel="Close" onPress={onPress}>
        <NativeText>×</NativeText>
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Close' });
    await user.press(button);

    expect(button).toHaveStyle({ width: 44, height: 44 });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <IconButton accessibilityLabel="Close" disabled onPress={onPress}>
        <NativeText>×</NativeText>
      </IconButton>,
    );

    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('groups its children on a themed surface', async () => {
    await render(
      <Card testID="card">
        <Text>Inside</Text>
      </Card>,
    );

    expect(screen.getByText('Inside')).toBeOnTheScreen();
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: lightTheme.colors.surface });
  });

  it('becomes a labeled button when it has onPress', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <Card accessibilityLabel="Open recipe" onPress={onPress}>
        <Text>Spaghetti</Text>
      </Card>,
    );

    await user.press(screen.getByRole('button', { name: 'Open recipe' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton', () => {
  it('renders a placeholder of the given size, hidden from screen readers', async () => {
    await render(<Skeleton testID="skeleton" width={120} height={20} />);

    expect(screen.queryByTestId('skeleton')).not.toBeOnTheScreen();
    const skeleton = screen.getByTestId('skeleton', { includeHiddenElements: true });
    expect(skeleton).toHaveStyle({
      width: 120,
      height: 20,
      backgroundColor: lightTheme.colors.surfaceRaised,
    });
  });

  it('pulses, unless the user asked for reduced motion', async () => {
    await render(<Skeleton testID="skeleton" />);
    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).toHaveStyle({
      animationIterationCount: 'infinite',
    });

    setTestReducedMotion(true);
    await screen.rerender(<Skeleton testID="skeleton" />);
    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).not.toHaveStyle({
      animationIterationCount: 'infinite',
    });
  });
});
