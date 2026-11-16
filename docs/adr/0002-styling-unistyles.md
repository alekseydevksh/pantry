# ADR 0002: Styling with Unistyles 3 and design tokens

- Status: Accepted
- Date: 2026-11-16

## Context

The app needs a small design system: tokens, light and dark themes, six primitives. Options were Unistyles 3, NativeWind, or plain `StyleSheet` with tokens.

## Decision

Use **Unistyles 3**. Tokens live in `src/design-system/tokens.ts`. Themes are built from tokens and registered once. Components use the Unistyles `StyleSheet.create(theme => ...)` API and do not read raw color or spacing values.

## Why

- **Theme changes without re-renders.** Unistyles 3 updates styles from native code when the theme or the screen size changes. With a context-based theme, every themed component re-renders.
- **Same API shape as React Native's `StyleSheet`.** Little to learn, and easy to move away from.
- **No new native cost.** It depends on Nitro Modules, which the app already needs for MMKV.
- **Typed themes.** A missing token is a compile error.

## Alternatives

- **NativeWind.** Stable is v4, built for Tailwind 3, while Tailwind itself is on v4 and NativeWind v5 is still a release candidate. Starting on v4 means a migration soon; starting on an RC is a risk for a portfolio repo. Utility classes also hide the token layer that this project wants to show.
- **Plain `StyleSheet` + a theme context.** No dependency and no native risk. But themes cause re-renders, and breakpoints and variants must be written by hand.

## Consequences

- Dev builds only (no Expo Go). Already true because of MMKV.
- Jest needs the Unistyles mock in the test setup.
- Unistyles requires edge-to-edge on Android, which is the platform default anyway.
- If Unistyles becomes a problem, the fallback is plain `StyleSheet` with the same tokens. Keeping all style code behind the design-system primitives makes that change small.
