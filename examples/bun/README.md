# Quiver · Bun example

The same app as `examples/vite`, bundled by `Bun.build` instead of Vite. `quiver()` from `@go4cas/quiver/bun` serves the route manifest as `quiver:routes`, and `splitting: true` gives each page its own chunk.

```sh
bun install
bun run dev                                     # build to dist/, serve at http://127.0.0.1:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run start   # serve the same dist/ under /sub/app/
bun run test:e2e                                # at / and under /sub/app/
```

- `build.js` runs `Bun.build` with the plugin.
- `serve.js` is a small `Bun.serve` server for local development, not for production: it listens on `127.0.0.1` only, serves files from `dist/` only, answers a missing file with a 404 and every other path under the base with `index.html` (the SPA fallback, so deep links work), and refuses a `QUIVER_BASE` that isn't plain path segments (`/`, `/sub/app/`). Any static host with the same fallback works.
- The base path lives only in `<base href>` in `index.html`, which `serve.js` fills in from `QUIVER_BASE`. `initRouter()` reads it from there, and chunk imports are relative, so one build serves at any base.
- `%BASE%` in `index.html` is a placeholder, not a URL: `serve.js` replaces it with `QUIVER_BASE` (default `/`) on every request. On another host, write the base yourself (`<base href="/" />`, or `<base href="/sub/app/" />` under a sub-path), or have your server fill it in the same way. Opened as-is, the page has no valid base.
