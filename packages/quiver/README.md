# @go4cas/quiver

A drop-in router, context and meta layer for [Arrow.js](https://arrow-js.com) apps: routing on the Navigation API with layouts, guards, `afterEach`/`onError` hooks and base paths, `provide`/`inject`, and `useMeta`. Since 3.2 it also reads your app's folders (`pages/`, `layouts/`, `middleware/`, `views/`, `app.config.js`) into one `quiver:app` module, through a Vite plugin, a `Bun.build` plugin or the `quiver` CLI. Plain JavaScript with generated `.d.ts` types; `@arrow-js/core` is the only peer dependency, and no CSS ships with it.

```bash
bun add @go4cas/quiver @arrow-js/core
```

```js
// vite.config.js
import quiver from '@go4cas/quiver/vite'
export default { plugins: [quiver()] }    // serves quiver:app from src/ (pages/, layouts/, middleware/, views/)
```

```js
// src/main.js
import { beforeEach, onError, createApp, url } from '@go4cas/quiver'
import app from 'quiver:app'

beforeEach(({ to }) => (to === '/admin' ? '/login' : undefined))      // guards and hooks, optional
onError(({ error, phase }) => console.error(phase, error))
const mounted = await createApp(app, { target: '#app', base: import.meta.env.BASE_URL })

url('/users/42')     // the base-aware href, e.g. '/my/app/users/42'
mounted.destroy()    // tear down; createApp() works again
```

| Entry | |
|---|---|
| `@go4cas/quiver` | `initRouter`, `createApp`, `destroy`, `go`, `beforeEach`, `afterEach`, `onError`, `useRoute`, `useRouter`, `useMeta`, `url`, `provide`, `inject`, and the shared types |
| `@go4cas/quiver/vite` | Vite plugin for `quiver:app` and `quiver:routes` |
| `@go4cas/quiver/bun` | `Bun.build` plugin for `quiver:app` and `quiver:routes` |
| `@go4cas/quiver/client` | types for `quiver:app` and `quiver:routes` (add to `compilerOptions.types`) |
| `quiver app [--src] [--out] [--watch]`, `quiver routes [--dir] [--out] [--watch]` | CLI that writes `src/app.gen.js` or `src/routes.gen.js` |

The package also carries `recipes/` (toasts, layouts, theme tokens, views and more, to copy into your app), `AGENTS.md` and `llms.txt` for AI assistants.

Paths are base-relative everywhere except `url()` output. The router needs the [Navigation API](https://developer.mozilla.org/docs/Web/API/Navigation_API): Chrome/Edge 102+, Safari 26.2+, Firefox 147+. The plugins and CLI run on Node 22.12+ or Bun 1.4.4+.

Docs: <https://go4cas.github.io/quiver/> · [API reference](https://go4cas.github.io/quiver/api/core) · [Migrating from 2.x](https://go4cas.github.io/quiver/guide/migration)

MIT licensed.
