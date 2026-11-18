import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type TextVariant =
  'display' | 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'label';

/** The color role of the text. The theme decides the actual color. */
export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'onPrimary';

export type TextProps = NativeTextProps & {
  /** Which text style to use. Default: `body`. */
  variant?: TextVariant;
  /** Which color role to use. Default: `default`. */
  tone?: TextTone;
};

/**
 * Text with the design system's type scale and colors. Dynamic type is on (React Native
 * scales `fontSize` and `lineHeight` with the user's text size), but capped so layouts survive.
 */
export function Text({ variant = 'body', tone = 'default', style, ...props }: TextProps) {
  return (
    <NativeText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...props}
      style={[styles[variant], toneStyles[tone], style]}
    />
  );
}

/** Largest text scale we design for. Beyond it, accessibility sizes still work but are capped. */
const MAX_FONT_SCALE = 2;

const styles = StyleSheet.create((theme) => ({
  display: theme.typography.display,
  title: theme.typography.title,
  headline: theme.typography.headline,
  body: theme.typography.body,
  callout: theme.typography.callout,
  caption: theme.typography.caption,
  label: theme.typography.label,
}));

const toneStyles = StyleSheet.create((theme) => ({
  default: { color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  primary: { color: theme.colors.primary },
  danger: { color: theme.colors.danger },
  onPrimary: { color: theme.colors.onPrimary },
}));
