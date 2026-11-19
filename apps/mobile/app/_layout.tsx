import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { ThemedStatusBar } from '@/design-system';
import { CartSync } from '@/features/cart';
import { apolloClient } from '@/lib/apollo/appClient';
import { useTranslation } from '@/lib/i18n';
import { ToastHost } from '@/lib/toast';

// The tabs are the first screen of the stack, also when the app opens on a deep link, so a
// modal or a detail screen always has something to go back to.
export const unstable_settings = { anchor: '(tabs)' };

const styles = StyleSheet.create({ root: { flex: 1 } });

export default function RootLayout() {
  const { theme } = useUnistyles();
  const { t } = useTranslation();

  return (
    <ApolloProvider client={apolloClient}>
      <GestureHandlerRootView style={styles.root}>
        <ThemedStatusBar />
        <CartSync />
        <Stack
          screenOptions={{
            // Only the arrow: the previous screen is the `(tabs)` group, which has no title to show.
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[id]" options={{ title: t('screens.recipe') }} />
          <Stack.Screen name="product/[id]" options={{ title: t('screens.product') }} />
          <Stack.Screen
            name="assistant"
            options={{ presentation: 'modal', title: t('screens.assistant') }}
          />
        </Stack>
        <ToastHost />
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}
