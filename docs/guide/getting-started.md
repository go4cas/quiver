# Getting Started

::: tip Try it online
Open the full Quiver starter in your browser — no installation needed.

[Open in StackBlitz →](https://stackblitz.com/github/go4cas/quiver)
:::

## Prerequisites

- Node.js 20.19+ (required by Vite 8)
- npm 10+

## Browser support

Quiver's router is built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API), so the apps you build with it run in modern browsers only:

| Browser | Minimum version |
|---|---|
| Chrome | 102 |
| Edge | 102 |
| Safari | 26.2 |
| Firefox | 147 |

## Installation

Scaffold a fresh project without Quiver's git history:

```bash
npx degit go4cas/quiver my-app
cd my-app
npm install
```

Or clone the repository directly (keeps the full history), or click **Use this template** on [GitHub](https://github.com/go4cas/quiver):

```bash
git clone https://github.com/go4cas/quiver
cd quiver
npm install
```

## Running the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app hot-reloads on every save.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run typecheck` | Type-check `src/` via JSDoc annotations (tsc `checkJs`, no build step) |
| `npm run docs:dev` | Start the documentation site locally |
| `npm run docs:build` | Build the documentation site |
| `npm run docs:preview` | Preview the built documentation site locally |

## Folder structure

```
public/              # Served at root URL as-is — favicon, OG images, robots.txt

src/
├── assets/          # Images, SVGs, fonts — imported in components, hashed on build
├── framework/       # Router, DI, store, app bootstrap — framework internals
├── pages/           # File-based routes
├── layouts/         # Page wrapper components
├── components/      # Reusable UI components
├── state/           # Global reactive state modules
├── composables/     # Reusable logic functions
├── utils/           # Pure helper functions
└── main.js          # App entry point

tests/
├── framework/       # Unit tests for framework utilities (Vitest)
├── composables/     # Unit tests for composables (Vitest)
└── e2e/             # End-to-end tests (Playwright)

docs/
├── guide/           # Developer guides
└── api/             # API reference
```

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
| `tests/framework/` | Unit tests for any pure utilities you write |
| `tests/composables/` | Unit tests for composables you write |

## What to leave as-is

These are framework internals — no need to touch them for normal development.

| File / Directory | Why |
|---|---|
| `src/framework/` | Router, DI context, store wrapper, and app bootstrap. Modify only if extending the framework itself. |
| `src/main.js` | Entry point. Only change it to add a top-level `provide()` call or a plugin. |
| `vitest.config.js` | Leave unless changing which test directories are scanned. |
| `playwright.config.js` | Leave unless changing test directories or the dev server port. |
| `vite.config.js` | Leave unless adding Vite plugins. |

Ready to build something? See the [feature workflow](./workflow) guide.

---

## Two Arrow.js packages

Quiver uses two Arrow.js packages, each with a distinct role:

| Package | Used for |
|---|---|
| `@arrow-js/core` | `reactive()`, `html`, `component()`, `watch()`, `onCleanup()`, `nextTick()` — the reactive primitives you use every day |
| `@arrow-js/framework` | `render()` — attaches an Arrow.js template to a DOM node. Called once inside `src/framework/app.js` and not needed in user code |

You will only ever import from `@arrow-js/core` in your pages, components, and composables.

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
