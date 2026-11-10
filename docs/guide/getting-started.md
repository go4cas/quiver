# Getting Started

::: tip Try it online
Open the full Quiver starter in your browser — no installation needed.

[Open in StackBlitz →](https://stackblitz.com/github/go4cas/quiver)
:::

## Prerequisites

- [Bun](https://bun.com) 1.4+ — the supported package manager and runtime

No Bun? npm on Node.js 22.12+ (required by Vitest 5) works too. In a starter copy, run `npm install && npm run dev`. In a clone of the repository, the root scripts call Bun, so run `npm install && npm run dev --workspace=quiver-starter`; this is how the StackBlitz button runs the project. `bun.lock` is the only lockfile, so npm resolves fresh versions.

## Browser support

Quiver's router is built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API), so the apps you build with it run in modern browsers only:

| Browser | Minimum version |
|---|---|
| Chrome | 102 |
| Edge | 102 |
| Safari | 26.2 |
| Firefox | 147 |

## Installation

Scaffold the starter app without Quiver's git history:

```bash
bunx degit go4cas/quiver/starter my-app
cd my-app
bun install
```

::: warning Quiver 3 is not on npm yet
The starter depends on `@go4cas/quiver` `^3.0.0`, so `bun install` in a fresh copy works once 3.0.0 is published. Until then, clone the repository (below), or scaffold the 2.x template with `bunx degit go4cas/quiver#v2.1.0 my-app`.
:::

Or clone the repository (keeps the full history). It is a Bun workspace: the core package is in `packages/quiver/` and the starter app in `starter/`, and the root scripts run the starter:

```bash
git clone https://github.com/go4cas/quiver
cd quiver
bun install
```

## Running the app

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). The app hot-reloads on every save.

## Available scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Preview the production build locally |
| `bun run test` | Run unit tests once (Vitest) |
| `bun run test:watch` | Run unit tests in watch mode (inside the starter) |
| `bun run test:e2e` | Run end-to-end tests (Playwright) |
| `bun run test:visual` | Run the screenshot-parity suite (CI image only, see `starter/tests/visual/README.md`) |
| `bun run typecheck` | Type-check `src/` via JSDoc annotations (tsc `checkJs`, no build step) |
| `bun run docs:dev` | Start the documentation site locally |
| `bun run docs:build` | Build the documentation site |
| `bun run docs:preview` | Preview the built documentation site locally |

## Folder structure

```
public/              # Served at root URL as-is — favicon, OG images, robots.txt

src/
├── assets/          # Images, SVGs, fonts — imported in components, hashed on build
├── pages/           # File-based routes
├── layouts/         # Page wrapper components
├── components/      # Reusable UI components
├── state/           # Global reactive state modules
├── composables/     # Reusable logic functions
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

That is the starter app (`starter/` in the repository). The router, `provide`/`inject`, `useMeta`, `useRoute` and `useRouter` come from the `@go4cas/quiver` package (`packages/quiver/` in the repository).

## Static assets

Vite handles two kinds of static assets out of the box.

**`public/`** — files served at the root URL without any processing. Use this for assets that need a stable, predictable path: favicons, Open Graph images, `robots.txt`. Reference them with an absolute path:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

**`src/assets/`** — assets imported directly in JavaScript. Vite resolves the import to a content-hashed URL and copies the file to `dist/` at build time:

```js
import avatarUrl from '../assets/avatar.svg'

html`<img src="${avatarUrl}" alt="Avatar" />`
```

Use `src/assets/` for any image, SVG, or font that is referenced inside a component.

## What you own

These directories are yours — add, edit, and delete files here freely.

| Directory | What to put here |
|---|---|
| `public/` | Assets with stable URLs — favicons, OG images, `robots.txt` |
| `src/assets/` | Images, SVGs, fonts imported inside components |
| `src/pages/` | Route pages — one file per route |
| `src/components/` | Reusable UI components |
| `src/layouts/` | Page layout wrappers |
| `src/state/` | Global reactive state modules |
| `src/composables/` | Reusable logic functions |
| `src/utils/` | Pure helper functions |
| `tests/e2e/` | End-to-end tests for your features |
| `tests/unit/` | Unit tests for composables, state and utilities you write |

## What to leave as-is

No need to touch these for normal development.

| File / Directory | Why |
|---|---|
| `src/main.js` | Entry point. Only change it to add a top-level `provide()` call, a guard, or a layout. |
| `vitest.config.js` | Leave unless changing which test directories are scanned. |
| `playwright.config.js` | Leave unless changing test directories or the dev server port. |
| `vite.config.js` | Adds the `quiver()` plugin that builds the route manifest from `src/pages/`. Leave unless adding Vite plugins. |

## App bootstrap

`src/main.js` registers DI values, starts the router, then mounts the app:

```js
import { provide, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'   // built from src/pages/ by the quiver() Vite plugin

provide('app', { name: 'Quiver', tagline: 'The Demo Hub' })
await initRouter({ routes, notFound })
createApp({
  target: '#app',
  layouts,                     // from './layouts/index.js'
  defaultLayout: 'basic',
  loading: LoadingCard,
  error: ({ message }) => ErrorCard(message),
})
```

`createApp()` renders the current route (inside its layout) into the `target` element, and throws if it is missing. Await `initRouter()` first, and run any other setup code (analytics, error reporting) before calling it.

Ready to build something? See the [feature workflow](./workflow) guide.

---

## One runtime dependency

Quiver's only runtime dependency is `@arrow-js/core`: `reactive()`, `html`, `component()`, `watch()`, `onCleanup()`, `nextTick()`. `createApp()` mounts the root template by calling it with the target element — no separate render package.

---

## Arrow.js rules to know

Two constraints come up often enough to call out before you start writing components.

### Every reactive `${}` slot must be a function

Arrow.js tracks dependencies lazily. A bare value is read once and never updated:

```js
// Static — renders once, never updates
${userState.users.length}

// Reactive — re-evaluates whenever userState.users changes
${() => userState.users.length}
```

### Never put HTML comments inside templates

Arrow.js uses HTML comment nodes internally to mark `${}` slot positions. Adding your own `<!-- -->` comments inside an `html\`...\`` template collides with this mechanism and throws `Uncaught Error: Invalid HTML position`.

```js
// Will break
html`
  <!-- Section header -->
  <h1>${() => title}</h1>
`

// Fine — use JS comments outside the template literal instead
// Section header
html`<h1>${() => title}</h1>`
```
