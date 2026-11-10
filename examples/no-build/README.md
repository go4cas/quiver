# Quiver · No-build example

The same app as `examples/vite`, with no bundler and no build step: the browser loads `src/` as is, and an import map resolves the two bare specifiers.

```sh
bun install
bun run dev                                   # http://localhost:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run dev   # under /sub/app/
bun run test:e2e                              # at / and under /sub/app/
```

## How it works

- **Import map.** `index.html` maps exactly `@arrow-js/core` and `@go4cas/quiver`. Quiver's own files import Arrow by its bare name, so the app and Quiver share one Arrow copy. A second copy (a CDN `+esm` bundle, or a path straight into another package's files) breaks reactivity without an error. The e2e test checks that Arrow loads from one URL.
- **Routes.** `src/routes.js` is the route manifest, written by hand. To generate it from `src/pages/` instead, run `bunx quiver routes --watch`, which writes `src/routes.gen.js`.
- **Base path.** `<base href>` in `index.html` sets it. `initRouter()` reads it, and every relative URL in the page resolves against it.
- **Server.** `serve.js` serves this folder plus the two packages from `node_modules` under `vendor/`, with an SPA fallback. It only exists so the example runs offline and in CI.

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

This works once `@go4cas/quiver` 3.0.0 is on npm.
