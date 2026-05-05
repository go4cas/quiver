<img src="docs/public/logo.svg" alt="Quiver" height="96">

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/go4cas/quiver)

An [Arrow.js](https://arrow-js.com) starter template with file-based routing, layouts, reactive state, composables, and a full testing setup.

**Stack:** Arrow.js · Vite · Tailwind CSS v4 · Vitest · Playwright

---

## Getting started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/go4cas/quiver
cd quiver
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the Vite dev server            |
| `npm run build`        | Production build to `dist/`          |
| `npm run preview`      | Preview the production build locally |
| `npm test`             | Run unit tests (Vitest)              |
| `npm run test:e2e`     | Run end-to-end tests (Playwright)    |
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
- [Feature workflow](docs/guide/workflow.md) — step-by-step walkthrough for adding a feature
- [Routing](docs/guide/routing.md) — file-based routing, dynamic segments, navigation guards
- [Layouts](docs/guide/layouts.md) — page layouts, DI keys, creating new layouts
- [State](docs/guide/state.md) — reactive stores, built-in state modules
- [Composables](docs/guide/composables.md) — useRoute, useRouter, useForm, provide/inject
- [Testing](docs/guide/testing.md) — unit tests and E2E tests

### API reference

- [Framework](docs/api/framework.md) — createApp, createStore, provide, inject, useMeta
- [Router](docs/api/router.md) — initRouter, go, beforeEach, resolveRoute and utilities
- [Composables](docs/api/composables.md) — useRoute, useRouter, useForm
- [Components](docs/api/components.md) — Link, Counter, ThemeToggle, UserCard, ErrorCard, LoadingCard

---

## AI tooling

Quiver ships with context files and Claude Code slash commands that make AI assistants immediately productive in this codebase:

- **`CLAUDE.md`** — loaded automatically by Claude Code; covers conventions, Arrow.js rules, and folder structure
- **`AGENTS.md`** — same context for OpenAI Codex
- **`.github/copilot-instructions.md`** — same context for GitHub Copilot
- **`/add-page`**, **`/add-state`**, **`/add-component`**, **`/add-feature`**, **`/add-test`** — Claude Code slash commands for the most common tasks

See the [AI Tooling guide](docs/guide/ai.md) for usage examples.

---

## Contributing

Bug reports, fixes, and documentation improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## Licence

MIT
