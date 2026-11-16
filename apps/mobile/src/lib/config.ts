/**
 * URL of the GraphQL API. `EXPO_PUBLIC_*` variables are inlined into the bundle at build time,
 * so they must never hold a secret.
 *
 * The default works on the iOS Simulator, which shares the Mac's network. A physical device needs
 * the Mac's LAN address, and the Android Emulator needs http://10.0.2.2:4000/graphql (Phase 5).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
