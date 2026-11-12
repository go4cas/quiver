# Quiver · Vite example

The smallest Quiver app built with Vite: three routes from `src/pages/`, one layout in `src/layouts/default.js`, a not-found page. `quiver()` from `@go4cas/quiver/vite` scans `src/` and serves the whole app as `quiver:app`, which `src/main.js` passes to `createApp(app, { target })`.

```sh
bun install
bun run dev                          # dev server at /
QUIVER_BASE=/sub/app/ bun run dev    # the same app under /sub/app/
bun run build && bun run preview     # production build
bun run test:e2e                     # dev server at /, production build under /sub/app/
```

The base path comes from Vite's `base` (`QUIVER_BASE` in `vite.config.js`), passed to `createApp(app, { target, base: import.meta.env.BASE_URL })`. Links use `url()`, so they carry the base.

`jsconfig.json` lists `@go4cas/quiver/client` in `types`, which types `import app from 'quiver:app'`.
