# Getting Started

Quiver comes in four parts. Use the ones you need:

| Part | What it is | How you get it |
|---|---|---|
| [`@go4cas/quiver`](/api/core) | The router, layouts, guards and hooks, `provide`/`inject`, `useMeta`, plus file-based routing for Vite, Bun or a CLI | `bun add @go4cas/quiver @arrow-js/core` |
| [`arrow-use`](/arrow-use/) | Composables for any Arrow.js app: `useFetch`, `useStorage`, `useMediaQuery`, `useEventListener` | `bun add arrow-use` |
| [Recipes](/recipes/) | Theme tokens, toasts, theme switcher, layouts, loading and error views, `Link`, `useForm`, `hmrState`: code you copy into your app and own | shipped inside `@go4cas/quiver`; `/add-*` commands copy them |
| The starter | A complete app that uses all of the above, with tests | `bunx degit go4cas/quiver/starter my-app` |

## Requirements

- **Browsers.** The router is built on the Navigation API: Chrome and Edge 102+, Safari 26.2+, Firefox 147+. There is no fallback; see [browser support](./routing#browser-support).
- **Tooling.** [Bun](https://bun.com) 1.4.4+, or Node.js 22.12+ with npm. The `quiver routes` CLI and the Vite plugin run on either; the Bun plugin needs Bun.
- **Arrow.js.** `@arrow-js/core` 1.0.6+ is a peer dependency of both packages. Install it yourself, once, so the app and Quiver share one copy.

## Start from the starter

The starter is a full app: a dashboard, a team list with detail pages, a login form, posts from an API, toasts, five themes in light and dark, and unit, e2e and screenshot tests.

```bash
bunx degit go4cas/quiver/starter my-app
cd my-app
bun install
bun run dev
```

Open <http://localhost:5173>. Then read [Feature workflow](./workflow) to add your first page.

With npm: `npx degit go4cas/quiver/starter my-app`, then `npm install && npm run dev`.

### What's in it

```
my-app/
├── index.html           # sets the stored theme before the app loads (no flash)
├── vite.config.js       # quiver() from @go4cas/quiver/vite builds the route manifest
├── public/              # served as-is: logo.svg, favicon
├── src/
│   ├── main.js          # provide(), initRouter(), createApp()
│   ├── pages/           # one file per route
│   ├── layouts/         # index.js: the layouts map (recipe layouts + yours)
│   ├── components/      # your components, each with its CSS beside it
│   ├── state/           # your global reactive() stores
│   ├── quiver/          # recipe copies: theme, layouts, toasts, views, … (yours to edit)
│   ├── assets/          # images imported from JS (hashed on build)
│   ├── style.css        # CSS entry: layer order, then every stylesheet
│   └── app.css          # the app's own page styles
└── tests/
    ├── unit/            # Vitest
    ├── e2e/             # Playwright, at / and under /sub/app/
    └── visual/          # screenshot parity, 5 themes × 2 modes
```

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server with HMR |
| `bun run build` / `bun run preview` | Production build to `dist/`, and a local preview of it |
| `bun run test` / `bun run test:watch` | Unit tests (Vitest) |
| `bun run test:e2e` | End-to-end tests (Playwright) |
| `bun run test:visual` | Screenshot parity; only matches inside the pinned Playwright image ([testing](./testing#screenshots)) |
| `bun run typecheck` | `tsc` over the JSDoc types (`checkJs`, no build step) |

`src/quiver/` holds copies of the [recipes](/recipes/). They are your code now: edit them, or delete the ones you don't use (and their `@import` lines in `style.css`).

## Add Quiver to an app

Whatever the build, the app does the same four things, in this order:

```js
import { provide, beforeEach, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'   // or './routes.gen.js', or a hand-written manifest

provide('app', { name: 'My app' })                  // 1. context, if any
beforeEach(({ to }) => (to === '/admin' ? '/login' : undefined))   // 2. guards and hooks, if any
await initRouter({ routes, notFound })              // 3. the router resolves the first route
createApp({ target: '#app', layouts, defaultLayout: 'main' })      // 4. mount
```

A page is a module in `src/pages/` that default-exports a function returning an Arrow template:

```js
// src/pages/index.js → /
import { html } from '@arrow-js/core'

export const meta = { title: 'Home' }

export default function Home() {
  return html`<h1>Hello</h1>`
}
```

The build mode only decides where `routes` comes from.

### With Vite

```bash
bun add @go4cas/quiver @arrow-js/core
bun add -d vite
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

export default defineConfig({ plugins: [quiver()] })   // scans src/pages/
```

```js
// src/main.js
import { initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'

await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
createApp({ target: '#app' })
```

For types on `quiver:routes`, add `"@go4cas/quiver/client"` to `compilerOptions.types` in `jsconfig.json` ([details](/api/client)). Full app: [`examples/vite`](/examples#vite).

### With Bun.build

```bash
bun add @go4cas/quiver @arrow-js/core
```

```js
// build.js: bun build.js
import quiver from '@go4cas/quiver/bun'

await Bun.build({
  entrypoints: ['src/main.js'],
  outdir: 'dist',
  splitting: true,          // one chunk per page
  plugins: [quiver()],      // serves quiver:routes for src/pages/
})
```

`src/main.js` is the same as with Vite, minus the `base` option: give the page a `<base href="/">` (or `/sub/app/`) and `initRouter()` reads the base from it. Serve `dist/` with a fallback to `index.html` for unknown paths. Full app: [`examples/bun`](/examples#bun).

### Without a bundler

The browser loads your source as-is. An import map resolves the two bare names, and a route manifest comes from the CLI or is written by hand:

```html
<base href="/" />
<script type="importmap">
  {
    "imports": {
      "@arrow-js/core": "https://cdn.jsdelivr.net/npm/@arrow-js/core@1.0.6/dist/index.mjs",
      "@go4cas/quiver": "https://cdn.jsdelivr.net/npm/@go4cas/quiver@3/src/index.js"
    }
  }
</script>
<script type="module" src="src/main.js"></script>
```

```bash
bunx quiver routes --watch     # writes src/routes.gen.js from src/pages/
```

```js
// src/main.js
import { initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from './routes.gen.js'

await initRouter({ routes, notFound })
createApp({ target: '#app' })
```

Map each package to its files, never to a bundled `+esm` build: Quiver imports `@arrow-js/core` by name, and a second Arrow copy breaks reactivity without an error. Full app: [`examples/no-build`](/examples#no-build).

## Add the UI pieces

Core renders no CSS and no chrome: its default loading view is `<p>Loading…</p>`. The look of the starter comes from [recipes](/recipes/), which you copy into `src/quiver/`:

- with the Quiver Claude Code plugin: `/add-component toast`, `/add-layout menu`, `/add-theme ocean`, `/add-composable useForm` ([AI tooling](./ai))
- by hand: the steps in [installing a recipe](/recipes/#installing-a-recipe)

Then style your own components on the same `--q-*` tokens ([theming](./theming)).

## Next steps

- [Routing](./routing): pages, params, guards, hooks, base paths
- [Layouts](./layouts) and [Components](./components)
- [Composables](./composables): what comes from core, `arrow-use` and the recipes
- [Migrating from 2.x](./migration), if you started from the 2.x template
