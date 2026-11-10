# Examples

Each example is a small, complete app in the [repository](https://github.com/go4cas/quiver), with its own `package.json` and a Playwright smoke test that runs in CI. Every one also passes against the packed npm tarballs (`bun run pack:try`), so what you copy out is what users get.

To run one on its own, copy its folder out of the repository (or use `degit`), then install:

```bash
bunx degit go4cas/quiver/examples/vite my-app
cd my-app
bun install
bun run dev
```

| Example | Build | Shows | Port in CI |
|---|---|---|---|
| [`examples/vite`](https://github.com/go4cas/quiver/tree/main/examples/vite) | Vite | the `quiver()` Vite plugin, dev server and production build | 5180, 5190 under `/sub/app/` |
| [`examples/bun`](https://github.com/go4cas/quiver/tree/main/examples/bun) | `Bun.build` | the Bun plugin with page splitting | 5181, 5191 |
| [`examples/no-build`](https://github.com/go4cas/quiver/tree/main/examples/no-build) | none | an import map and a hand-written manifest | 5182, 5192 |
| [`packages/arrow-use/example`](https://github.com/go4cas/quiver/tree/main/packages/arrow-use/example) | none | all four `arrow-use` composables in a vanilla Arrow app, no Quiver | 5183 |
| [`starter`](https://github.com/go4cas/quiver/tree/main/starter) | Vite | the full app: recipes, five themes, guards, forms, toasts, unit/e2e/screenshot tests | 5173, 5174 |

The three `examples/` apps are the same app (three routes, one layout, a not-found page), so they differ only in how the route manifest is made and how the app is served. Each runs its suite twice: at `/`, and under the base path `/sub/app/`.

## Vite

[`examples/vite`](https://github.com/go4cas/quiver/tree/main/examples/vite): `quiver()` from `@go4cas/quiver/vite` scans `src/pages/` and serves the manifest as `quiver:routes`. The base comes from Vite's `base` (`QUIVER_BASE`) through `import.meta.env.BASE_URL`.

```bash
bun run dev                          # dev server at http://localhost:5173/
QUIVER_BASE=/sub/app/ bun run dev    # the same app under /sub/app/
bun run build && bun run preview     # production build
bun run test:e2e                     # dev server at /, production build under /sub/app/
```

## Bun

[`examples/bun`](https://github.com/go4cas/quiver/tree/main/examples/bun): `build.js` runs `Bun.build` with `@go4cas/quiver/bun` and `splitting: true`, so each page is its own chunk. `serve.js` is a tiny static server with an SPA fallback.

```bash
bun run dev                                     # build to dist/, serve at http://localhost:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run start   # serve the same dist/ under /sub/app/
bun run test:e2e
```

The base lives only in `<base href="%BASE%">` in `index.html`: `%BASE%` is a placeholder that `serve.js` fills in from `QUIVER_BASE`. On another host, write the real base there.

## No build

[`examples/no-build`](https://github.com/go4cas/quiver/tree/main/examples/no-build): the browser loads `src/` as it is. An import map maps exactly `@arrow-js/core` and `@go4cas/quiver`, so the app and Quiver share one Arrow copy (the e2e test checks it), and `src/routes.js` is the manifest, written by hand (or generated with `bunx quiver routes --watch`).

```bash
bun run dev                                   # http://localhost:3000/
QUIVER_BASE=/sub/app/ PORT=3000 bun run dev   # under /sub/app/
bun run test:e2e
```

Its README shows the CDN import map to use instead of `node_modules`.

## arrow-use

[`packages/arrow-use/example`](https://github.com/go4cas/quiver/tree/main/packages/arrow-use/example): a vanilla Arrow app, no Quiver, no bundler, using `useFetch`, `useStorage`, `useMediaQuery` and `useEventListener` through an import map. From `packages/arrow-use/`:

```bash
bun example/serve.js    # http://localhost:3000/
bun run test:e2e
```

## Starter

[`starter`](https://github.com/go4cas/quiver/tree/main/starter): the app [Getting Started](/guide/getting-started#start-from-the-starter) scaffolds, with every recipe in `src/quiver/`.

```bash
bunx degit go4cas/quiver/starter my-app
cd my-app && bun install && bun run dev
```

In a clone of the repository, `bun run dev` at the root runs it, and `bun run test:e2e` runs the starter and all the examples.
