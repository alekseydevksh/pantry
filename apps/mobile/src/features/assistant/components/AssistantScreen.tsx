import { Button, Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

export type AssistantScreenProps = {
  /** Called when the user closes the assistant. The route decides where that goes. */
  onClose: () => void;
};

// Placeholder screen, replaced by the real feature later.
export function AssistantScreen(props: AssistantScreenProps) {
  return (
    <FeatureErrorBoundary feature="assistant">
      <AssistantContent {...props} />
    </FeatureErrorBoundary>
  );
}

function AssistantContent({ onClose }: AssistantScreenProps) {
  const { t } = useTranslation();

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        {t('assistant.title')}
      </Text>
      <Text tone="muted">{t('assistant.body')}</Text>
      <Button title={t('common.close')} variant="secondary" onPress={onClose} />
    </Screen>
  );
}
