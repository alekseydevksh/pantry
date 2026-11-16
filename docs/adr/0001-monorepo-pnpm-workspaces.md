# ADR 0001: Monorepo with pnpm workspaces

- Status: Accepted
- Date: 2026-11-16

## Context

The repo has three parts that share types: the Expo app (`apps/mobile`), a mock GraphQL server with an LLM proxy (`server`), and the GraphQL schema with generated types and Zod schemas (`packages/shared`). A schema change must reach the app and the server in one commit.

## Decision

Use **pnpm workspaces** (pnpm 12). No task runner (Turborepo, Nx) for now; root `package.json` scripts call `pnpm -r`.

Pin `graphql` to v16 with a pnpm override, so the workspace has exactly one copy.

## Alternatives

- **bun workspaces.** Faster installs, but a second runtime to explain, and Expo's documentation and tooling are tested most with npm, yarn and pnpm.
- **npm or yarn workspaces.** They work. pnpm's strict dependency resolution catches packages that import something they did not declare, which matters in a monorepo.
- **Turborepo or Nx.** Useful when builds are slow. Three packages do not need caching yet. Easy to add later without moving files.
- **Separate repos.** The schema would need publishing and versioning. Too much process for one developer.

## Consequences

- One install, one lockfile, one `graphql` version.
- pnpm's isolated `node_modules` layout can confuse native tooling. Expo supports it, but if a native library fails to resolve, the fallback is `node-linker=hoisted` in `.npmrc`. Record it here if that happens.
- Native packages in `apps/mobile` are installed with `npx expo install`, so versions match the Expo SDK.
