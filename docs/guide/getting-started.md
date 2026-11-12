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
- **Tooling.** [Bun](https://bun.com) 1.4.4+, or Node.js with npm. The `quiver` CLI and the Vite plugin run on Node 22.12+ or Bun; the Bun plugin needs Bun. The starter's test stack (Vitest with jsdom) needs Node 22.22.2+ on the 22 line, or 24.15+.
- **Arrow.js.** `@arrow-js/core` 1.0.6+ is a peer dependency of both packages. Install it yourself, once, so the app and Quiver share one copy.

## Start from the starter

The starter is a full app: a dashboard, a team list with detail pages, a demo sign-in form (no real authentication), posts from an API, toasts, five themes in light and dark, and unit, e2e and screenshot tests.

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
├── vite.config.js       # quiver() from @go4cas/quiver/vite builds quiver:app from src/
├── public/              # served as-is: logo.svg, favicon
├── src/
│   ├── main.js          # one call: createApp(app, { target, base })
│   ├── app.config.js    # app name, logo, the demo user (provided by name)
│   ├── pages/           # one file per route; meta.nav adds a menu link
│   ├── layouts/         # default.js (centred card), menu.js (sidebar + header)
│   ├── views/           # loading.js, error.js
│   ├── components/      # your components and installed recipes (toasts, theme switcher, Link)
│   ├── composables/     # useForm, hmrState
│   ├── styles/          # the theme: tokens.css, base.css, effects.css, fonts
│   ├── state/           # your global reactive() stores
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

The layouts, views, `styles/`, and the toasts, theme switcher, `Link`, `useForm` and `hmrState` files are [recipes](/recipes/) installed into the folders where they belong. They are your code now: edit them, or delete the ones you don't use (and their `@import` lines in `style.css`). [App structure](./app-config) explains what each folder does.

## Add Quiver to an app

Whatever the build, the app has an element to mount into and a `src/` folder that Quiver reads:

```html
<!-- index.html (the script tag for each build mode is below) -->
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

```
src/
├── main.js
├── pages/          # required: one file per route
├── layouts/        # optional: default.js wraps every page that names no layout
├── middleware/     # optional: guards for every navigation
├── views/          # optional: loading.js, error.js
└── app.config.js   # optional: values for inject()
```

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from 'quiver:app'          // or './app.gen.js' without a bundler

await createApp(app, { target: '#app' })
```

`createApp(app, options)` provides the config, starts the router with the pages and middleware, and mounts the first page with its layout ([app structure](./app-config)). Register `beforeEach`, `afterEach` or `onError` before it if you need them.

A page is a module in `src/pages/` that default-exports a function returning an Arrow template:

```js
// src/pages/index.js → /
import { html } from '@arrow-js/core'

export const meta = { title: 'Home' }

export default function Home() {
  return html`<h1>Hello</h1>`
}
```

A layout is a module in `src/layouts/` with the same shape, taking the page as its argument:

```js
// src/layouts/default.js
import { html } from '@arrow-js/core'

export default function DefaultLayout(page) {
  return html`<main>${page}</main>`
}
```

Every route is a page of the app, so the server must answer a deep link such as `/users/1` with `index.html` (an SPA fallback). Vite's dev server and `vite preview` do this. For the other modes, the steps are below.

The build mode only decides where `app` comes from. To wire the router step by step instead, see [manual setup](./manual-setup).

### With Vite

```bash
bun add @go4cas/quiver @arrow-js/core
bun add -d vite
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

export default defineConfig({ plugins: [quiver()] })   // scans src/
```

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from 'quiver:app'

await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })
```

For types on `quiver:app`, add `"@go4cas/quiver/client"` to `compilerOptions.types` in `jsconfig.json` ([details](/api/client)). Full app: [`examples/vite`](/examples#vite).

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
  plugins: [quiver()],      // serves quiver:app for src/
})
```

`src/main.js` is the same as with Vite, minus the `base` option: the router reads the base from `<base href>`. (The [Bun example](/examples#bun) uses the [manual setup](./manual-setup) with `quiver:routes`; both work.) `index.html` stays beside `build.js`, outside `dist/`, and loads the built entry by a relative URL, so it resolves against the base:

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

The browser loads your source as-is. An import map resolves the two bare names, and the CLI writes the app module:

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

Generate it from `src/` with the CLI. In a folder with no `node_modules`, name the scoped package so the runner can't pick up an unrelated package called `quiver`:

```bash
bunx --bun --package @go4cas/quiver@3 quiver app --watch          # with Bun
npm exec --package=@go4cas/quiver@3 -- quiver app --watch         # with npm
```

Both write `src/app.gen.js`. Commit it, since nothing builds it on the fly, and import it in `src/main.js`:

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from './app.gen.js'

await createApp(app, { target: '#app' })
```

Serve the folder with the same fallback as for Bun: files as they are, a 404 for a missing file, and `index.html` for every other path under the base. The example's [`serve.js`](https://github.com/go4cas/quiver/blob/main/examples/no-build/serve.js) does this, and serves the two packages from `node_modules` instead of a CDN.

Map each package to its files, never to a bundled `+esm` build: Quiver imports `@arrow-js/core` by name, and a second Arrow copy breaks reactivity without an error. Full app: [`examples/no-build`](/examples#no-build).

## Add the UI pieces

Core renders no CSS and no chrome: its default loading view is `<p>Loading…</p>`. The look of the starter comes from [recipes](/recipes/), which you copy into the folders where they belong (`components/`, `layouts/`, `views/`, `styles/`, `composables/`):

- with the Quiver Claude Code plugin: `/add-component toast`, `/add-layout menu`, `/add-theme ocean`, `/add-composable useForm` ([AI tooling](./ai))
- by hand: the steps in [installing a recipe](/recipes/#installing-a-recipe)

Then style your own components on the same `--q-*` tokens ([theming](./theming)).

## Next steps

- [App structure](./app-config): the folders Quiver reads, `app.config.js` and menu links
- [Routing](./routing): pages, params, guards, hooks, base paths
- [Middleware](./middleware), [Layouts](./layouts) and [Components](./components)
- [Composables](./composables): what comes from core, `arrow-use` and the recipes
- [Migrating from 2.x](./migration), if you started from the 2.x template
