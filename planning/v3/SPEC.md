# Quiver v3 — drop-in refactor spec

Status: draft for the Decisions thread · Author: Cas · Date: 2026-11-08

## 1. Context

Quiver 2.x is a **starter template**: you `degit` it and own a fork. Its framework layer (`src/framework/`) is mixed in with an opinionated app shell (Vite, Tailwind v4, layouts, demo components).

A review for Audition (go4cas/audition) found three blockers to using Quiver inside an existing app:

1. **Tailwind v4.** Audition has its own `tokens.css` / `app.css`, so adopting Quiver would mean two styling systems.
2. **Vite-only.** The router discovers pages with `import.meta.glob`, which `Bun.build` leaves untouched. It throws `import.meta.glob is not a function` at runtime.
3. **No base path.** The router assumes the app lives at `/`. Audition is served from `/api/custom/app/`.

These are symptoms of the template model, not Audition problems. v3 turns Quiver into a **drop-in library** and keeps a starter as the first consumer.

## 2. Goals and non-goals

**Goals**

- G1. A small core that drops into any Arrow.js app: no bundler, styling or mount assumptions.
- G2. Three supported build modes: Vite, Bun.build, and no build (import map + CDN).
- G3. No Tailwind anywhere in Quiver. Plain CSS against a documented token contract.
- G4. Opinionated UI and features ship as copy-in **recipes**, so apps (and agents) own and edit them.
- G5. A separate, Arrow-only composables package (VueUse-style), usable without Quiver.
- G6. AI tooling (AGENTS.md, slash commands) works for any Quiver app, not only `degit` forks.

**Non-goals (v3)**

