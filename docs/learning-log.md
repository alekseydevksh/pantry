# Learning log

One entry per phase: what to understand before the interview, why it matters, and where to read more. Each entry points at the place in this repo where the idea shows up.

## Phase 0 — Setup

### What I should learn here

- **Expo is now the default way to start a React Native app.** In 2018 the choice was "Expo (limited) or bare React Native (full control)". That split is gone: the React Native docs tell you to use a framework, and Expo is the one they name. You keep full native access, because the app is a normal native project that Expo generates and builds. "Bare" now only means "I maintain `ios/` and `android/` by hand".
  Here: [apps/mobile/package.json](../apps/mobile/package.json) — `main` is `expo-router/entry`; there is no `index.js` or `AppRegistry` call.
  Read: [React Native: get started](https://reactnative.dev/docs/environment-setup), [Expo: core concepts](https://docs.expo.dev/workflow/overview/).

- **Expo Go vs development builds.** Expo Go is a prebuilt app from the store with a fixed set of native modules. It is fine for a first demo, but it cannot load a native library it does not already contain. A development build is _your own_ app (your bundle id, your native modules) with the `expo-dev-client` launcher and dev menu added. Pantry needs one from day one because MMKV, Unistyles and the on-device AI module are not in Expo Go. The cost: the first `pnpm ios` compiles native code (minutes), and you rebuild whenever a native dependency changes. JS changes still hot-reload through Metro.
  Here: `expo-dev-client` in [apps/mobile/package.json](../apps/mobile/package.json); the `ios` script runs `expo run:ios`.
  Read: [Development builds](https://docs.expo.dev/develop/development-builds/introduction/).

- **Continuous Native Generation (CNG) and config plugins.** `ios/` and `android/` are build output, like `dist/` on the web. `expo prebuild` generates them from `app.config.ts` plus the config plugins of each library, so they are git-ignored. To change something native (a permission, the URL scheme, a build setting) you change the config or write a plugin; you do not open Xcode and edit a file. This is what makes React Native upgrades cheap: delete the folders and generate them again for the new version. Interview answer to "how do you upgrade RN?": bump the SDK, run `expo install --fix`, prebuild clean, fix what the changelog lists.
  Here: [apps/mobile/app.config.ts](../apps/mobile/app.config.ts) (bundle id, `pantry://` scheme, splash plugin); `apps/mobile/ios/` in [.gitignore](../.gitignore).
  Read: [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/), [Config plugins](https://docs.expo.dev/config-plugins/introduction/).

- **The New Architecture is the only architecture.** The old design sent JSON messages over an asynchronous _bridge_ between JS and native. It is removed. Now: **JSI** lets JS hold references to C++ objects and call them directly; **TurboModules** are native modules built on JSI (lazy-loaded, typed from a spec by Codegen, can be synchronous); **Fabric** is the new renderer, which can render synchronously and supports React's concurrent features (transitions, Suspense); **bridgeless mode** means the bridge is not even initialized. Why it matters in practice: synchronous storage (MMKV), animations and gestures that run on the UI thread, and React 19 features that work as they do on the web. Nothing in the app config turns it on, because there is nothing to turn off.
  Here: no flag to point at. The proof is in the build log: pods such as `React-Fabric` and `ReactCodegen` are compiled.
  Read: [About the New Architecture](https://reactnative.dev/architecture/landing-page), [Expo: New Architecture](https://docs.expo.dev/guides/new-architecture/).

- **Hermes is the JS engine.** Not JavaScriptCore, and not V8. Hermes compiles JS to bytecode _at build time_, so a release app does not parse and compile JS at startup. That lowers time-to-interactive and memory, mostly on mid-range Android. It also defines what "debugging" means now: React Native DevTools talks to Hermes directly over the Chrome DevTools Protocol. The old "Debug in Chrome" mode, which ran your JS in a different engine, is gone, and so is Flipper.
  Here: nothing to configure; `hermes-engine` is one of the pods. Performance numbers come in Phase 5.
  Read: [Using Hermes](https://reactnative.dev/docs/hermes), [Expo: tools for development](https://docs.expo.dev/develop/tools/).

- **AI-assisted development is part of the toolchain.** The Expo template now ships an `AGENTS.md` that says, in short, "Expo changes every release, read the versioned docs, do not answer from memory". This repo does the same with [CLAUDE.md](../CLAUDE.md): commands, folder rules, conventions and a fixed workflow (one task, one commit, checks before finishing). Expo also publishes its docs in an LLM-friendly index and has an MCP server that lets an agent search the docs and work with EAS. The senior-level point for an interview: the agent's output is only as good as the constraints and the checks around it, so the rules file, the typed schema, lint and tests are the real quality gate.
  Here: [CLAUDE.md](../CLAUDE.md), [docs/PLAN.md](PLAN.md), [.github/workflows/ci.yml](../.github/workflows/ci.yml).
  Read: [Expo docs index for LLMs](https://docs.expo.dev/llms.txt), [Expo MCP server](https://docs.expo.dev/eas/ai/mcp/).

### Also set up in this phase (short notes)

- **React Compiler is on** (`experiments.reactCompiler` in [app.config.ts](../apps/mobile/app.config.ts)). It memoizes components and hooks at build time, so the code has no `useMemo`, `useCallback` or `React.memo`. The ESLint rules from `eslint-plugin-react-hooks` report code the compiler cannot optimize. The ADR with measurements comes in Phase 5. Read: [React Compiler](https://react.dev/learn/react-compiler), [Expo: React Compiler](https://docs.expo.dev/guides/react-compiler/).
- **One schema, generated types.** [packages/shared/schema.graphql](../packages/shared/schema.graphql) is the contract. `pnpm codegen` turns each `.graphql` operation in the app into a typed document, and CI fails if the generated file is stale. Read: [Codegen client preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client).
- **Monorepo.** Expo detects a pnpm workspace and configures Metro for it; there is no `metro.config.js`. pnpm blocks dependency install scripts unless they are listed under `allowBuilds` in [pnpm-workspace.yaml](../pnpm-workspace.yaml). Read: [Expo: monorepos](https://docs.expo.dev/guides/monorepos/), [pnpm settings](https://pnpm.io/settings).
- **Idempotency keys on cart mutations.** A mobile client retries after a lost response, so "add 2" could be applied twice. Each user action carries a key and the server applies a key once ([server/src/cart.ts](../server/src/cart.ts)). The offline queue in Phase 3 depends on this.
