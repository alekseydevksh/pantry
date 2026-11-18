import { render, screen, userEvent } from '@testing-library/react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

import { darkTheme, lightTheme } from '@/design-system';
import { currentLanguage } from '@/lib/i18n';

import { startSettingsSync } from '../applySettings';
import { defaultSettings } from '../model/settings';
import { SettingsScreen } from '../components/SettingsScreen';
import { settingsStore } from '../store';

describe('SettingsScreen', () => {
  let stopSync: () => void;

  beforeEach(() => {
    settingsStore.setState(defaultSettings('en'));
    stopSync = startSettingsSync();
  });

  afterEach(() => {
    stopSync();
  });

  it('shows the current choice of each setting as selected', async () => {
    await render(<SettingsScreen />);

    expect(screen.getByRole('button', { name: 'English' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'System' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Automatic' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Polski' })).not.toBeSelected();
  });

  it('changes the theme at once', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen />);
    expect(screen.getByRole('header', { name: 'Settings' })).toHaveStyle({
      color: lightTheme.colors.text,
    });

    await user.press(screen.getByRole('button', { name: 'Dark' }));

    expect(UnistylesRuntime.themeName).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toBeSelected();
    expect(screen.getByRole('header', { name: 'Settings' })).toHaveStyle({
      color: darkTheme.colors.text,
    });

    await user.press(screen.getByRole('button', { name: 'System' }));

    expect(UnistylesRuntime.themeName).toBe('light');
  });

  it('changes the language at once, without a restart', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    await user.press(screen.getByRole('button', { name: 'Polski' }));

    expect(currentLanguage()).toBe('pl');
    expect(screen.getByRole('header', { name: 'Ustawienia' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ciemny' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Polski' })).toBeSelected();
  });

  it('saves the AI mode in the store', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    await user.press(screen.getByRole('button', { name: 'On-device only' }));

    expect(settingsStore.getState().aiMode).toBe('on-device');
    expect(screen.getByRole('button', { name: 'On-device only' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Automatic' })).not.toBeSelected();
  });
});
