import { router } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

export type NotFoundStateProps = {
  title: string;
  message: string;
};

/**
 * Shown when the server says there is no such item, for example after a deep link with an id that
 * was removed. A retry would give the same answer, so the way out is back to Home. `replace`, not
 * `back`: a cold start from a link has nothing to go back to but the tabs, and `replace` works
 * in both cases.
 */
export function NotFoundState({ title, message }: NotFoundStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text variant="headline" accessibilityRole="header" style={styles.centered}>
        {title}
      </Text>
      <Text tone="muted" style={styles.centered}>
        {message}
      </Text>
      <Button
        title={t('common.backToHome')}
        variant="secondary"
        onPress={() => router.replace('/')}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
  centered: { textAlign: 'center' },
}));
