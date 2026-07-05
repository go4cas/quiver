<img src="docs/public/logo.svg" alt="Quiver" height="96">

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/go4cas/quiver)

An [Arrow.js](https://arrow-js.com) starter template with file-based routing, layouts, reactive state, composables, and a full testing setup — built for AI-assisted development, with context files and slash commands for Claude Code, Codex, and Copilot included.

**Stack:** Arrow.js · Vite · Tailwind CSS v4 · Vitest · Playwright

---

## Getting started

**Prerequisites:** Node.js 20.19+

```bash
npx degit go4cas/quiver my-app
cd my-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You can also click **Use this template** on GitHub, or clone the repository directly.

**Browser support:** the router is built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) — Chrome/Edge 102+, Safari 26.2+, Firefox 147+.

---

## AI tooling

Quiver ships with context files and Claude Code slash commands that make AI assistants immediately productive in this codebase:

- **`AGENTS.md`** — the single source of truth: conventions, Arrow.js rules, composables, theming, folder structure
- **`CLAUDE.md`** — loaded automatically by Claude Code; imports `AGENTS.md` so both tools share one context
- **`.github/copilot-instructions.md`** — condensed rules for GitHub Copilot
- **`/add-page`**, **`/add-layout`**, **`/add-component`**, **`/add-state`**, **`/add-composable`**, **`/add-theme`**, **`/add-feature`**, **`/add-test`** — Claude Code slash commands for the most common tasks

See the [AI Tooling guide](docs/guide/ai.md) for usage examples.

---

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the Vite dev server            |
| `npm run build`        | Production build to `dist/`          |
| `npm run preview`      | Preview the production build locally |
| `npm test`             | Run unit tests once (Vitest)         |
| `npm run test:watch`   | Run unit tests in watch mode         |
| `npm run test:e2e`     | Run end-to-end tests (Playwright)    |
| `npm run typecheck`    | Type-check `src/` via JSDoc (tsc)    |
| `npm run docs:dev`     | Start the documentation site locally |
| `npm run docs:build`   | Build the documentation site         |
| `npm run docs:preview` | Preview the built documentation site |

---

## Folder structure

```
src/
├── framework/       # Router, DI, store, app bootstrap — framework internals
├── pages/           # File-based routes — add your pages here
├── layouts/         # Page wrapper components — add your layouts here
├── components/      # Reusable UI components — add your components here
├── state/           # Global reactive state modules — add your stores here
├── composables/     # Reusable logic functions — add your composables here
├── utils/           # Pure helper functions
└── main.js          # App entry point

tests/
├── framework/       # Unit tests for framework utilities (Vitest)
├── composables/     # Unit tests for composables (Vitest)
└── e2e/             # End-to-end tests (Playwright)
```

---

## Documentation

### Developer guide

- [Getting started](docs/guide/getting-started.md) — what to add, what to leave alone
- [Why Quiver](docs/guide/why-quiver.md) — an honest comparison with the alternatives
- [Feature workflow](docs/guide/workflow.md) — step-by-step walkthrough for adding a feature
- [Routing](docs/guide/routing.md) — file-based routing, dynamic segments, navigation guards
- [Layouts](docs/guide/layouts.md) — page layouts, DI keys, creating new layouts
- [State](docs/guide/state.md) — reactive stores, built-in state modules
- [Composables](docs/guide/composables.md) — useRoute, useRouter, useForm, provide/inject
- [Testing](docs/guide/testing.md) — unit tests and E2E tests
- [Troubleshooting](docs/guide/troubleshooting.md) — common gotchas and their fixes

### API reference

- [Framework](docs/api/framework.md) — createApp, createStore, provide, inject, useMeta
- [Router](docs/api/router.md) — initRouter, go, beforeEach, resolveRoute and utilities
- [Composables](docs/api/composables.md) — useRoute, useRouter, useForm
- [Components](docs/api/components.md) — Link, Counter, ThemeToggle, UserCard, ErrorCard, LoadingCard

---

## Contributing

Bug reports, fixes, and documentation improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## Licence

MIT
