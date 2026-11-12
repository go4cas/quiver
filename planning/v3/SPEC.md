# Quiver v3 — drop-in refactor spec

Status: decisions settled (P0, 2026-11-08; see [DECISIONS.md](DECISIONS.md)) · Author: Cas · Date: 2026-11-08

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
- G7. (3.2, D37) Folder conventions in the spirit of Nuxt: an app's `pages/`, `layouts/`, `middleware/`, `views/` and `app.config.js` are its configuration, read by the build tooling, so `main.js` holds no wiring.

**Non-goals (v3)**

- Swapping Arrow.js, or SSR/hydration (that's `@arrow-js/ssr` / `@arrow-js/hydrate`).
- A formal plugin system (deferred until 2–3 real plugins exist, D13). Core has `afterEach` / `onError` hooks only (D24).
- A Navigation API fallback (deferred, D11).
- Multiple Quiver apps on one page (D12).

## 3. Target shape

| Layer | Contents | Assumes | Ships as |
|---|---|---|---|
| **Core** `@go4cas/quiver` | `initRouter`, `go`, `beforeEach`, `afterEach`, `onError`, `url()`, `useRoute`, `useRouter`, `useMeta`, `provide`/`inject`, `createApp` (target, layouts, `defaultLayout`, loading/error views, `destroy`) | `@arrow-js/core` only | npm package, plain ESM + generated `.d.ts` (D20) |
| **Route discovery** `@go4cas/quiver/vite`, `@go4cas/quiver/bun`, `quiver routes` CLI | One shared scanner: `pages/` → manifest | Its bundler / none | Subpath exports + bin |
| **Composables** `arrow-use` (D4) | `useFetch`, `useStorage`, `useMediaQuery`, `useEventListener` (v0.1) | `@arrow-js/core` only (peer) | npm package |
| **Recipes** | `theme` (`tokens.css` + `base.css`), `Link`, toasts, theme switcher, `useForm`, `hmrState`, layouts, loading/error views | Core + composables | Shipped as files in the core tarball (`recipes/`); copied into apps by the `/add-*` commands of the Quiver Claude Code plugin (D32) |
| **Starter** `starter/` | Demo app: pages, themes, recipes in use | Vite | `bunx degit go4cas/quiver/starter` (Q1) |

**The rule for core:** something goes in core only if it needs framework internals (router, context, meta) or every app has to wire it into the framework. Everything else is a composable or a recipe.

## 4. Requirements

- R1. **No build-tool assumptions in core.** No `import.meta.glob`, no asset imports, no CSS imports. Routes come in as an explicit manifest.
- R2. **No styling in core.** Core renders no `class` attributes. Layouts and the loading/error views are injected, with bare unstyled defaults.
- R3. **No mount assumptions.**
  - `createApp({ target })` takes an element or selector, not a hardcoded `#app`.
  - `initRouter({ base })`: an explicit `base` wins; otherwise the directory of `<base href>` if a `<base>` element exists; otherwise `/` (D22). Stored with a trailing slash.
  - Navigations outside the base are not intercepted. The base without its trailing slash (`/app`) counts as inside and resolves to `/`.
  - Every app-facing path is base-relative: `go()`, guard `from`/`to` and redirect strings, hook paths, manifest keys, `useRoute().path()`. Only `url()` and rendered `href`s carry the base (D23).
- R4. **No hidden state the app can't reset.** Module singletons stay, but `destroy()` removes the navigate listener, clears guards, `afterEach`/`onError` handlers, context and meta watchers, resets router state to `idle`, and empties the target; `initRouter` + `createApp` work again afterwards (D25). No module reads `window` at import time (`routerState` starts at `path: ''`).
- R5. **One Arrow copy.** `@arrow-js/core` is a `peerDependency` of every package, and published files import it by its bare name.
- R6. **No-build works.** Core and composables run unbundled from a CDN behind an import map.
- R7. **Tailwind-free.** Repo-wide `grep -ri tailwind`, excluding `planning/`, `node_modules/` and `bun.lock`, matches only `CHANGELOG.md`, the optional Tailwind guide and the layer-order note (D29), plus the 2.x migration guide and the docs sidebar's one link to the Tailwind guide (N116). A Vitest test runs it in CI (D34).
- R8. **Agent context ships with the package.** `AGENTS.md` and `llms.txt` describe the public API and are included in the npm tarball.
- R9. **2.x users have a path.** A migration guide maps every 2.x pattern to its v3 replacement.

## 5. Decisions

**Agreed** = Cas confirmed it (D1, D2, D7, D8, D17 on 2026-11-06; the rest in the Decisions thread on 2026-11-08). Rationale and detail for every row: [DECISIONS.md](DECISIONS.md).

| # | Decision | Status |
|---|---|---|
| D1 | Quiver becomes a drop-in core plus a starter that consumes it | Agreed |
| D2 | Remove Tailwind entirely, whatever else changes | Agreed |
| D3 | Core package name `@go4cas/quiver`. `quiver` on npm is taken (2013 Node streams package), and `@quiver-js/core` already exists ("Micro framework for arrow-js", dormant) | Agreed |
| D4 | Composables package name `arrow-use` (free on npm as of 2026-11-06). Alternatives: `use-arrow`, `arrow-composables`, `@go4cas/arrow-use`. Not reserved on npm; P8 re-checks, fallback `@go4cas/arrow-use`. | Agreed |
| D5 | Token prefix `--q-` (e.g. `--q-color-brand`, `--q-radius-panel`). Recipe classes use `q-`. | Agreed |
| D6 | Recipe CSS uses `@layer quiver`, `:where()` (zero specificity) and native nesting, and state is styled through attributes (`aria-current`, `data-type`), never utility variants. Plus D29. | Agreed |
| D7 | Composables return getter functions (`data()`, `loading()`), matching the current `useFetch` | Agreed |
| D8 | Composables are Arrow composables, not Quiver ones: no Quiver imports, usable in plain Arrow apps | Agreed |
| D9 | Core takes an explicit route manifest. File-based discovery is optional: Vite plugin, Bun plugin, or codegen (`routes.gen.js`), all sharing one scanner. Format: D21. | Agreed |
| D10 | `base` defaults to `<base href>` via `document.baseURI`. `document.baseURI` is the document URL when there is no `<base>`. | Replaced by D22 |
| D11 | Navigation API stays a hard requirement (Chrome/Edge 102+, Safari 26.2+, Firefox 147+), documented loudly. A history-API fallback is deferred until someone needs it. `initRouter` error names the minimum browsers and links the docs. | Agreed |
| D12 | Keep module singletons, one app per page, `destroy()` resets everything. An instance-per-app API is deferred. Teardown: D25. | Agreed |
| D13 | No plugin system in v3. Possibly add `afterEach` / `onError` hooks, but no `plugins: []` option | Changed by D24 |
| D14 | Bun workspaces: `packages/quiver/`, `packages/arrow-use/`, `starter/`, `recipes/`, `examples/`, `docs/`. Layout: D19. | Agreed |
| D15 | Versions: core `3.0.0`, composables `0.1.0` | Agreed |
| D16 | Publish to npm. Published files are source ESM + JSDoc (no build step), so the package is also vendorable as a folder. Plus D20 (`.d.ts`). | Agreed |
| D17 | `Link`, toasts, theme switcher, `useForm`, `hmrState`, layouts and loading/error views become recipes. `useFetch` moves to the composables package | Agreed |
| D18 | `Link` drops its `@click` handler (the Navigation API already intercepts plain `<a href>`, and the handler breaks Cmd/Ctrl/middle-click). Core adds `url(path)` for base-aware hrefs. `url()` keeps query/hash, returns absolute URLs unchanged. | Agreed |
| D19 | Layout: `packages/quiver/`, `packages/arrow-use/`, `starter/`, `recipes/`, `examples/{vite,bun,no-build}/`, `docs/`, `planning/`. Tests sit beside their code. The starter depends on `^3.0.0`, never `workspace:` (CI check). The root README leads with the new degit path; 2.x stays at `go4cas/quiver#v2.1.0`. Docs still build to `docs/.vitepress/dist` | Agreed |
| D20 | Each package's `prepack` generates `.d.ts` with `tsc --declaration --emitDeclarationOnly`; runtime files stay untouched source. Hygiene: MIT `LICENSE`, `files` allowlist, `"type": "module"`, `exports` map, `@arrow-js/core` peer `^1.0.6`, CLI `engines.node >=22.12` | Agreed |
| D21 | Manifest is `{ [pattern]: loader }`, loader returns a module or a promise of one; `notFound` is a separate option; core sorts by `scoreRoute` | Agreed |
| D22 | `base`: explicit option, else directory of `<base href>` when a `<base>` element exists, else `/` | Agreed |
| D23 | All app-facing paths are base-relative (`go`, guards, redirects, hooks, manifest, `useRoute().path()`); only `url()` and `href`s carry the base; `/app` counts as inside base `/app/` | Agreed |
| D24 | `afterEach(fn)` → `{ from, to, status }`; `onError(fn)` → `{ error, from, to, phase: 'guard' \| 'load' \| 'render' }`. Both return unregister. Every error shows the error view, then calls `onError`; a throwing handler is caught and logged. No `plugins` | Agreed |
| D25 | `destroy()`: listener, guards, hooks, context, meta watchers, router state (`idle`, `path: ''`), target emptied; re-init works; `document.title` not restored. A second `createApp` before `destroy()` throws | Agreed |
| D26 | `routerState` is private; apps read it via `useRoute()` only (Q6). Startup order: `provide` → guards/hooks → `await initRouter()` → `createApp()`; `createApp` first throws | Agreed |
| D27 | Migration guide explains each `createApp` option as the replacement for a 2.x hardcode (`target`←`#app`, `layouts`←`layouts/index.js`, `loading`/`error`←`LoadingCard`/`ErrorCard`); `plugins` is not coming back; `createApp` stays sync (Q3) | Agreed |
| D28 | `defaultLayout` option (default `'default'`; starter passes `'basic'`); unknown layout renders bare with `console.warn`. `loading()`; `error({ message, error, retry })`; bare defaults `<p>Loading…</p>` / `<p role="alert">`. Core mounts into `target` with no wrapper | Agreed |
| D29 | Every recipe stylesheet starts with `@layer quiver;`. Docs give layered apps an ordering line (Tailwind: `@layer theme, base, quiver, components, utilities;`) | Agreed |
| D30 | `tokens.css` + `base.css` are the `theme` recipe (not in core, R2), inside `@layer quiver`. Recipes ship plain CSS only (Q5) | Agreed |
| D31 | Toast exit: `data-state="closing"`, await `el.getAnimations()` `.finished`, then remove; `prefers-reduced-motion` rule (Q4) | Agreed |
| D32 | Recipes ship as files in the core tarball (`recipes/`, in `files`, not in `exports`); `/add-*` copy from `node_modules/@go4cas/quiver/recipes/`. The commands ship as a Claude Code plugin in this repo (required for P7). Public marketplace listing needs Cas's go-ahead. `useForm` recipe has no Quiver imports | Agreed |
| D33 | One `jsconfig.json` per workspace; root scripts fan out with `bun run --filter`. Core's config omits `vite/client` types (enforces R1) (Q7) | Agreed |
| D34 | Boundary checks (core ↛ starter, arrow-use ↛ Quiver, no `workspace:` in starter, R7 grep) are Vitest tests, not ESLint. `engines.bun >=1.4.4` (from the 2026-11-06 spike; P4 confirms) | Agreed |
| D35 | Screenshot tolerance (`maxDiffPixelRatio`, `threshold`) is proposed in DESIGN.md and approved by Cas in the Design PR; P1 can't loosen it. Fonts self-hosted (OFL), `document.fonts.ready`; baseline captured on CI Linux Chromium from 2.1 CSS as P1's first commit; `animations: 'disabled'` | Agreed |
| D36 | P8 also rewrites every existing docs page and the landing page for v3, adds an API reference (core, `/vite`, `/bun`, CLI, `arrow-use`), `arrow-use` and recipe pages and an examples page, with Vitest checks for export coverage and leftover 2.x strings. P8 size M → L | Agreed |
| D37 | 3.2 conventions layer: the build tooling reads `layouts/`, `middleware/`, `views/` and `app.config.js` beside `pages/` and generates one module; core stays small; additive, released as 3.2.0 (P9) | Agreed |
| D38 | Each file in `layouts/` is a layout named after the file; `default.js` is the default; eager imports, no registry | Agreed |
| D39 | Middleware: `pages/**/_middleware.js` guards its folder; every file in `middleware/` is global, in file-name order, no `.global` suffix; runs after `beforeEach`, before the page loads; no per-page `meta` middleware | Agreed |
| D40 | `createApp(app, options)` (async) is the one taught startup call: config, router, mount. The 3.1 form stays as "Manual setup", to retire in 4.0. Still 13 exports | Agreed |
| D41 | `app.config.js` keys are provided by name; menu links come from `meta.nav: { label, order? }` and are provided as `'nav'`; a config `nav` replaces them | Agreed |
| D42 | Generated module `quiver:app`; `quiver:routes` unchanged | Agreed |
| D43 | A literal `meta.layout` naming no layout file is a build warning, not an error | Agreed |
| D44 | No recipes folder in apps: recipe files install into `components/`, `composables/`, `styles/`, `layouts/`, `views/` | Agreed |

### Questions resolved in the Decisions thread

- Q1. Starter location → moves to `starter/` (D19).
- Q2. JSR → not in v3.
- Q3. Explaining the `createApp` options → D27.
- Q4. Toast exit timing → D31.
- Q5. Tailwind snippets in recipes → no, plain CSS only (D30).
- Q6. `routerState` → private, `useRoute()` only (D26).
- Q7. Typecheck/CI → per workspace, run from the root (D33).

## 6. Core API sketch (final signatures: [TECH-SPEC.md](TECH-SPEC.md))

```js
import { initRouter, createApp, beforeEach, afterEach, onError, url, go, provide } from '@go4cas/quiver'
import routes from 'quiver:routes'            // or a hand-written object, or ./routes.gen.js

provide('app', { name: 'Audition' })        // 1. context
beforeEach(({ from, to }) => { /* unchanged 2.x semantics, base-relative paths */ })
afterEach(({ from, to, status }) => {})       // 2. guards and hooks (D24)
onError(({ error, from, to, phase }) => {})   //    phase: 'guard' | 'load' | 'render'

await initRouter({
  routes,                                     // { '/': () => import(...), '/runs/:id': () => import(...) }
  notFound: () => import('./pages/not-found.js'),
  base: '/api/custom/app/',                   // optional; default: <base href> directory, else '/' (D22)
})                                            // 3. router

const app = createApp({
  target: '#app',                             // element or selector
  layouts: { basic: BasicLayout, menu: MenuLayout },
  defaultLayout: 'basic',                     // optional; default 'default'; missing → bare page (D28)
  loading: LoadingView,                       // optional; bare default
  error: ErrorView,                           // optional; receives { message, error, retry }
})                                            // 4. mount (throws if called before initRouter)

url('/runs/42?tab=log')                       // '/api/custom/app/runs/42?tab=log'
go('/runs/42')                                // base-relative (D23)
app.destroy()                                 // listener, guards, hooks, context, meta, router state, target (D25)
```

Page modules keep the 2.x contract: a default export page function, and an optional `export const meta = { layout, title }`. Apps read the route only through `useRoute()`; `routerState` is not exported (D26).

## 7. Conventions

### CSS (D5, D6, D29, D30)

- `tokens.css` and `base.css` are the `theme` recipe, not part of core (D30). Both are inside `@layer quiver`.
- `tokens.css` holds the token contract as `:root { --q-* }`, plus `[data-theme]` / `[data-mode]` override blocks. It's a direct port of today's `@theme` and theme blocks in `src/style.css`.
- A small `base.css` replaces the reset that Tailwind's preflight provided (`box-sizing`, margins, form-control inheritance, `antialiased` font smoothing).
- Recipe CSS starts with the layer statement, and classes use the `q-` prefix:
  ```css
  @layer quiver;
  @layer quiver {
    :where(.q-toast) {
      border-radius: var(--q-radius-panel);
      &[data-type="error"] { color: var(--q-color-error); }
    }
  }
  ```
  Any unlayered app CSS wins without `!important`, and one app class overrides a recipe. Apps that use their own layers declare the order once, e.g. `@layer theme, base, quiver, components, utilities;` for Tailwind v4 (D29).
- Recipes ship plain CSS only. Tailwind guidance lives only in the optional Tailwind guide (Q5).
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
| P8 | Docs, API reference, migration guide, release | L | P5, P7 |
| P9 | Conventions layer (3.2): layouts, middleware, views, app config, nav | L | P8 |

**P1 — Remove Tailwind.** First commit: self-host the four Google Fonts (OFL) and capture the screenshot baseline on the CI runner (Linux Chromium) from the untouched 2.1 CSS, waiting for `document.fonts.ready`, with `animations: 'disabled'` (D35). Then port `@theme` and the theme blocks to `tokens.css` (`--q-*`), add `base.css`, rewrite every `class` attribute (about 220 across 18 files) as plain CSS following §7, remove `tailwindcss`, `@tailwindcss/vite` and the Vite plugin, and update AGENTS.md, `/add-component`, `/add-theme`, `/add-layout` and the docs (index, theming, components, VitePress description).
Done when:
- a Playwright screenshot baseline (taken before any CSS change: every page × 5 themes × 2 modes) matches within the tolerance Cas approved in DESIGN.md (D35)
- unit, typecheck and e2e tests are green
- R7 holds

**P2 — Workspace restructure.** Bun workspaces per D19. Move `src/framework/`, `routerState`, `useRoute` and `useRouter` into `packages/quiver/`. Everything else moves to `starter/`, which depends on `"@go4cas/quiver": "^3.0.0"`. Per-workspace `jsconfig.json` with root fan-out scripts (D33). Update README/docs degit and StackBlitz paths and `.stackblitzrc`. No behaviour changes.
Done when:
- all suites are green from the root
- Vitest checks prove nothing in `packages/quiver` imports from the starter, and `starter/package.json` has no `workspace:` (D34)
- core typechecks without `vite/client` types

**P3 — Core API.** Implement §6 (R1–R5):
- manifest-based `initRouter` with `notFound` and `base` (D21, D22)
- base-relative paths everywhere app-facing, no interception outside the base (D23)
- `url()`
- `afterEach` and `onError`, with guard, load and render errors all reaching the error view (D24)
- `routerState` private and with no `window` read at import (D25, D26)
- `createApp` with `target`, `layouts`, `defaultLayout`, `loading`/`error` views, bare defaults and no wrapper (D28); startup-order errors (D26)
- `destroy()` with re-init (D25)
- `Link` moved to the starter without `@click`; `Link` and `MenuLayout` use `useRoute()`
- unit tests for base matching, `url()`, hooks, error phases and teardown
Done when:
- an e2e run of the starter served under `/sub/app/` passes (deep link, back/forward, a link outside the base loads normally)
- an e2e check shows Cmd/Ctrl-click opens a new tab

**P4 — Route discovery.** One scanner (with today's `fileToRoutePath` / `scoreRoute` semantics, `[id]` → `:id`, `not-found`) behind `@go4cas/quiver/vite`, `@go4cas/quiver/bun` (a virtual `quiver:routes` module; proven to work with `Bun.build` splitting on Bun 1.4.4) and a `quiver routes [--watch]` CLI writing `routes.gen.js`. The starter goes back to file-based routing through the Vite plugin.
Done when: one fixture `pages/` folder produces an identical manifest through all three.

**P5 — Build-mode proof.** `examples/vite`, `examples/bun` and `examples/no-build` (import map, single Arrow copy, no CDN `+esm` bundles), each with a smoke e2e test and one variant under a base path, in CI.
Done when: all three pass in CI.

**P6 — Composables package.** (`arrow-use`, D4) `packages/arrow-use/` per §7 with `useFetch` (ported), `useStorage`, `useMediaQuery` and `useEventListener`, a conventions README, and a vanilla Arrow example.
Done when:
- tests pass against bare Arrow
- no Quiver import exists anywhere in the package (enforced by a Vitest check, D34)

**P7 — Recipes + AI tooling.** A `recipes/` registry where each recipe has JS + CSS + README: `theme` (tokens + base, D30), Link, toasts (D31), theme switcher (built on `useStorage` + `useMediaQuery`), `useForm` (no Quiver imports), `hmrState`, layouts, loading/error views. Recipes ship in the core tarball under `recipes/` (D32). `/add-*` commands copy from `node_modules/@go4cas/quiver/recipes/` and ship as a Claude Code plugin in this repo. AGENTS.md and `llms.txt` ship inside `packages/quiver`, and the starter's CLAUDE.md imports them. No public marketplace listing without Cas's go-ahead.
Done when: a fresh plain-Arrow app (not the starter) gets a working toast via `/add-component toast`.

**P8 — Docs + release.** Docs site:
- getting started per build mode
- the token contract
- an optional Tailwind guide (exposing `--q-*` through a v4 `@theme`)
- the Navigation API note
- a 2.x → 3.0 migration guide
- the updated `degit` path
- every existing guide page rewritten for v3 (D36): getting-started, why-quiver, routing, composables, layouts, state, components, theming, testing, ai, workflow, troubleshooting. A page whose topic moved (for example 2.x composables that became recipes or `arrow-use`) is rewritten or replaced, not left describing 2.x
- the landing page (`docs/index.md`) and VitePress description repositioned from "starter template" to drop-in library + composables + recipes + starter
- an API reference section: every public export of `@go4cas/quiver`, `@go4cas/quiver/vite`, `@go4cas/quiver/bun` and `arrow-use`, plus the `quiver routes` CLI, with signature, options and a short example, matching TECH-SPEC
- an `arrow-use` page per composable and a recipes page per recipe (what it does, the `/add-*` command, the files it copies, tokens it uses)
- an examples page linking `examples/vite`, `examples/bun`, `examples/no-build`, the `arrow-use` example and the starter, with their run commands
- the root README rewritten to match (D19 already has it lead with the new degit path)

CHANGELOG. Prepare publishing `@go4cas/quiver@3.0.0` and `arrow-use@0.1.0`: re-check that `arrow-use` is still free and the `go4cas` scope is Cas's (D4); `prepack` generates `.d.ts` (D20).
Done when:
- the docs build is green
- a dry-run publish (`npm pack`) shows the right files, including `recipes/`, `.d.ts`, `LICENSE`, `AGENTS.md` and `llms.txt`
- a Vitest check imports each public entry point (`@go4cas/quiver`, `/vite`, `/bun`, `arrow-use`) and finds every exported name on the API reference pages, and finds `quiver routes` and each of its flags there (D36)
- a Vitest check finds every recipe in `recipes/` and every `arrow-use` export with its own docs page, and every folder in `examples/` linked from the examples page (D36)
- a Vitest check greps `docs/` and `README.md` for 2.x-only strings and finds none outside the migration guide and CHANGELOG. P8 records the list in NOTES.md during its read-first step; it includes at least `src/framework/`, `routerState`, the 2.x tagline `Arrow.js · Vite starter template` and the 2.x degit path `degit go4cas/quiver my-app` (D36)

Publishing happens only after Cas's go-ahead.

**Audition** can adopt Quiver after P3 merges, using a hand-written manifest. P4 adds file-based routing later.

**P9 — Conventions layer (3.2, D37–D44).** Four PRs in order, each green on its own with its docs in the same PR:
1. Spec: D37–D44, this section, TECH-SPEC §12, NOTES N182–N187. Text only.
2. Scanner and build tooling: `scanApp()` (layouts, middleware, views, `app.config.js`, `_middleware.js`, literal `meta` for `nav` and `layout`), the `quiver:app` module from the Vite and Bun plugins, the `quiver app` CLI command, `client.d.ts` (S-50…S-66).
3. Core: middleware in `initRouter()` inside `decide()`, and the async `createApp(app, options)` form (C-70…C-77), with jsdom tests and browser-suite cases (section redirect, cancel, not-found) on all three engines.
4. Starter, recipes, examples and docs: the starter moves to the conventions; recipe files install by role (D44) and `recipes:sync`, `/add-*`, the registry test follow; the Vite example uses `quiver:app`, the no-build example a CLI-written `app.gen.js`; guide pages for layouts, middleware and app config, a "Manual setup" page, AGENTS.md and `llms.txt`.
Done when:
- the starter's `main.js` is a `createApp(app, options)` call with no `provide()`, no layouts map and no view imports, and the starter has no `src/quiver/` and no `src/layouts/index.js`
- the visual-parity screenshots match unchanged (only file locations move)
- a 3.1-style app (manual `initRouter` + `createApp({ target })`, `quiver:routes`) passes its existing tests unchanged
- the parity test (S-40) covers `quiver:app` across the Vite plugin, the Bun plugin and the CLI
- typecheck, unit, e2e and the browser suite are green
Releasing 3.2.0 happens only after the maintainer's go-ahead.

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
10. AGENTS.md's **Scope** section was rewritten by the Decisions PR to point at this spec. Keep the two consistent.

## 10. Known pitfalls

- **Tailwind preflight.** Removing Tailwind also removes its CSS reset. Without `base.css`, buttons, headings and spacing shift everywhere.
- **Screenshot flakiness.** `style.css` imports Google Fonts. Self-host the fonts or wait for `document.fonts.ready` before capturing, and agree a tolerance.
- **Two Arrow copies.** Any duplicate `@arrow-js/core` (a dependency instead of a peer, a CDN `+esm` bundle, or a relative import) silently breaks reactivity.
- **Tailwind's `node_modules` scanning** is another reason recipes are copied in, not imported, even for apps that use Tailwind.
- **`<base>` and `document.baseURI`.** With no `<base>` element, `document.baseURI` is the page URL, not the app root. Never derive the base from it alone (D22).
- **Cascade-layer order.** Layer order is first-declaration order, so `@layer quiver` must be declared before an app's own layers (D29).
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
