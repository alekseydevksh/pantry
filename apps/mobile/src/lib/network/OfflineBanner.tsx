import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { useNetworkStatus } from './useNetworkStatus';

/**
 * A strip at the top of a screen that shows saved data: "You are offline". It shows only when the
 * device says it is offline, and announces itself to a screen reader when it appears.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const status = useNetworkStatus();
  if (status !== 'offline') return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.banner}
    >
      <Text variant="callout" style={styles.text}>
        {t('offline.banner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    backgroundColor: theme.colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  text: { textAlign: 'center' },
}));
