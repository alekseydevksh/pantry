import { StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Phase 0 placeholder. Raw colors, spacing and English strings are temporary:
// theme tokens arrive in task 1.1, i18n in 1.6, and the real feed in 2.5.
const palette = {
  light: { background: '#FAF4E6', text: '#1F2A24', muted: '#5B6B62' },
  dark: { background: '#14201A', text: '#FAF4E6', muted: '#A9B8AF' },
};

export function HomeScreen() {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        Pantry
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Groceries and recipes, with an assistant that helps you shop.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 17, textAlign: 'center' },
});
