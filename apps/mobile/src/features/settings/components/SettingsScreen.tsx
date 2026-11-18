import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

// Placeholder screen, replaced by the real feature later.
export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        {t('settings.title')}
      </Text>
      <Text tone="muted">{t('settings.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
}));
