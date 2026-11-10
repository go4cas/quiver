# Quiver · Bun example

The same app as `examples/vite`, bundled by `Bun.build` instead of Vite. `quiver()` from `@go4cas/quiver/bun` serves the route manifest as `quiver:routes`, and `splitting: true` gives each page its own chunk.

```sh
bun install
bun run dev                                     # build to dist/, serve at http://localhost:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run start   # serve the same dist/ under /sub/app/
bun run test:e2e                                # at / and under /sub/app/
```

- `build.js` runs `Bun.build` with the plugin.
- `serve.js` is a small `Bun.serve` static server for `dist/` with an SPA fallback (paths that aren't files get `index.html`). Any static host with the same fallback works.
- The base path lives only in `<base href>` in `index.html`, which `serve.js` fills in from `QUIVER_BASE`. `initRouter()` reads it from there, and chunk imports are relative, so one build serves at any base.
- `%BASE%` in `index.html` is a placeholder, not a URL: `serve.js` replaces it with `QUIVER_BASE` (default `/`) on every request. On another host, write the base yourself (`<base href="/" />`, or `<base href="/sub/app/" />` under a sub-path), or have your server fill it in the same way. Opened as-is, the page has no valid base.
