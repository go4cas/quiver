# Quiver · No-build example

The same app as `examples/vite`, with no bundler and no build step: the browser loads `src/` as is, and an import map resolves the two bare specifiers.

```sh
bun install
bun run dev                                   # http://127.0.0.1:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run dev   # under /sub/app/
bun run test:e2e                              # at / and under /sub/app/
```

## How it works

- **Import map.** `index.html` maps exactly `@arrow-js/core` and `@go4cas/quiver`. Quiver's own files import Arrow by its bare name, so the app and Quiver share one Arrow copy. A second copy (a CDN `+esm` bundle, or a path straight into another package's files) breaks reactivity without an error. The e2e test checks that Arrow loads from one URL.
- **The app module.** `src/app.gen.js` is the app (routes from `src/pages/`, the layout in `src/layouts/default.js`), written by `bunx quiver app` and committed, since nothing builds it on the fly. After adding or removing a page or a layout, run `bunx quiver app` again, or keep `bunx quiver app --watch` running while you work (it uses the `@go4cas/quiver` this folder installs). `src/main.js` passes it to `createApp(app, { target })`.
- **Base path.** `<base href>` in `index.html` sets it. `createApp()` reads it, and every relative URL in the page resolves against it. The `%BASE%` there is a placeholder that `serve.js` replaces with `QUIVER_BASE` (default `/`); on any other host, write the real base in its place (`<base href="/" />`, or `<base href="/sub/app/" />` under a sub-path).
- **Server.** `serve.js` is a local development server, not for production: it listens on `127.0.0.1` only, serves `index.html`, `src/` and the files the import map needs from the two packages (`vendor/@arrow-js/core/dist/`, `vendor/@go4cas/quiver/src/`), and answers every other path under the base with `index.html` (an SPA fallback) or a 404 for a missing file. It only exists so the example runs offline and in CI.

## From a CDN

Without `node_modules`, point the import map at a CDN that serves the packages' files unchanged, not a bundled `+esm` build:

```html
<script type="importmap">
  {
    "imports": {
      "@arrow-js/core": "https://cdn.jsdelivr.net/npm/@arrow-js/core@1.0.6/dist/index.mjs",
      "@go4cas/quiver": "https://cdn.jsdelivr.net/npm/@go4cas/quiver@3/src/index.js"
    }
  }
</script>
```

Then generate `src/app.gen.js` without a local install. Name the scoped package, or the runner fetches the unrelated npm package called `quiver`:

```sh
bunx --bun --package @go4cas/quiver@3 quiver app --watch    # or:
npm exec --package=@go4cas/quiver@3 -- quiver app --watch
```
