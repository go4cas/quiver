# Quiver v3 — findings log

Each thread adds a section before it writes code (§9 rule 3). Evidence comes before fixes.

## P0 — Decisions thread (2026-11-08, repo at `d4aa17d`)

Findings that changed or added decisions, with where each one was checked. The outcomes are in [DECISIONS.md](DECISIONS.md).

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N1 | Without a `<base>` element, `document.baseURI` is the document URL, so `new URL(document.baseURI).pathname` on a deep link returns the deep path (for example `/users/42`), not the app root | HTML spec: a document's base URL falls back to its own URL. `index.html` has no `<base>` | D10 replaced by D22 |
| N2 | A guard that throws leaves the old page in place, and the error surfaces only as a rejected navigation | `src/framework/router.js` `handleNavigate`: `runGuards` is awaited inside `intercept({ handler })` with no try/catch, so `routerState` is never set to `error` | D24 (`onError`, `phase: 'guard'`) |
| N3 | A page function that throws during render has no error view | `src/framework/app.js` `RouteOutlet` calls `Page()` without a try/catch | D24 (`phase: 'render'`) |
| N4 | `routerState` reads `window.location` at import time, which breaks R4 | `src/state/routerState.js`: `path: window.location.pathname \|\| '/'` | D25 |
| N5 | `routerState` is imported outside the framework | `src/components/Link.js`, `src/layouts/MenuLayout.js` | D26: both switch to `useRoute()` |
| N6 | The core falls back to a starter-specific layout name | `router.js`: `layout: meta.layout \|\| 'basic'`. `app.js`: `layouts[...] \|\| layouts.basic` | D28 (`defaultLayout`) |
| N7 | Core mounts a Tailwind-styled wrapper | `app.js`: `` html`<div class="min-h-screen">…` `` | D28 (no wrapper) |
| N8 | The 2.x toast exit hardcodes 200 ms in JS to match the CSS | `src/state/toastState.js` `dismiss()`: `setTimeout(…, 200)`. `src/style.css`: `toast-out 0.2s` | D31 |
| N9 | R7's grep matches planning files and the lockfile | `grep -ril tailwind` (excluding `.git`, `node_modules`) matches `planning/v3/SPEC.md` and `bun.lock` besides the expected 13 files | R7 refined (D34) |
| N10 | `CHANGELOG.md` has no `## [Unreleased]` section | the file goes straight from the header to `## [2.1.0]` | added in this PR |
| N11 | A degit copy of a workspace package that uses `workspace:*` can't install | `workspace:` is a workspace-only protocol, and degit copies only the subfolder | D19 (`^3.0.0` + CI check) |
| N12 | TS consumers get no types from published JSDoc `.js` | TS reads `.js` in `node_modules` only with `allowJs` + `maxNodeModuleJsDepth > 0` | D20 (`.d.ts` at `prepack`) |
| N13 | A `@layer quiver` declared after an app's own layers outranks them | CSS Cascade 5: layer order is first-declaration order, and later layers win | D29 |
| N14 | P7's Done-when can't pass as written: a plain Arrow app has neither the recipes nor the `/add-*` commands | recipes aren't in any published package, and the commands live only in `.claude/commands/` of this repo | D32 |
| N15 | Four Google Fonts are imported over the network, which makes screenshots flaky | `src/style.css` line 1: Audiowide, Orbitron, Space Grotesk, VT323 | D35 (self-host) |
| N16 | The `v2.1.0` tag exists, so the 2.x template stays reachable after the move | `git ls-remote --tags origin` lists `refs/tags/v2.1.0` at `1014c43` | D19 |
| N17 | `jsconfig.json` loads `vite/client` types for all of `src/` | `"types": ["vite/client"]` | D33 (core config leaves them out) |

The 2026-11-06 review evidence (Vite-isms, Tailwind footprint, the Bun 1.4.4 spike, npm names) is in the SPEC.md appendix and was not re-run here. P4 re-verifies the Bun spike.

## Architecture thread (2026-11-08, repo at `e809fee`)

Findings behind [TECH-SPEC.md](TECH-SPEC.md). Spikes ran in a scratch folder with Bun 1.4.4, Node 22.23 and TypeScript 7.0.2; nothing in the repo changed.

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| N18 | Bun links a `^3.0.0` dependency to a workspace package only when the workspace version satisfies the range. A prerelease (`3.0.0-alpha.0`) makes `bun install` go to npm and fail | scratch workspace: `3.0.0` → `bun.lock` has `"@x/core@workspace:packages/core"`; `3.0.0-alpha.0` → `GET https://registry.npmjs.org/@x%2fcore - 404`, `failed to resolve` | X-12: core is `3.0.0` from P2 |
| N19 | Typechecking `node:` imports under `checkJs` needs `@types/node`, which the repo doesn't have | `tsc --checkJs --strict --types ''` on a file importing `node:fs/promises`: `TS2591: Cannot find name 'node:fs/promises'`. `node_modules/@types/` has no `node` | Q-A in TECH-SPEC |
| N20 | `scoreRoute` has ties, so with key order irrelevant (D21) the match order is undefined | `scoreRoute('/a/:b') === scoreRoute('/:a/b') === 11`; both match `/a/b` | M-6 tie-break, M-4 |
| N21 | 2.x `go()` and guard redirects drop the query and hash | `router.js`: `go` calls `navigate(normalizePath(path))`; the redirect branch calls `navigate(normalizePath(result))`; `normalizePath` strips `?…` and `#…` | C-30, C-32 |
| N22 | 2.x intercepts form POST and download navigations | `handleNavigate` checks only `canIntercept`, `hashChange` and `info.rollback`, not `formData` or `downloadRequest` | §2 step 1 |
| N23 | 2.x caps redirects only on the initial load | `initRouter` loops at most 10 times; `handleNavigate`'s redirect branch has no counter | C-27 |
| N24 | `recipes/` at the repo root can't be listed in the core package's `files` | npm `files` entries are relative to the package folder | X-10: `prepack` copies it in |
| N25 | 2.x silently drops `not-found.js` files below the pages root | `resolveRoute`: `!r.file.endsWith('/not-found.js')` excludes them; only `../pages/not-found.js` is used | S-3 |
| N26 | TS 7.0.2 emits clean `.d.ts` from the 2.x JSDoc, so D20 works as written | `tsc --allowJs --declaration --emitDeclarationOnly` on `src/framework/context.js` and `meta.js` produced typed declarations, including the `@template` on `inject` | X-11 |
| N27 | `bun run --filter '*' <script>` skips workspaces without the script and runs dependents after their dependencies | scratch workspace: the package without `test` was skipped; `@x/core` ran before the starter that depends on it; exit 0 | W-2 |
| N28 | `initRouter` resolves before `createApp` mounts, so the initial navigation has no error view to show when it fails | 2.x `main.js`: `await initRouter()` then `createApp()` | C-44 |
| N29 | Render errors can only be caught inside the outlet's reactive slot, where `Page()` and `Layout()` are called | `app.js` `RouteOutlet` | C-48 |
| N30 | Arrow 1.0.6 has no public unmount; `onCleanup` callbacks run only when Arrow drops a chunk | `dist/index.d.ts` exports `html, svg, reactive, watch, component, onCleanup, nextTick, pick`; `onCleanup` throws `'onCleanup needs component'` outside one | C-49 step 6, C-50 |
| N31 | Playwright resolves `page.goto('/x')` against the origin, so a sub-path `baseURL` is lost unless tests use relative URLs | URL resolution: `new URL('/x', 'http://h/sub/app/')` is `http://h/x` | CI-3 |
