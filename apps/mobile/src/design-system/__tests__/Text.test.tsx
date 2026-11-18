import { render, screen } from '@testing-library/react-native';

import { setTestTheme } from '@/test/unistyles';

import { Text, type TextVariant } from '../index';
import { darkTheme, lightTheme } from '../themes';

const variants: TextVariant[] = [
  'display',
  'title',
  'headline',
  'body',
  'callout',
  'caption',
  'label',
];

describe('Text', () => {
  it.each(variants)('applies the %s type style', async (variant) => {
    await render(<Text variant={variant}>Hello</Text>);

    expect(screen.getByText('Hello')).toHaveStyle({
      fontSize: lightTheme.typography[variant].fontSize,
      lineHeight: lightTheme.typography[variant].lineHeight,
    });
  });

  it('uses the body style and the default color when no props are given', async () => {
    await render(<Text>Hello</Text>);

    expect(screen.getByText('Hello')).toHaveStyle({
      fontSize: lightTheme.typography.body.fontSize,
      color: lightTheme.colors.text,
    });
  });

  it('picks the color by tone, per theme', async () => {
    await render(<Text tone="muted">Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({ color: lightTheme.colors.textMuted });

    setTestTheme('dark');
    await screen.rerender(<Text tone="muted">Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({ color: darkTheme.colors.textMuted });
  });

  it('scales with the user text size, but with a cap', async () => {
    await render(<Text>Hello</Text>);

    const text = screen.getByText('Hello');
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.maxFontSizeMultiplier).toBe(2);
  });

  it('passes accessibility props through', async () => {
    await render(<Text accessibilityRole="header">Title</Text>);
    expect(screen.getByRole('header', { name: 'Title' })).toBeOnTheScreen();
  });
});
