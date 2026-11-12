# @go4cas/quiver/vite

```js
import quiver from '@go4cas/quiver/vite'
```

A Vite plugin that scans a pages folder and serves the route manifest as the virtual module `quiver:routes`. Since 3.2 it also serves `quiver:app`, the [app manifest](#quiver-app) for a whole source folder.

## quiver

```ts
quiver(options?: { dir?: string, srcDir?: string }): VitePluginLike
```

| Option | Type | Default | |
|---|---|---|---|
| `srcDir` | `string` | `'src'` | source folder for `quiver:app` (layouts, middleware, views, `app.config.js`), relative to Vite's `root` (3.2) |
| `dir` | `string` | `'<srcDir>/pages'` | pages folder, relative to Vite's `root` |

```js
// vite.config.js
import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

export default defineConfig({
  base: process.env.QUIVER_BASE ?? '/',
  plugins: [quiver()],
})
```

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from 'quiver:app'

await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })
```

A [manual setup](/guide/manual-setup) imports the routes alone instead: `import routes, { notFound } from 'quiver:routes'`, then `await initRouter({ routes, notFound, base })`.

- `quiver:routes`' default export is the route manifest (each page a dynamic `import()`, so Vite code-splits per page), and `notFound` is the root `not-found.js` loader or `undefined`. File rules: [routing](/guide/routing#file-based-routes).
- In dev, adding or removing a page under `dir` rebuilds the modules and reloads the page. Files the scanner skips (a name or folder starting with `_` or `.`) don't trigger a reload. Editing a page is normal HMR.
- A scan error (duplicate routes, a nested `not-found.js`, an invalid param name) shows in Vite's error overlay in dev and fails `vite build`. Each message starts with `[quiver] ` and names the files.
- It works in Vitest too: add it to `vitest.config.js` and tests can import `quiver:app` and `quiver:routes`.
- The return type is a small structural type, not Vite's `Plugin`, so the package has no `vite` dependency or peer.
- Tested with Vite 8 (`^8.3.6`, the range the starter and the example declare): the starter and [`examples/vite`](/examples#vite) build and run their e2e suites on it, and the packed types are checked inside Vite 8's `defineConfig()`. Earlier Vite versions are not tested.

## quiver:app

New in 3.2. `import app from 'quiver:app'` gives the app manifest for `srcDir`: one object with everything the folder conventions describe.

| Key | From | |
|---|---|---|
| `routes`, `notFound` | `pages/` | the same manifest as `quiver:routes` |
| `layouts` | `layouts/<name>.js` | `{ <name>: Layout }`; `default.js` is the layout for pages that name none |
| `middleware` | `middleware/*.js`, `pages/**/_middleware.js` | `{ global: [guard, …], sections: { '/admin': [guard], … } }`; global middleware in file-name order |
| `views` | `views/loading.js`, `views/error.js` | `{ loading?, error? }` |
| `nav` | each page's `meta.nav: { label, order? }` | `[{ to, label }]`, sorted by `order`, then path |
| `config` | `app.config.js` | its default export, or `{}` |

- `layouts/`, `middleware/` and `views/` are read one level deep. Names starting with `_` or `.` are skipped, so `layouts/_parts/` can hold helpers, and other file types (a layout's CSS) are ignored. Any other subfolder, a layout name other than letters, digits and `-`, or a file in `views/` other than `loading.js` and `error.js` is a scan error.
- `meta.nav` and `meta.layout` are read at build time, without running the page, so `meta` must be a plain literal (strings, numbers, booleans, objects, arrays). The plugin warns, and never fails the build, when it can't read a `meta` that mentions them, when `meta.nav` has the wrong shape or sits on a route with a parameter or on `not-found.js`, and when `meta.layout` names no file in `layouts/`.
- In dev, adding or removing any of those files rebuilds the module and reloads the page. Editing a page reloads only when its `meta.nav` or `meta.layout` changed the module.
- Without Vite or Bun, [`quiver app`](./cli#quiver-app) writes the same module to a file.

For types on the `quiver:routes` and `quiver:app` imports, see [`@go4cas/quiver/client`](./client).
