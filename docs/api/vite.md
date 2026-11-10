# @go4cas/quiver/vite

```js
import quiver from '@go4cas/quiver/vite'
```

A Vite plugin that scans a pages folder and serves the route manifest as the virtual module `quiver:routes`.

## quiver

```ts
quiver(options?: { dir?: string }): VitePluginLike
```

| Option | Type | Default | |
|---|---|---|---|
| `dir` | `string` | `'src/pages'` | pages folder, relative to Vite's `root` |

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
import { initRouter } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'

await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
```

- The module's default export is the manifest (each page a dynamic `import()`, so Vite code-splits per page), and `notFound` is the root `not-found.js` loader or `undefined`. File rules: [routing](/guide/routing#file-based-routes).
- In dev, adding or removing a `.js` file under `dir` rebuilds the module and reloads the page. Editing a page is normal HMR.
- A scan error (duplicate routes, a nested `not-found.js`, an invalid param name) shows in Vite's error overlay in dev and fails `vite build`. Each message starts with `[quiver] ` and names the files.
- It works in Vitest too: add it to `vitest.config.js` and tests can import `quiver:routes`.
- The return type is a small structural type, not Vite's `Plugin`, so the package has no `vite` dependency or peer. Any Vite version that runs on Node 22.12 works.

For types on the `quiver:routes` import, see [`@go4cas/quiver/client`](./client).
