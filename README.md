<img src="docs/public/logo.svg" alt="Quiver" height="96">

```bash
bunx degit go4cas/quiver/starter my-app
```

A drop-in router, context and meta layer for [Arrow.js](https://arrow-js.com), with composables for any Arrow app, copy-in UI recipes, and a starter app that puts them together.

- **[`@go4cas/quiver`](packages/quiver)**: routing on the Navigation API with layouts, guards, `afterEach`/`onError`, base paths, `provide`/`inject` and `useMeta`. File-based routes through a Vite plugin, a `Bun.build` plugin or the `quiver routes` CLI. 13 exports, one peer dependency, no CSS.
- **[`arrow-use`](packages/arrow-use)**: `useFetch`, `useStorage`, `useMediaQuery` and `useEventListener` for any Arrow app, with or without Quiver.
- **[Recipes](recipes)**: theme tokens (`--q-*`), toasts, a theme switcher, layouts, loading and error views, `Link`, `useForm`, `hmrState`. Copied into your app, then yours.
- **[The starter](starter)**: a full app with five themes in plain CSS, Vitest, Playwright and screenshot tests, and agent docs for Claude Code, Codex and Copilot.

**Docs:** <https://go4cas.github.io/quiver/>

---

## Getting started

```bash
bunx degit go4cas/quiver/starter my-app
cd my-app
bun install
bun run dev
```

Open <http://localhost:5173>. With npm: `npx degit …`, then `npm install && npm run dev` (Node 22.22.2+ or 24.15+, which the starter's Vitest and jsdom need; the `quiver` package itself runs on Node 22.12+). Or [open it in StackBlitz](https://stackblitz.com/github/go4cas/quiver/tree/main/starter).

Or add Quiver to an Arrow app you already have:

```bash
bun add @go4cas/quiver @arrow-js/core
```

```js
// vite.config.js
import quiver from '@go4cas/quiver/vite'
export default { plugins: [quiver()] }      // the app from src/: pages/, layouts/, middleware/, views/
```

```js
// src/main.js
import { createApp } from '@go4cas/quiver'
import app from 'quiver:app'

await createApp(app, { target: '#app' })
```

Using `Bun.build` or no bundler at all? See [Getting started](https://go4cas.github.io/quiver/guide/getting-started) and the [examples](https://go4cas.github.io/quiver/examples).

**Browser support:** the router needs the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API): Chrome/Edge 102+, Safari 26.2+, Firefox 147+.

**Upgrading from the 2.x template?** Read the [migration guide](https://go4cas.github.io/quiver/guide/migration).

---

## AI tooling

- `AGENTS.md` and `llms.txt` ship inside `@go4cas/quiver`; the starter's `CLAUDE.md` imports both from `node_modules`.
- The Quiver Claude Code plugin has `/add-page`, `/add-component`, `/add-layout`, `/add-composable`, `/add-theme`, `/add-state`, `/add-feature` and `/add-test`. They install recipes (`/add-component toast`) or scaffold code. Install it with `/plugin marketplace add go4cas/quiver`, then `/plugin install quiver@quiver`.

See the [AI tooling guide](https://go4cas.github.io/quiver/guide/ai).

---

## This repository

A Bun workspace:

```
packages/quiver/     @go4cas/quiver: router, createApp, hooks, context, meta; /vite, /bun, /client, the CLI
packages/arrow-use/  arrow-use: the composables, with a vanilla Arrow example
recipes/             the copy-in recipes and their registry (shipped inside @go4cas/quiver)
plugins/quiver/      the Claude Code plugin with the /add-* commands
starter/             the starter app (the degit target)
examples/            vite, bun, no-build: one small app per build mode
docs/                this documentation site (VitePress)
tests/repo/          repo-wide checks; tests/pack/ checks the npm tarballs
```

| Command | What it does |
|---|---|
| `bun run dev` | Start the starter's Vite dev server |
| `bun run build` | Production build of the starter |
| `bun run typecheck` | Type-check every workspace (JSDoc, `tsc`) |
| `bun run test` | Repo checks, then every workspace's unit tests |
| `bun run test:e2e` | Playwright in the starter, the examples, `arrow-use`, the recipes and core's router suite (Chromium) |
| `bun run test:browsers` | Core's router suite in Chromium, Firefox and WebKit (`bunx playwright install firefox webkit` first) |
| `bun run test:visual` | Screenshot parity (only inside the pinned Playwright image) |
| `bun run pack:check` | `npm pack --dry-run` file lists for both packages |
| `bun run pack:try` | The examples and the starter, copied out, against the packed tarballs |
| `bun run pack:types` | The packed `.d.ts` in fresh TypeScript projects, `skipLibCheck` off |
| `bun run audit` | Dependency advisories in the lockfile, against `scripts/audit-exceptions.json` |
| `bun run recipes:sync` | Install `recipes/` into `starter/src/` by role after editing a recipe |
| `bun run docs:dev` / `docs:build` | Docs site |

## Contributing

Bug reports, fixes and documentation improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Licence

MIT
