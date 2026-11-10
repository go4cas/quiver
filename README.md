<img src="docs/public/logo.svg" alt="Quiver" height="96">

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/go4cas/quiver)

An [Arrow.js](https://arrow-js.com) starter template with file-based routing, layouts, reactive state, composables, and a full testing setup — built for AI-assisted development, with context files and slash commands for Claude Code, Codex, and Copilot included.

**Stack:** Arrow.js · Vite · plain CSS (`--q-*` tokens) · Vitest · Playwright

---

## Getting started

**Prerequisites:** [Bun](https://bun.com) 1.4+ (or Node.js 22.12+ with npm, without a lockfile: `npm install && npm run dev` in a starter copy, `npm run dev --workspace=quiver-starter` in a clone of this repository, whose root scripts call Bun)

```bash
bunx degit go4cas/quiver/starter my-app
cd my-app
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Quiver 3 is not on npm yet.** The starter depends on `@go4cas/quiver` `^3.0.0`, so a fresh copy installs once 3.0.0 is published. Until then, clone this repository and run `bun install && bun run dev` at its root, or use the 2.x template: `bunx degit go4cas/quiver#v2.1.0 my-app`.

This repository is a Bun workspace: the core package `@go4cas/quiver` is in [`packages/quiver/`](packages/quiver), the starter app in [`starter/`](starter), and the docs site in [`docs/`](docs). The root scripts below run across all of them.

**Browser support:** the router is built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) — Chrome/Edge 102+, Safari 26.2+, Firefox 147+.

---

## AI tooling

Quiver ships with context files and Claude Code slash commands that make AI assistants immediately productive in this codebase:

- **`AGENTS.md`** — the single source of truth, read directly by Codex and GitHub Copilot: conventions, Arrow.js rules, composables, theming, folder structure
- **`CLAUDE.md`** — loaded automatically by Claude Code; imports `AGENTS.md` so every tool shares one context
- **`/add-page`**, **`/add-layout`**, **`/add-component`**, **`/add-state`**, **`/add-composable`**, **`/add-theme`**, **`/add-feature`**, **`/add-test`** — Claude Code slash commands for the most common tasks

See the [AI Tooling guide](docs/guide/ai.md) for usage examples.

---

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `bun run dev`          | Start the Vite dev server            |
| `bun run build`        | Production build to `dist/`          |
| `bun run preview`      | Preview the production build locally |
| `bun run test`         | Run unit tests once (Vitest)         |
| `bun run test:watch`   | Run unit tests in watch mode         |
| `bun run test:e2e`     | Run end-to-end tests (Playwright)    |
| `bun run test:visual`  | Screenshot parity (CI image only)    |
| `bun run typecheck`    | Type-check every workspace via JSDoc (tsc) |
| `bun run docs:dev`     | Start the documentation site locally |
| `bun run docs:build`   | Build the documentation site         |
| `bun run docs:preview` | Preview the built documentation site |

---

## Folder structure

```
packages/quiver/     # @go4cas/quiver: router, provide/inject, useMeta, useRoute, useRouter, createApp
starter/             # The starter app (the degit target), laid out as below
docs/                # The documentation site (VitePress)
tests/repo/          # Repo-wide checks (Vitest)
```

Inside `starter/`:

```
src/
├── pages/           # File-based routes — add your pages here
├── layouts/         # Page wrapper components — add your layouts here
├── components/      # Reusable UI components — add your components here
├── state/           # Global reactive state modules — add your stores here
├── composables/     # Reusable logic functions — add your composables here
├── utils/           # Pure helper functions
├── styles/          # Theme: tokens.css, base.css, effects.css, fonts/
├── app.css          # The app's own page styles
├── style.css        # CSS entry: layer order + imports
└── main.js          # App entry point

tests/
├── unit/            # Unit tests for composables, state and utilities (Vitest)
├── e2e/             # End-to-end tests (Playwright)
└── visual/          # Screenshot parity, 5 themes × 2 modes (Playwright)
```

---

## Documentation

### Developer guide

- [Getting started](docs/guide/getting-started.md) — what to add, what to leave alone
- [Why Quiver](docs/guide/why-quiver.md) — an honest comparison with the alternatives
- [Feature workflow](docs/guide/workflow.md) — step-by-step walkthrough for adding a feature
- [Getting started](docs/guide/getting-started.md) — install, scripts, folder structure, createApp
- [Components](docs/guide/components.md) — component(), local state, built-in components
- [Routing](docs/guide/routing.md) — file-based routing, guards, useMeta, router API
- [Layouts](docs/guide/layouts.md) — page layouts, DI keys, creating new layouts
- [State](docs/guide/state.md) — reactive() stores, built-in state modules
- [Composables](docs/guide/composables.md) — useRoute, useRouter, useForm, useFetch, useToast, provide/inject
- [Testing](docs/guide/testing.md) — unit tests and E2E tests
- [Troubleshooting](docs/guide/troubleshooting.md) — common gotchas and their fixes

---

## Contributing

Bug reports, fixes, and documentation improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## Licence

MIT
