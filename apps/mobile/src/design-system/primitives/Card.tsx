import { Pressable, View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type StaticCardProps = ViewProps & {
  onPress?: undefined;
};

type PressableCardProps = Omit<ViewProps, 'accessibilityLabel'> & {
  onPress: () => void;
  /** Required: a card that can be pressed is a button, and a button needs a label. */
  accessibilityLabel: string;
};

export type CardProps = StaticCardProps | PressableCardProps;

/** A surface that groups content. Pass `onPress` to make the whole card a button. */
export function Card(props: CardProps) {
  if (props.onPress) {
    const { onPress, style, children, ...rest } = props;

    return (
      <Pressable
        {...rest}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  const { style, ...rest } = props;
  return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
}));
