import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUnistyles } from 'react-native-unistyles';

// The tabs are the first screen of the stack, also when the app opens on a deep link, so a
// modal or a detail screen always has something to go back to.
export const unstable_settings = { anchor: '(tabs)' };

// Screen titles are English for now: i18n arrives in task 1.6.
export default function RootLayout() {
  const { theme } = useUnistyles();

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
        <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="assistant" options={{ presentation: 'modal', title: 'Assistant' }} />
      </Stack>
    </>
  );
}
