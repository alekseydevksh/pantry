import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUnistyles } from 'react-native-unistyles';

import { useTranslation } from '@/lib/i18n';

// The tabs are the first screen of the stack, also when the app opens on a deep link, so a
// modal or a detail screen always has something to go back to.
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const { theme } = useUnistyles();
  const { t } = useTranslation();

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
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
    </>
  );
}
