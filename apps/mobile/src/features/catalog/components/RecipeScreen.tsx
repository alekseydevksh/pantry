import { useQuery } from '@apollo/client/react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeDocument } from '@pantry/shared';

import { ErrorState, Screen } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

import { detailsStatus } from '../model/details';
import { BodySkeleton } from './DetailsSkeleton';
import { IngredientList } from './IngredientList';
import { NotFoundState } from './NotFoundState';
import { RecipeDetails } from './RecipeDetails';
import { RecipeHeader } from './RecipeHeader';

export type RecipeScreenProps = {
  /** The recipe id from the route, for example `r1`. */
  id: string;
};

/**
 * A recipe: header, details and ingredients, each reading its own fragment (ADR 0007).
 *
 * Opened from the feed, the header is complete in the cache and shows at once while the rest loads.
 * Opened by a deep link, nothing is cached, and placeholders show until the query arrives.
 */
export function RecipeScreen({ id }: RecipeScreenProps) {
  return (
    <FeatureErrorBoundary feature="recipe" resetKey={id}>
      <RecipeContent id={id} />
    </FeatureErrorBoundary>
  );
}

function RecipeContent({ id }: RecipeScreenProps) {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery(RecipeDocument, { variables: { id } });
  const status = detailsStatus({
    hasData: data !== undefined,
    isMissing: data?.recipe === null,
    hasError: error !== undefined,
  });

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {status === 'notFound' ? (
          <NotFoundState
            title={t('recipe.notFound.title')}
            message={t('recipe.notFound.message')}
          />
        ) : (
          <>
            <RecipeHeader id={id} />
            <View style={styles.body}>
              {status === 'loading' && <BodySkeleton label={t('recipe.loading')} />}
              {status === 'error' && (
                <ErrorState
                  title={t('recipe.error.title')}
                  message={t('recipe.error.message')}
                  retryLabel={t('common.retry')}
                  onRetry={() => void refetch().catch(() => {})}
                />
              )}
              {status === 'ready' && (
                <>
                  <RecipeDetails id={id} />
                  <IngredientList id={id} />
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
