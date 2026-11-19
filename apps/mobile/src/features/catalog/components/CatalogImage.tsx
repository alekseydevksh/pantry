import { Image } from 'expo-image';
import { StyleSheet as NativeStyleSheet, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** A soft grey-green blur shown until the photo has loaded. One for all items: the API has no per-image hash. */
const PLACEHOLDER_BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export type CatalogImageProps = {
  uri: string;
  /** The row's id. A recycled list row shows another item's photo, so the image must know that. */
  recyclingKey: string;
  /** `card`: in a list. `hero`: at the top of a details screen. `thumb`: a small square, in the cart. */
  size: 'card' | 'hero' | 'thumb';
};

/**
 * The photo of a product or recipe. It is decoration: the card's own label says what the item is,
 * so a screen reader skips the image.
 */
export function CatalogImage({ uri, recyclingKey, size }: CatalogImageProps) {
  return (
    <View style={[styles.frame, styles[size]]}>
      <Image
        source={{ uri }}
        // Without a key, a recycled FlashList row would show the previous item's photo until the
        // new one loads.
        recyclingKey={recyclingKey}
        placeholder={{ blurhash: PLACEHOLDER_BLURHASH }}
        contentFit="cover"
        transition={200}
        // Memory and disk: scrolling back up does not download the photo again.
        cachePolicy="memory-disk"
        accessible={false}
        style={NativeStyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The frame has the theme color, so the area is not white in dark mode while the photo loads.
  frame: { backgroundColor: theme.colors.surfaceRaised, overflow: 'hidden' },
  card: { height: theme.sizes.cardImage },
  hero: { height: theme.sizes.heroImage },
  thumb: { width: theme.sizes.thumbImage, height: theme.sizes.thumbImage },
}));
