import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ErrorBoundary, ErrorState } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { reportError } from '@/lib/observability';

export type FeatureErrorBoundaryProps = {
  /** Which feature this is, for the error report: `home`, `recipe`, ... Not shown to the user. */
  feature: string;
  /** A details screen passes the item id, so another item does not keep showing the old error. */
  resetKey?: unknown;
  children: ReactNode;
};

/**
 * Wraps a feature screen (CLAUDE.md: "no red screens"). A render error shows a message with a retry
 * button, inside the screen, and the tab bar and the other tabs keep working. The error goes to
 * the observability layer, which sends it to Sentry once that is set up (PLAN 5.5).
 */
export function FeatureErrorBoundary({ feature, resetKey, children }: FeatureErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      resetKey={resetKey}
      onError={(error, info) =>
        reportError(error, {
          source: 'react-boundary',
          // The component stack names components, not user data. Cut: reports have a size limit.
          extra: { feature, componentStack: info.componentStack?.slice(0, 600) },
        })
      }
      fallback={({ reset }) => (
        <View style={styles.center}>
          <ErrorState
            title={t('errors.feature.title')}
            message={t('errors.feature.message')}
            retryLabel={t('common.retry')}
            onRetry={reset}
          />
        </View>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// The message sits in the middle of the screen.
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
