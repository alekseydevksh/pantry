import { act, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { StyleSheet, UnistylesRuntime, useUnistyles } from 'react-native-unistyles';

import { setTestTheme } from '@/test/unistyles';

import { darkTheme, lightTheme, themes, type ThemeName } from '../themes';

// The two ways a component reads the theme: a themed StyleSheet (the normal way)
// and the `useUnistyles` hook (for values that are props, not styles).
function Swatch() {
  const { theme } = useUnistyles();

  return (
    <View testID="swatch" style={styles.swatch}>
      <Text style={styles.label}>{theme.colors.primary}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  swatch: { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  label: { ...theme.typography.body, color: theme.colors.text },
}));

describe('theming', () => {
  it.each(Object.keys(themes) as ThemeName[])(
    'gives a component the %s theme values',
    async (name) => {
      const theme = themes[name];
      setTestTheme(name);

      await render(<Swatch />);

      expect(screen.getByTestId('swatch')).toHaveStyle({
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
      });
      expect(screen.getByText(theme.colors.primary)).toHaveStyle({
        color: theme.colors.text,
        fontSize: theme.typography.body.fontSize,
      });
    },
  );

  it('starts in the light theme and changes the values when the theme is switched', async () => {
    await render(<Swatch />);

    expect(UnistylesRuntime.themeName).toBe('light');
    expect(screen.getByTestId('swatch')).toHaveStyle({
      backgroundColor: lightTheme.colors.background,
    });

    await act(async () => {
      UnistylesRuntime.setTheme('dark');
    });

    // The hook value updates by itself.
    expect(screen.getByText(darkTheme.colors.primary)).toHaveStyle({
      color: darkTheme.colors.text,
    });
    expect(screen.getByTestId('swatch')).toHaveStyle({
      backgroundColor: darkTheme.colors.background,
    });
  });

  it('resets to the light theme between tests', () => {
    expect(UnistylesRuntime.themeName).toBe('light');
  });
});
