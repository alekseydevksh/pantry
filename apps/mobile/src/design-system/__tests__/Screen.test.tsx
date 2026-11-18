import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { setTestInsets, setTestTheme } from '@/test/unistyles';

import { Screen, ThemedStatusBar, statusBarStyleFor } from '../index';
import { lightTheme } from '../themes';

// The real StatusBar talks to native code, so the test only records the style it is given.
jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));

const lastStatusBarStyle = () => jest.mocked(StatusBar).mock.lastCall?.[0].style;

describe('Screen', () => {
  it('keeps its content above the home indicator', async () => {
    setTestInsets({ top: 59, bottom: 34 });

    await render(
      <Screen testID="screen">
        <Text>Content</Text>
      </Screen>,
    );

    expect(screen.getByTestId('screen')).toHaveStyle({
      paddingBottom: 34 + lightTheme.spacing.xl,
      backgroundColor: lightTheme.colors.background,
    });
  });

  it('adds no bottom inset where the tab bar already covers it', async () => {
    setTestInsets({ bottom: 34 });

    await render(<Screen testID="screen" bottomInset={false} />);

    const screenView = screen.getByTestId('screen');
    expect(screenView).toHaveStyle({ padding: lightTheme.spacing.xl });
    expect(screenView).not.toHaveStyle({ paddingBottom: 34 + lightTheme.spacing.xl });
  });
});

describe('status bar', () => {
  it('has light icons on the dark theme and dark icons on the light theme', () => {
    expect(statusBarStyleFor('dark')).toBe('light');
    expect(statusBarStyleFor('light')).toBe('dark');
  });

  it('follows the theme, also when it changes while mounted', async () => {
    await render(<ThemedStatusBar />);
    expect(lastStatusBarStyle()).toBe('dark');

    setTestTheme('dark');
    await screen.rerender(<ThemedStatusBar />);

    expect(lastStatusBarStyle()).toBe('light');
  });
});
