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
- **Tooling.** [Bun](https://bun.com) 1.4.4+, or Node.js with npm. The `quiver routes` CLI and the Vite plugin run on Node 22.12+ or Bun; the Bun plugin needs Bun. The starter's test stack (Vitest with jsdom) needs Node 22.22.2+ on the 22 line, or 24.15+.
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

Whatever the build, the app has an element to mount into and does the same four things, in this order:

```html
<!-- index.html (the script tag for each build mode is below) -->
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

```js
// src/main.js
import { html } from '@arrow-js/core'
import { provide, beforeEach, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'   // or './routes.gen.js', or a hand-written manifest

/** @type {import('@go4cas/quiver').Layout} */
const MainLayout = (page) => html`<main>${page}</main>`

provide('app', { name: 'My app' })                  // 1. context, if any
beforeEach(({ to }) => (to === '/admin' ? '/' : undefined))        // 2. guards and hooks, if any
await initRouter({ routes, notFound })              // 3. the router resolves the first route
createApp({ target: '#app', layouts: { main: MainLayout }, defaultLayout: 'main' })   // 4. mount
```

Steps 1 and 2 are optional, and so are `layouts` and `defaultLayout`: without them pages render bare into `#app` ([layouts](./layouts)).

A page is a module in `src/pages/` that default-exports a function returning an Arrow template:

```js
// src/pages/index.js → /
import { html } from '@arrow-js/core'

export const meta = { title: 'Home' }

export default function Home() {
  return html`<h1>Hello</h1>`
}
```

Every route is a page of the app, so the server must answer a deep link such as `/users/1` with `index.html` (an SPA fallback). Vite's dev server and `vite preview` do this; for the other modes it is spelled out below.

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

`src/main.js` is the same as with Vite, minus the `base` option: `initRouter()` reads the base from `<base href>`. `index.html` stays beside `build.js`, outside `dist/`, and loads the built entry by a relative URL, so it resolves against the base:

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="/" />          <!-- or /sub/app/ under a sub-path -->
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="main.js"></script>   <!-- dist/main.js -->
  </body>
</html>
```

Serve it so that, under the base:

- a path that is a file in `dist/` gets that file (`main.js` and the page chunks),
- any other path with a file extension gets a 404,
- every other path gets `index.html`, so a deep link such as `/users/1` opens the app on that page.

The example's [`serve.js`](https://github.com/go4cas/quiver/blob/main/examples/bun/serve.js) does exactly this with `Bun.serve` (`bun build.js && bun serve.js`, then <http://127.0.0.1:3000/>); any static host with the same fallback works. Full app: [`examples/bun`](/examples#bun).

### Without a bundler

The browser loads your source as-is. An import map resolves the two bare names, and a route manifest comes from the CLI or is written by hand:

```html
<!-- index.html -->
<base href="/" />
<script type="importmap">
  {
    "imports": {
      "@arrow-js/core": "https://cdn.jsdelivr.net/npm/@arrow-js/core@1.0.6/dist/index.mjs",
      "@go4cas/quiver": "https://cdn.jsdelivr.net/npm/@go4cas/quiver@3/src/index.js"
    }
  }
</script>
<div id="app"></div>
<script type="module" src="src/main.js"></script>
```

Generate the manifest from `src/pages/` with the CLI. In a folder with no `node_modules`, name the scoped package so the runner can't pick up an unrelated package called `quiver`:

```bash
bunx --bun --package @go4cas/quiver@3 quiver routes --watch          # with Bun
npm exec --package=@go4cas/quiver@3 -- quiver routes --watch         # with npm
```

Both write `src/routes.gen.js`. Import that file in `src/main.js`; a hand-written manifest (`src/routes.js` in the example) works the same way, but don't keep both:

```js
// src/main.js
import { initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from './routes.gen.js'

await initRouter({ routes, notFound })
createApp({ target: '#app' })
```

Serve the folder with the same fallback as for Bun: files as they are, a 404 for a missing file, and `index.html` for every other path under the base. The example's [`serve.js`](https://github.com/go4cas/quiver/blob/main/examples/no-build/serve.js) does this, and serves the two packages from `node_modules` instead of a CDN.

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
