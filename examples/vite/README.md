# Quiver · Vite example

The smallest Quiver app built with Vite: three routes from `src/pages/`, one layout, a not-found page. `quiver()` from `@go4cas/quiver/vite` scans `src/pages/` and serves the route manifest as `quiver:routes`.

```sh
bun install
bun run dev                          # dev server at /
QUIVER_BASE=/sub/app/ bun run dev    # the same app under /sub/app/
bun run build && bun run preview     # production build
bun run test:e2e                     # dev server at /, production build under /sub/app/
```

The base path comes from Vite's `base` (`QUIVER_BASE` in `vite.config.js`), passed to `initRouter({ base: import.meta.env.BASE_URL })`. Links use `url()`, so they carry the base.

`jsconfig.json` lists `@go4cas/quiver/client` in `types`, which types `import routes from 'quiver:routes'`.
