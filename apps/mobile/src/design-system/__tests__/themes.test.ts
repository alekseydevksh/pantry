import { darkTheme, lightTheme, themes, type ThemeColors } from '../themes';
import { palette, radius, sizes, spacing, typography } from '../tokens';

/** All key paths of an object, for example "colors.text" or "typography.body.fontSize". */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

function channels(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Not a #RRGGBB color: ${hex}`);
  }
  return [match[1], match[2], match[3]].map((part) => parseInt(part ?? '', 16)) as [
    number,
    number,
    number,
  ];
}

/** WCAG 2 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 (same color) to 21 (black on white). */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('tokens', () => {
  it('has a spacing scale on the 4 pt grid (with one 2 pt step) that only grows', () => {
    const values = Object.values(spacing);

    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values.filter((value) => value % 4 !== 0)).toEqual([spacing.xxs]);
  });

  it('gives every text style a line height larger than its font size', () => {
    for (const style of Object.values(typography)) {
      expect(style.lineHeight).toBeGreaterThan(style.fontSize);
    }
  });

  it('uses only #RRGGBB colors in the palette', () => {
    for (const color of Object.values(palette)) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('keeps the minimum touch target at 44 pt', () => {
    expect(sizes.minTouchTarget).toBe(44);
  });
});

describe('themes', () => {
  it('registers exactly the light and dark themes (the names adaptive themes need)', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
  });

  it('has the same keys in both themes', () => {
    expect(keyPaths(darkTheme)).toEqual(keyPaths(lightTheme));
  });

  it('shares the scales and differs in colors', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(theme.spacing).toBe(spacing);
      expect(theme.radius).toBe(radius);
      expect(theme.typography).toBe(typography);
    }
    expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.text).not.toBe(lightTheme.colors.text);
  });

  // Text on its background must reach WCAG AA for normal text.
  const textPairs: [foreground: keyof ThemeColors, background: keyof ThemeColors][] = [
    ['text', 'background'],
    ['text', 'surface'],
    ['text', 'surfaceRaised'],
    ['textMuted', 'background'],
    ['textMuted', 'surface'],
    ['onPrimary', 'primary'],
    ['onPrimary', 'primaryPressed'],
    ['onPrimarySoft', 'primarySoft'],
    ['onDanger', 'danger'],
    ['danger', 'background'],
    ['danger', 'surface'],
    ['warning', 'background'],
    ['warning', 'surface'],
    ['primary', 'background'],
    ['primary', 'surface'],
  ];

  describe.each(Object.entries(themes))('%s theme contrast', (_name, theme) => {
    it.each(textPairs)('%s on %s is at least 4.5:1', (foreground, background) => {
      const ratio = contrast(theme.colors[foreground], theme.colors[background]);

      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
