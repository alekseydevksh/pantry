import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { IconButton, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { MAX_QUERY_LENGTH } from '../model/searchValues';

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** The return key, with the text in the field. */
  onSubmit: (text: string) => void;
};

/** The search text field with a clear button. The return key submits. */
export function SearchField({ value, onChangeText, onSubmit }: SearchFieldProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value)}
        accessibilityLabel={t('search.field.label')}
        placeholder={t('search.field.placeholder')}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        // UTF-16 units, so the field can hold a little less than the 100 code points a search keeps.
        maxLength={MAX_QUERY_LENGTH}
      />
      {value.length > 0 ? (
        <IconButton accessibilityLabel={t('search.field.clear')} onPress={() => onChangeText('')}>
          <Text variant="headline">×</Text>
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    minHeight: theme.sizes.minTouchTarget,
    color: theme.colors.text,
    ...theme.typography.body,
  },
}));