- Swapping Arrow.js, or SSR/hydration (that's `@arrow-js/ssr` / `@arrow-js/hydrate`).
- A formal plugin system (deferred until 2–3 real plugins exist, D13).
- A Navigation API fallback (deferred, D11).
- Multiple Quiver apps on one page (D12).

## 3. Target shape

| Layer | Contents | Assumes | Ships as |
|---|---|---|---|
| **Core** `@go4cas/quiver` | `initRouter`, `go`, `beforeEach`, `url()`, `useRoute`, `useRouter`, `useMeta`, `provide`/`inject`, `createApp` (target, layouts, slots, `destroy`) | `@arrow-js/core` only | npm package, plain ESM |
| **Route discovery** `@go4cas/quiver/vite`, `@go4cas/quiver/bun`, `quiver routes` CLI | One shared scanner: `pages/` → manifest | Its bundler / none | Subpath exports + bin |
| **Composables** `arrow-use` (name TBD, D4) | `useFetch`, `useStorage`, `useMediaQuery`, `useEventListener` (v0.1) | `@arrow-js/core` only (peer) | npm package |
| **Recipes** | `Link`, toasts, theme switcher, `useForm`, layouts, loading/error views | Core + composables | Copied into apps by `/add-*` |
| **Starter** | Demo app: pages, themes, recipes in use | Vite | `degit` |

**The rule for core:** something goes in core only if it needs framework internals (router, context, meta) or every app has to wire it into the framework. Everything else is a composable or a recipe.

## 4. Requirements

- R1. **No build-tool assumptions in core.** No `import.meta.glob`, no asset imports, no CSS imports. Routes come in as an explicit manifest.
- R2. **No styling in core.** Core renders no `class` attributes. Layouts and the loading/error views are injected, with bare unstyled defaults.
- R3. **No mount assumptions.**
  - `createApp({ target })` takes an element or selector, not a hardcoded `#app`.
  - `initRouter({ base })` defaults to `new URL(document.baseURI).pathname`.
  - Navigations outside the base are not intercepted.
  - `useRoute().path()` is base-relative.
- R4. **No hidden state the app can't reset.** Module singletons stay, but `destroy()` clears guards, context, meta watchers and router state, and removes the navigate listener. No module reads `window` at import time.
- R5. **One Arrow copy.** `@arrow-js/core` is a `peerDependency` of every package, and published files import it by its bare name.
- R6. **No-build works.** Core and composables run unbundled from a CDN behind an import map.
- R7. **Tailwind-free.** Repo-wide `grep -ri tailwind` matches only CHANGELOG history and the optional Tailwind guide.
- R8. **Agent context ships with the package.** `AGENTS.md` and `llms.txt` describe the public API and are included in the npm tarball.
- R9. **2.x users have a path.** A migration guide maps every 2.x pattern to its v3 replacement.

## 5. Decisions

**Agreed** = Cas confirmed it on 2026-11-06. **Proposed** = for the Decisions thread to confirm or change.

| # | Decision | Status |
|---|---|---|
| D1 | Quiver becomes a drop-in core plus a starter that consumes it | Agreed |
| D2 | Remove Tailwind entirely, whatever else changes | Agreed |
| D3 | Core package name `@go4cas/quiver`. `quiver` on npm is taken (2013 Node streams package), and `@quiver-js/core` already exists ("Micro framework for arrow-js", dormant) | Proposed |
| D4 | Composables package name `arrow-use` (free on npm as of 2026-11-06). Alternatives: `use-arrow`, `arrow-composables`, `@go4cas/arrow-use` | Proposed |
| D5 | Token prefix `--q-` (e.g. `--q-color-brand`, `--q-radius-panel`) | Proposed |
| D6 | Recipe CSS uses `@layer quiver`, `:where()` (zero specificity) and native nesting, and state is styled through attributes (`aria-current`, `data-type`), never utility variants | Proposed |
| D7 | Composables return getter functions (`data()`, `loading()`), matching the current `useFetch` | Agreed |
| D8 | Composables are Arrow composables, not Quiver ones: no Quiver imports, usable in plain Arrow apps | Agreed |
| D9 | Core takes an explicit route manifest. File-based discovery is optional: Vite plugin, Bun plugin, or codegen (`routes.gen.js`), all sharing one scanner | Proposed |
| D10 | `base` defaults to `<base href>` via `document.baseURI` | Proposed |
| D11 | Navigation API stays a hard requirement (Chrome/Edge 102+, Safari 26.2+, Firefox 147+), documented loudly. A history-API fallback is deferred until someone needs it | Proposed |
| D12 | Keep module singletons, one app per page, `destroy()` resets everything. An instance-per-app API is deferred | Proposed |
| D13 | No plugin system in v3. Possibly add `afterEach` / `onError` hooks, but no `plugins: []` option | Proposed |
| D14 | Bun workspaces: `packages/quiver/`, `packages/arrow-use/`, `starter/`, `recipes/`, `examples/`, `docs/` | Proposed |
| D15 | Versions: core `3.0.0`, composables `0.1.0` | Proposed |
| D16 | Publish to npm. Published files are source ESM + JSDoc (no build step), so the package is also vendorable as a folder | Proposed |
| D17 | `Link`, toasts, theme switcher, `useForm`, `hmrState`, layouts and loading/error views become recipes. `useFetch` moves to the composables package | Agreed |
| D18 | `Link` drops its `@click` handler (the Navigation API already intercepts plain `<a href>`, and the handler breaks Cmd/Ctrl/middle-click). Core adds `url(path)` for base-aware hrefs | Proposed |

### Open questions for the Decisions thread

- Q1. Does the starter stay at the repo root (so `bunx degit go4cas/quiver` keeps working) or move to `starter/` (`degit go4cas/quiver/starter`)?
- Q2. Also publish to JSR?
- Q3. v2.0 removed `createApp({ root, plugins })` on purpose. v3 brings back an options object (`target`, `layouts`, slots). How is that explained to 2.x users without looking like churn?
- Q4. How does toast exit timing decouple from CSS: an `exitMs` option, or `animationend` in the recipe markup?
- Q5. Do recipes ship a plain-CSS variant only, or plain CSS plus a Tailwind snippet in their README?
- Q6. Should `routerState` stay importable, or is it reachable only through `useRoute()`?
- Q7. Does the typecheck/CI setup run per workspace or from the root?

## 6. Core API sketch (proposed; Architecture finalises)

```js
import { initRouter, createApp, beforeEach, url } from '@go4cas/quiver'
import routes from 'quiver:routes'            // or a hand-written object, or ./routes.gen.js

beforeEach(({ from, to }) => { /* unchanged 2.x semantics, base-relative paths */ })

await initRouter({
  routes,                                     // { '/': () => import(...), '/runs/:id': () => import(...) }
  notFound: () => import('./pages/not-found.js'),
  base: '/api/custom/app/',                   // optional; default from <base href>
})

const app = createApp({
  target: '#app',                             // element or selector
  layouts: { basic: BasicLayout, menu: MenuLayout },
  loading: LoadingView,                       // optional; bare default
  error: ErrorView,                           // optional; receives the message
})

url('/runs/42')                               // '/api/custom/app/runs/42'
app.destroy()                                 // listener, guards, context, meta, router state
```

Page modules keep the 2.x contract: a default export page function, and an optional `export const meta = { layout, title }`.

## 7. Conventions

### CSS (D5, D6)

- `tokens.css` holds the token contract as `:root { --q-* }`, plus `[data-theme]` / `[data-mode]` override blocks. It's a direct port of today's `@theme` and theme blocks in `src/style.css`.
- A small `base.css` replaces the reset that Tailwind's preflight provided (`box-sizing`, margins, form-control inheritance, `antialiased` font smoothing).
- Recipe CSS:
  ```css
  @layer quiver {
    :where(.q-toast) {
      border-radius: var(--q-radius-panel);
      &[data-type="error"] { color: var(--q-color-error); }
    }
  }
  ```
  Any unlayered app CSS wins without `!important`, and one app class overrides a recipe.
- Per-theme effects (today's `theme-glass:`, `theme-brutalist:` variants) become `[data-theme="glass"] :where(.q-card) { … }`.

### Composables (D7, D8)

1. `@arrow-js/core` is a peer dependency, and only its public exports are used (no `/internal`).
2. Composables work inside and outside `component()`. Arrow's `onCleanup()` throws outside a component ("onCleanup needs component"), so register cleanup when inside one, and always return an explicit `stop()`.
3. Nothing runs at import. Browser APIs are guarded at call time (SSR- and test-safe).
4. No Quiver imports. Anything that needs the router belongs in core.
5. Return getters, not raw values.
6. Plain ESM + JSDoc, no build.
7. Tests run against bare `@arrow-js/core`, plus a vanilla Arrow example app in CI.

## 8. Phases

Each phase is one build thread and one PR. A phase is done only when every **Done when** item has evidence in the PR.

| # | Phase | Size | Depends on |
|---|---|---|---|
| P0 | Decisions (thread, not code) | S | – |
| P1 | Remove Tailwind, add the token contract | M | P0 |
| P2 | Workspace restructure (move only) | S | P1 |
| P3 | Core API | L | P2 |
| P4 | Route discovery | M | P3 |
| P5 | Build-mode proof | S | P4 |
| P6 | Composables package | M | P3 |
| P7 | Recipes + AI tooling | M | P1, P6 |
| P8 | Docs, migration guide, release | M | P5, P7 |

**P1 — Remove Tailwind.** Port `@theme` and the theme blocks to `tokens.css` (`--q-*`), add `base.css`, rewrite every `class` attribute (about 220 across 18 files) as plain CSS following §7, remove `tailwindcss`, `@tailwindcss/vite` and the Vite plugin, and update AGENTS.md, `/add-component`, `/add-theme`, `/add-layout` and the docs (index, theming, components, VitePress description).
Done when:
- a Playwright screenshot baseline (taken before any CSS change: every page × 5 themes × 2 modes) matches within an agreed tolerance
- unit, typecheck and e2e tests are green
- R7 holds

**P2 — Workspace restructure.** Bun workspaces per D14 (and Q1). Move `src/framework/`, `routerState`, `useRoute` and `useRouter` into `packages/quiver/`. Everything else moves to the starter, which imports `@go4cas/quiver`. No behaviour changes.
Done when:
- all suites are green
- a test or lint check proves nothing in `packages/quiver` imports from the starter

**P3 — Core API.** Implement §6 (R1–R5):
- manifest-based `initRouter` with `notFound` and `base`
- no interception outside the base
- `url()`
- `routerState` with no `window` read at import
- `createApp` with `target`, layouts and slots, plus bare defaults
- `destroy()`
- `Link` moved to the starter without `@click`
- unit tests for base matching, `url()` and teardown
Done when:
- an e2e run of the starter served under `/sub/app/` passes (deep link, back/forward, a link outside the base loads normally)
- an e2e check shows Cmd/Ctrl-click opens a new tab

**P4 — Route discovery.** One scanner (with today's `fileToRoutePath` / `scoreRoute` semantics, `[id]` → `:id`, `not-found`) behind `@go4cas/quiver/vite`, `@go4cas/quiver/bun` (a virtual `quiver:routes` module; proven to work with `Bun.build` splitting on Bun 1.4.4) and a `quiver routes [--watch]` CLI writing `routes.gen.js`. The starter goes back to file-based routing through the Vite plugin.
Done when: one fixture `pages/` folder produces an identical manifest through all three.

**P5 — Build-mode proof.** `examples/vite`, `examples/bun` and `examples/no-build` (import map, single Arrow copy, no CDN `+esm` bundles), each with a smoke e2e test and one variant under a base path, in CI.
Done when: all three pass in CI.

**P6 — Composables package.** `packages/arrow-use/` per §7 with `useFetch` (ported), `useStorage`, `useMediaQuery` and `useEventListener`, a conventions README, and a vanilla Arrow example.
Done when:
- tests pass against bare Arrow
- no Quiver import exists anywhere in the package (enforced by a check)

**P7 — Recipes + AI tooling.** A `recipes/` registry where each recipe has JS + CSS + README: Link, toasts (with Q4 resolved), theme switcher (built on `useStorage` + `useMediaQuery`), `useForm`, layouts, loading/error views. `/add-*` commands copy from the registry. AGENTS.md and `llms.txt` ship inside `packages/quiver`, and the starter's CLAUDE.md imports them. Optionally, package the commands as a Claude Code plugin.
Done when: a fresh plain-Arrow app (not the starter) gets a working toast via `/add-component toast`.

**P8 — Docs + release.** Docs site:
- getting started per build mode
- the token contract
- an optional Tailwind guide (exposing `--q-*` through a v4 `@theme`)
- the Navigation API note
- a 2.x → 3.0 migration guide
- the updated `degit` path

CHANGELOG. Prepare publishing `@go4cas/quiver@3.0.0` and `arrow-use@0.1.0`.
Done when: the docs build is green, and a dry-run publish (`npm pack`) shows the right files. Publishing happens only after Cas's go-ahead.

**Audition** can adopt Quiver after P3 merges, using a hand-written manifest. P4 adds file-based routing later.

## 9. Orchestrator rules

1. One branch per thread. Each thread stops at an open PR and never merges or pushes to `main`.
2. One build thread at a time. P4 and P6 may run in parallel only if Cas says so.
3. Phase 1 of every build thread reads before writing: confirm the current state of the files it will touch and record findings in `planning/v3/NOTES.md`. Evidence comes before fixes.
4. Before any PR: `bun run typecheck && bun run test && bun run test:e2e` green, with the output in the PR description.
5. Plain JS + JSDoc only. Don't convert to TypeScript. No new runtime dependencies. `@arrow-js/core` is the only peer dependency.
6. AGENTS.md is the single source of agent context. Any PR that changes a convention updates AGENTS.md in the same PR.
7. Every PR adds its user-visible changes under `## [Unreleased]` in CHANGELOG.md.
8. Stop and ask Cas before: changing the public API beyond `planning/v3/TECH-SPEC.md`, adding scope, adding a dependency, renaming a package, or anything touching npm, tags, releases or GitHub Pages settings.
9. Logical, conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
10. AGENTS.md's current **Scope** section ("Fix bugs in `src/framework/` … do not swap Arrow.js") describes the 2.x template. This spec supersedes it for v3. The Decisions PR rewrites that section.

## 10. Known pitfalls

- **Tailwind preflight.** Removing Tailwind also removes its CSS reset. Without `base.css`, buttons, headings and spacing shift everywhere.
- **Screenshot flakiness.** `style.css` imports Google Fonts. Self-host the fonts or wait for `document.fonts.ready` before capturing, and agree a tolerance.
- **Two Arrow copies.** Any duplicate `@arrow-js/core` (a dependency instead of a peer, a CDN `+esm` bundle, or a relative import) silently breaks reactivity.
- **Tailwind's `node_modules` scanning** is another reason recipes are copied in, not imported, even for apps that use Tailwind.
- **`hmrState`** depends on `import.meta.hot`. It works in Vite and Bun and falls back to plain `reactive()` in no-build mode.
- **VitePress builds everything under `docs/`.** Planning files live in `planning/v3/` so they never end up on the docs site.

## Appendix — evidence from the 2026-11-06 review

- Repo at `1014c43` (v2.1.0).
  - `src/framework/` has one Vite-ism (`import.meta.glob` in `router.js`) and one Tailwind class (`min-h-screen` in `app.js`).
  - `hmrState.js` uses `import.meta.hot` with a fallback.
  - `MenuLayout.js` hardcodes `src="/logo.svg"`.
- Bun 1.4.4:
  - `Bun.build` leaves `import.meta.glob` as-is, and it throws at runtime.
  - A roughly 15-line `onResolve`/`onLoad` plugin exposing a virtual `quiver:routes` module built with `Bun.Glob` works with `splitting: true` (one chunk per page).
- Tailwind footprint: about 220 `class="…"` attributes across 18 files under `src/`. Tailwind is also mentioned in 11 other files (config, package.json, README, AGENTS.md, VitePress config, 3 guides, 3 slash commands). The e2e tests don't select by class.
- Arrow 1.0.6 (`@arrow-js/core`, `/framework`, `/ssr`, `/hydrate`, `/sandbox`, `/skill`, `/vite-plugin-arrow`) ships no composables and no router. No VueUse-style library exists for Arrow. The only Arrow composable found on npm is `@dev-dudu-0515/panasuri` (Zod validation on `reactive()`), which is a reference for a pluggable validator in the `useForm` recipe.
- npm names (2026-11-06):
  - `quiver` is taken.
  - `@quiver-js/core` exists.
  - `@go4cas/quiver`, `quiver-js`, `quiverjs`, `arrow-use`, `arrowuse`, `use-arrow`, `arrow-composables` and `quiver-use` are free.
