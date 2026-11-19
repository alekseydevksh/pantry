import { useQuery } from '@apollo/client/react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductDocument } from '@pantry/shared';

import { ErrorState, Screen } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

import { detailsStatus } from '../model/details';
import { BodySkeleton } from './DetailsSkeleton';
import { NotFoundState } from './NotFoundState';
import { ProductDetails } from './ProductDetails';
import { ProductHeader } from './ProductHeader';

export type ProductScreenProps = {
  /** The product id from the route, for example `p1`. */
  id: string;
  /**
   * What the user can do with the product, shown under its details (the add-to-cart button). The
   * route passes it, so the catalog does not depend on the cart feature.
   */
  actions?: (id: string) => ReactNode;
};

/**
 * A product: header, details and its actions, each reading its own fragment (ADR 0007).
 * Like the recipe screen, it shows the cached header at once when opened from the feed.
 */
export function ProductScreen({ id, actions }: ProductScreenProps) {
  return (
    <FeatureErrorBoundary feature="product" resetKey={id}>
      <ProductContent id={id} actions={actions} />
    </FeatureErrorBoundary>
  );
}

function ProductContent({ id, actions }: ProductScreenProps) {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery(ProductDocument, { variables: { id } });
  const status = detailsStatus({
    hasData: data !== undefined,
    isMissing: data?.product === null,
    hasError: error !== undefined,
  });

  return (
    <Screen bottomInset={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {status === 'notFound' ? (
          <NotFoundState
            title={t('product.notFound.title')}
            message={t('product.notFound.message')}
          />
        ) : (
          <>
            <ProductHeader id={id} />
            <View style={styles.body}>
              {status === 'loading' && <BodySkeleton label={t('product.loading')} />}
              {status === 'error' && (
                <ErrorState
                  title={t('product.error.title')}
                  message={t('product.error.message')}
                  retryLabel={t('common.retry')}
                  onRetry={() => void refetch().catch(() => {})}
                />
              )}
              {status === 'ready' && (
                <>
                  <ProductDetails id={id} />
                  {actions?.(id)}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  // The photo runs to the screen edges; the text below has its own padding.
  screen: { padding: theme.spacing.none, gap: theme.spacing.none },
  // The scroll view runs to the screen edge, and its last row can scroll above the home indicator.
  content: { paddingBottom: rt.insets.bottom + theme.spacing.xl },
  body: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
}));
