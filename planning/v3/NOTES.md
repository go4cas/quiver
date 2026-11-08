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
