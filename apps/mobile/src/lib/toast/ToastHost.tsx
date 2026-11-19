import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { toastStore } from './toastStore';

/** How long a toast stays, in ms. Long enough to read a sentence. */
export const TOAST_DURATION_MS = 5000;

/**
 * Shows the current toast above everything, once, in the root layout. A screen reader hears it as
 * an alert; a tap closes it (the touch target is the whole message, at least 44 pt tall).
 */
export function ToastHost() {
  const { t } = useTranslation();
  const toast = useStore(toastStore, (state) => state.toast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => toastStore.getState().dismiss(), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // A new toast is a new object, so it restarts the timer.
  }, [toast]);

  if (!toast) return null;
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={toast.message}
      accessibilityHint={t('toast.dismissHint')}
      accessibilityLiveRegion="assertive"
      onPress={() => toastStore.getState().dismiss()}
      style={styles.toast}
    >
      <Text variant="callout" style={styles.text}>
        {toast.message}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  toast: {
    position: 'absolute',
    top: rt.insets.top + theme.spacing.md,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    minHeight: theme.sizes.minTouchTarget,
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  text: { textAlign: 'center' },
}));
