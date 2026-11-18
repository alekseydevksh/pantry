import { useQuery } from '@apollo/client/react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductDocument } from '@pantry/shared';

import { ErrorState, Screen } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

import { detailsStatus } from '../model/details';
import { AddToCartButton } from './AddToCartButton';
import { BodySkeleton } from './DetailsSkeleton';
import { NotFoundState } from './NotFoundState';
import { ProductDetails } from './ProductDetails';
import { ProductHeader } from './ProductHeader';

export type ProductScreenProps = {
  /** The product id from the route, for example `p1`. */
  id: string;
};

/**
 * A product: header, details and the add-to-cart button, each reading its own fragment (ADR 0007).
 * Like the recipe screen, it shows the cached header at once when opened from the feed.
 */
export function ProductScreen({ id }: ProductScreenProps) {
  return (
    <FeatureErrorBoundary feature="product" resetKey={id}>
      <ProductContent id={id} />
    </FeatureErrorBoundary>
  );
}

function ProductContent({ id }: ProductScreenProps) {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery(ProductDocument, { variables: { id } });
  const status = detailsStatus({
    hasData: data !== undefined,
    isMissing: data?.product === null,
    hasError: error !== undefined,
  });

  return (
    <Screen style={styles.screen}>
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
                  <AddToCartButton id={id} />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The photo runs to the screen edges; the text below has its own padding.
  screen: { padding: theme.spacing.none, gap: theme.spacing.none },
  content: { paddingBottom: theme.spacing.xl },
  body: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
}));
