# API reference

Every public entry point, with its signature, options and a short example.

| Entry point | What it is | Page |
|---|---|---|
| `@go4cas/quiver` | the router, `createApp`, guards and hooks, `useRoute`/`useRouter`/`useMeta`, `url`, `provide`/`inject`, and the shared types | [core](./core) |
| `@go4cas/quiver/vite` | Vite plugin serving `quiver:app` from `src/` and `quiver:routes` from `src/pages/` | [vite](./vite) |
| `@go4cas/quiver/bun` | `Bun.build` plugin serving `quiver:app` and `quiver:routes` | [bun](./bun) |
| `@go4cas/quiver/client` | types for the `quiver:app` and `quiver:routes` virtual modules | [client](./client) |
| `quiver app`, `quiver routes` | CLI writing the app or route manifest to a file | [cli](./cli) |
| `arrow-use` | `useFetch`, `useStorage`, `useMediaQuery`, `useEventListener` | [arrow-use](./arrow-use) |

## Types

Both packages are plain JavaScript with JSDoc. When they are packed, `tsc` turns the JSDoc into `.d.ts` files, and each entry's `exports` condition lists `types` first, so TypeScript and `checkJs` projects get types with no extra setup:

```js
/** @type {import('@go4cas/quiver').RouteManifest} */
const routes = { '/': () => import('./pages/index.js') }

/** @type {import('arrow-use').UseFetchReturn} */
let posts
```

## Versions

| Package | Version | Peer dependency | Runtime |
|---|---|---|---|
| `@go4cas/quiver` | 3.2.0 | `@arrow-js/core` `^1.0.6` | browsers with the Navigation API; the plugins and CLI on Node 22.12+ or Bun 1.4.4+ |
| `arrow-use` | 0.1.2 | `@arrow-js/core` `^1.0.6` | any browser; imports safely on a server |

Neither package has runtime dependencies. Recipes are not an entry point: they ship as files under `node_modules/@go4cas/quiver/recipes/` for you to copy ([recipes](/recipes/)).
