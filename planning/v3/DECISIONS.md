# Quiver v3 — decisions record

Status: settled in the Decisions thread (P0) · Decided by: Cas · Date: 2026-11-08

This file records every outcome of the Decisions thread: each Proposed decision (D3–D18), each open question (Q1–Q7), and the gaps found while reading the spec and the repo at `d4aa17d`. New decisions are numbered D19 onward. The results are folded into [SPEC.md](SPEC.md), which stays the source of truth. Where the two differ, SPEC.md wins, and a later PR fixes this file.

Evidence for every repo claim below is in [NOTES.md](NOTES.md).

## Summary

| # | Outcome |
|---|---|
| D3 | Agreed: core is `@go4cas/quiver` |
| D4 | Agreed: composables are `arrow-use`, written so a switch to `@go4cas/arrow-use` is one find-and-replace. Not reserved on npm now (P8 risk) |
| D5 | Agreed: tokens use `--q-`, recipe classes use `q-` |
| D6 | Agreed with an addition: every recipe stylesheet starts with `@layer quiver;`, and the docs give apps that use layers an ordering line (D29) |
| D9 | Agreed, format fixed: see D21 |
| D10 | **Changed**: `document.baseURI` is wrong without a `<base>` tag. See D22 |
| D11 | Agreed: the Navigation API is a hard requirement. The error message names the minimum browsers and links the docs |
| D12 | Agreed, with teardown defined: see D25 |
| D13 | **Changed**: no plugin system, but core adds `afterEach` and `onError`. See D24 |
| D14 | Agreed, layout fixed: see D19 |
| D15 | Agreed: core `3.0.0`, composables `0.1.0` |
| D16 | Agreed, plus `.d.ts` files generated at `prepack` (D20) |
| D18 | Agreed: `Link` drops `@click` and renders `href="${url(to)}"` |
| Q1 | Starter moves to `starter/` |
| Q2 | No JSR in v3 |
| Q3 | Migration guide explains each `createApp` option as the replacement for something 2.x hardcoded (D27) |
| Q4 | Toast exit waits on `el.getAnimations()`. No `exitMs`, no bare `animationend` (D31) |
| Q5 | Recipes ship plain CSS only |
| Q6 | `routerState` is private. Apps read routes only through `useRoute()` (D26) |
| Q7 | One `jsconfig.json` per workspace, with root scripts fanning out through `bun run --filter` (D33) |

D1, D2, D7, D8 and D17 were already Agreed, and they stand. D17 gets one clarification (D32).

## Topic 1 — package names (D3, D4)

- **D3 agreed.** The core package is `@go4cas/quiver`. Cas confirmed the `go4cas` npm scope in the thread; P8 re-verifies it before the dry-run publish.
- **D4 agreed.** The composables package is `arrow-use`, unscoped, so it can be found as "the VueUse of Arrow". Docs and imports are written so that switching to `@go4cas/arrow-use` is one find-and-replace.
- **Not reserved now.** The name stays unpublished until P8, so someone else could take it first. P8 re-checks availability before preparing the publish. If it's gone, the fallback is `@go4cas/arrow-use`, which needs Cas's OK as a package rename (§9 rule 8).
- The repo stays `go4cas/quiver`. The root `package.json` stays `private` and becomes the workspace root.

## Topic 2 — repo layout (D14, Q1)

**D19 — workspace layout.** Cas asked for the structure to follow best practice:

```
packages/quiver/      core, plus /vite and /bun subpath exports and the `quiver` bin
packages/arrow-use/   composables
starter/              demo app (degit target)
recipes/              copy-in registry (not a package; shipped inside the core tarball, D32)
examples/vite/  examples/bun/  examples/no-build/
docs/                 VitePress, its own workspace
planning/             unchanged
```

- **Q1: the starter moves to `starter/`.** Its commands become `bunx degit go4cas/quiver/starter my-app` and `https://stackblitz.com/github/go4cas/quiver/tree/main/starter`. The README, the docs, the StackBlitz badge and `.stackblitzrc` are updated to match.
- **The starter depends on `"@go4cas/quiver": "^3.0.0"`, not `workspace:*`.** Bun links that range to the local workspace, and degit copies install from npm. A CI test rejects `workspace:` in `starter/package.json`.
- **The root README opens with the new degit command.** The 2.x template stays reachable as `bunx degit go4cas/quiver#v2.1.0`, since the tag exists.
- **Tests sit next to their code:** `packages/*/tests/`, `starter/tests/`, `examples/*/tests/`.
- **The docs still build to `docs/.vitepress/dist`,** so `docs.yml` and the GitHub Pages settings don't change.

## Topic 3 — publishing (D15, D16, Q2)

- **D15 agreed:** `@go4cas/quiver@3.0.0` (continuing the Quiver version line) and `arrow-use@0.1.0`.
- **D16 agreed:** we publish source ESM + JSDoc, and the runtime files are never transformed.
- **D20 — type declarations.** Each package's `prepack` generates `.d.ts` files with the TypeScript already in devDependencies (`tsc --declaration --emitDeclarationOnly`). Without them, TS consumers get no types: TS ignores JSDoc in `node_modules` `.js` files unless the consumer sets `allowJs` and `maxNodeModuleJsDepth`. The `exports` map points `types` at the generated files. Vendoring the source folder still works without them.
- **Q2: no JSR in v3.** Revisit when someone asks.
- **Package hygiene rules, which TECH-SPEC turns into checks:**
  - an MIT `LICENSE` in each package
  - a `files` allowlist
  - `"type": "module"`
  - an `exports` map, with no `main`-only entry
  - `peerDependencies: { "@arrow-js/core": "^1.0.6" }`
  - `engines.node: ">=22.12"` for the CLI

## Topic 4 — routing and base path (D9, D10, D18)

- **D21 — manifest format (D9).** The manifest is a plain object that maps a route pattern to a loader: `{ '/': () => import('./pages/index.js'), '/users/:id': () => import('./pages/users/[id].js') }`.
  - `notFound` is a separate `initRouter` option.
  - Core sorts routes by `scoreRoute`, so key order doesn't matter.
  - A loader may return a module or a promise of one, so hand-written manifests can import pages eagerly.
  - Error messages name the route pattern, since there is no file path.
- **D22 — base default (replaces D10).** Without a `<base>` element, `document.baseURI` is the page's own URL. A deep link to `/users/42` would then make `/users/42` the base. The new rule:
  - an explicit `base` option wins
  - otherwise, if a `<base href>` element exists, its resolved pathname cut back to the directory (`/app/index.html` → `/app/`)
  - otherwise `/`
  - the base is stored with a trailing slash
- **D23 — base-relative paths.** Every path the app sees or passes in is base-relative: `go()`, guard `from` and `to`, guard redirect strings, `afterEach` and `onError` paths, manifest keys and `useRoute().path()`. Only `url()` output and the real `href`s include the base.
  - With base `/app/`, a visit to `/app` (no trailing slash) resolves to route `/` and counts as inside the base.
  - Navigations outside the base are not intercepted (R3).
- **D18 agreed.** `Link` drops `@click`, renders `href="${url(to)}"`, and compares base-relative paths for `aria-current`. `url(path)` keeps the query and hash, and returns absolute URLs (`https://…`, `//…`) unchanged.

## Topic 5 — scope limits (D11, D13)

- **D11 agreed.** The Navigation API stays a hard requirement. `initRouter` throws when `window.navigation` is missing. The message names Chrome/Edge 102+, Safari 26.2+ and Firefox 147+ and links to the docs page.
- **D24 — hooks, no plugins (replaces D13).** There is still no `plugins: []`. Core adds two hooks:
  - **`afterEach(fn)`** runs once per resolved navigation, including the initial load, and receives `{ from, to, status }`. It returns an unregister function.
  - **`onError(fn)`** receives `{ error, from, to, phase }`, where `phase` is `'guard' | 'load' | 'render'`. It returns an unregister function.
  - Every error lands in the error view. A guard that throws, a loader that rejects or a page with a bad export, and a page function that throws while rendering all set `status: 'error'`, render the injected error view, then call the `onError` handlers.
  - **Why `onError` is needed:** in 2.x, `status === 'error'` only covers loader failures. A throwing guard rejects the navigation and leaves the old page in place, surfacing only as an unhandled rejection or a `navigateerror`. A throwing page breaks the outlet, because `RouteOutlet` calls `Page()` without a try/catch. Cas raised this, and it's recorded in NOTES.md. That a thrown guard now shows the error view is a deliberate behaviour change, and it goes in the migration guide.
  - An `onError` handler that throws is caught and logged with `console.error`, so it can't loop.
  - `destroy()` clears both hook lists.

## Topic 6 — lifecycle and router state (D12, Q6, R4)

- **D12 agreed.** Module singletons stay, with one app per page. Calling `createApp` again before `destroy()` throws a clear error.
- **D25 — what `destroy()` does:**
  - removes the `navigate` listener
  - clears guards, `afterEach` and `onError` handlers
  - clears the `provide`/`inject` context
  - stops `useMeta` watchers
  - resets router state to `idle` with `path: ''`
  - empties the target element
  
  After `destroy()`, `initRouter` and `createApp` can be called again, and a unit test proves it. `destroy()` doesn't restore `document.title`.
- **R4 gap fixed.** `routerState` no longer reads `window.location` at import time. It starts at `path: ''`, and `initRouter` fills it in.
- **D26 — Q6: `routerState` is private.** It is not exported from the public entry. Apps read routes through `useRoute()`, which returns read-only getters and works outside components, in guards and in state modules too. The starter's `Link` and `MenuLayout` switch from `routerState` to `useRoute()`.
- **Startup order is a rule:** `provide()`, then `beforeEach` / `afterEach` / `onError`, then `await initRouter()`, then `createApp()`. `createApp` before `initRouter` throws with a message that names this order.

## Topic 7 — `createApp` (Q3)

- **D27 — Q3, the migration message.** v2.0 removed `createApp({ root, plugins })` because the template hardcoded the app shell, so the options added nothing a fork couldn't do. In v3 core no longer owns the shell, and each option replaces something 2.x hardcoded:
  - `target` replaces `#app`
  - `layouts` replaces `src/layouts/index.js`
  - `loading` and `error` replace `LoadingCard` and `ErrorCard`
  
  The migration guide has one row per option and says plainly that `plugins` is not coming back. `createApp` stays synchronous.
- **D28 — default layout and views:**
  - **`defaultLayout`.** A `defaultLayout` option, defaulting to `'default'`, names the layout for pages without `meta.layout`. If the name isn't in `layouts`, the page renders bare, with a `console.warn` when the name was given explicitly. The starter passes `defaultLayout: 'basic'`, so its pages behave as they do in 2.x.
  - **The views.** `loading()` takes no arguments. `error({ message, error, retry })` gets a `retry()` that re-resolves the current route. The bare defaults render no `class` attribute: `<p>Loading…</p>` and `<p role="alert">${message}</p>`.
  - **No wrapper.** Core mounts the outlet straight into `target`, without the 2.x `<div class="min-h-screen">`. The starter's layouts handle full height.

## Topic 8 — CSS (D5, D6, Q5)

- **D5 agreed:** tokens use `--q-*`, recipe classes use `q-*`. Design finalises the full map.
- **D6 agreed, D29 added.** Cascade layers are ordered by first appearance, so "unlayered app CSS wins" only holds for apps that use no layers. To keep the order stable:
  - Every recipe stylesheet begins with the statement `@layer quiver;`.
  - The docs give layered apps an ordering line. For Tailwind v4 it's `@layer theme, base, quiver, components, utilities;`.
- **D30 — tokens and reset live in a `theme` recipe.** R2 keeps styling out of core, so `tokens.css` and `base.css` don't ship in `@go4cas/quiver`. They are copied in like the other recipes. Both sit inside `@layer quiver`, so an app overriding a `--q-*` token on `:root` wins whatever the load order.
- **Q5: recipes ship plain CSS only.** All Tailwind guidance lives in the single optional Tailwind guide (R7).

## Topic 9 — recipes, toasts, AI tooling (Q4, D17, P7)

- **D31 — Q4, toast exit.** `exitMs` couples JS to a CSS duration. A bare `animationend` never fires when there is no animation (reduced motion, or CSS not loaded), which leaves toasts stuck. Instead, the recipe:
  - sets `data-state="closing"` on dismiss
  - awaits `Promise.all(el.getAnimations().map((a) => a.finished))`
  - then removes the toast. With no animations, that resolves at once.
  
  The recipe CSS includes a `prefers-reduced-motion` rule.
- **D32 — recipe delivery (makes P7 passable).** P7's Done-when needs a plain Arrow app with no starter files to get a toast through `/add-component toast`:
  - Recipes ship as plain files inside the `@go4cas/quiver` tarball under `recipes/`, through `files` but not the `exports` map. `/add-*` commands copy from `node_modules/@go4cas/quiver/recipes/`, so they work offline and match the installed core version.
  - The `/add-*` commands ship as a Claude Code plugin in this repo. It's required for P7, no longer optional.
  - Listing the plugin in any public marketplace is a release step and needs Cas's go-ahead.
- **D17 clarified.** The `useForm` recipe has no Quiver imports, so plain Arrow apps can use it. `hmrState` is a recipe, and its plain-`reactive()` fallback for no-build mode is documented.

## Topic 10 — CI and checks (Q7)

- **D33 — Q7.** Each workspace has its own `jsconfig.json`. The root `typecheck`, `test` and `test:e2e` scripts fan out with `bun run --filter`, so §9 rule 4's command works unchanged from the root.
  - The core's `jsconfig.json` leaves out `vite/client` types, so any `import.meta.glob` or `import.meta.hot` in core fails typecheck. That enforces R1.
- **D34 — boundary checks are Vitest tests, not ESLint.** "Core never imports the starter" (P2), "no Quiver imports in arrow-use" (P6), "no `workspace:` in the starter" (D19) and the R7 grep are plain tests that read files. That adds no dev dependency.
- **R7 refined.** The grep excludes `planning/`, `node_modules/` and `bun.lock`. Matches are allowed only in `CHANGELOG.md`, the optional Tailwind guide, and the layer-order note (D29).
- **`CHANGELOG.md` gets a `## [Unreleased]` section.** It had none, and §9 rule 7 needs one. Added in this PR.
- **Bun floor.** Root `engines.bun` becomes `>=1.4.4`, the version the 2026-11-06 review spike tested the virtual-module plugin on. P4 must confirm it, and may raise it. CI keeps `1.4.x`.

## Topic 11 — visual-parity baseline (P1)

- **D35 — tolerance owner.** Design proposes Playwright's `maxDiffPixelRatio` and per-pixel `threshold` in DESIGN.md, and Cas approves them in the Design PR. P1 may not loosen them.
- **Fonts are self-hosted.** Audiowide, Orbitron, Space Grotesk and VT323 are currently imported from Google Fonts. All four are under the OFL licence, so committing the files is allowed and adds no dependency. Captures wait for `document.fonts.ready`.
- **The baseline is captured on the CI runner** (Linux Chromium) from the untouched 2.1 CSS, as P1's first commit. Captures from macOS don't match Linux.
- **Motion is frozen during capture,** with `animations: 'disabled'` and no live toasts.

## Topic 12 — docs coverage at release (P8)

Raised 2026-11-10 when Cas asked whether P8 leaves the docs, references, product site and examples up to date. The examples were covered (P5, P6 U-11, the starter) and so were P8's new pages. Four gaps were not, and none of them were §2 non-goals:

1. The existing guide pages still describe 2.x, and no phase rewrote them. P8's only docs check was "the docs build is green", which passes with stale pages.
2. There was no API reference page. Signatures lived only in `.d.ts`, `llms.txt` and the READMEs.
3. The landing page (`docs/index.md`) still says "starter template".
4. There were no site pages for `arrow-use` or the recipes, and the docs didn't link the examples.

- **D36 — Cas: add all four to P8.** P8 rewrites every existing guide page, the landing page and the root README for v3. It adds an API reference section (core, `/vite`, `/bun`, the `quiver routes` CLI, `arrow-use`), a page per `arrow-use` composable, a page per recipe, and an examples page. Three Vitest checks prove it: export coverage on the API reference, a page for every recipe and composable plus a link to every example, and no 2.x-only strings outside the migration guide and CHANGELOG. P8 grows from M to L.

## Topic 13 — conventions layer, 3.2 (P9)

Raised 2026-11-11, when the maintainer looked at the starter and asked what Quiver adds over plain Arrow plus hand-written layouts (N182). Their stated vision: a small meta layer over Arrow in the spirit of Nuxt, with Arrow doing the heavy lifting and Quiver adding declarative folder conventions. In 3.1 only `pages/` is a convention. The proposal ("Quiver conventions proposal (v3.2)", a project doc) was settled on 2026-11-12. All eight are **Agreed**, and P9 implements them. Every change is additive, so it ships as a minor.

- **D37 — conventions model, 3.2.0.** The build tooling (Vite plugin, Bun plugin, CLI) reads the app's convention folders and generates one module; core's runtime stays as small as it is. Folders: `pages/` (unchanged), `layouts/`, `middleware/`, `views/`, plus `app.config.js`. `state/` and `components/` stay documented folders with no wiring. 3.1 apps keep working unchanged.
- **D38 — layouts by file.** Each `.js` file directly in `layouts/` is a layout named after the file; `default.js` is used when a page names none (core's existing `defaultLayout` default, N183). Layouts are imported eagerly. No registry file.
- **D39 — middleware by folder.** `pages/**/_middleware.js` guards every route under its folder, outermost first. Every `.js` file directly in `middleware/` is global and runs on every navigation, in file-name order, before section middleware; no `.global` suffix, since there is no named middleware to tell apart. A numeric prefix (`01.auth.js`) sets the order. Middleware has the `beforeEach` signature and outcomes and runs after `beforeEach` guards, before the page loads. Per-page middleware named in `meta` is not supported: it would load the page before guarding it (N184).
- **D40 — one startup call: `createApp(app, options)`.** Given the generated app, the async form provides the config, starts the router with the middleware and mounts, resolving to the `App`. It is the only form the docs and the starter teach. The 3.1 form (`provide()`, `await initRouter()`, `createApp({ target, … })`) keeps working and moves to a "Manual setup" docs page; it can be retired in 4.0. Core stays at 13 exports. The maintainer chose the name over `startApp` and `initApp` (N187).
- **D41 — app config and menu links.** `app.config.js`'s default export is a plain object; each top-level key is provided under its own name, so `inject('app')` and `inject('currentUser')` work unchanged. Menu links come from the pages: a page opts in with `meta.nav: { label, order? }`, the scanner collects them into `[{ to, label }]` and `createApp` provides them as `'nav'`. A `nav` key in `app.config.js` replaces the generated list (N185).
- **D42 — the generated module is `quiver:app`.** A new virtual module (and a CLI-written file for no-build apps) holds routes, not-found, layouts, middleware, views, nav and config. `quiver:routes` stays exactly as it is. Reviewed after 3.2.1 and kept by the maintainer on 2026-11-12, over `virtual:quiver/app` (Vite's suggested prefix) and `#quiver/app` (Nuxt-style, which can clash with an app's `package.json` `"imports"`) (N242).
- **D43 — unknown layouts warn at build time.** When a page's literal `meta.layout` names no file in `layouts/`, the scanner warns; the build still passes. The runtime warning (C-47) stays.
- **D44 — recipes land in role folders.** An app has no recipes folder: each recipe file installs into the folder its role suggests (`components/`, `composables/`, `styles/`, `layouts/`, `views/`). The starter's `src/quiver/` and `src/layouts/index.js` go away; its layouts and views become its own files. A recipe is where code comes from, not a folder in the app. This changes `/add-*` install paths (a convention change).
- **D45 — file names follow the folder (Nuxt-style).** `components/` PascalCase, named for the component, with its CSS beside it under the same name; `composables/` and `state/` camelCase, named for the export; `pages/`, `layouts/`, `views/` and `middleware/` lower-case or kebab-case, since the file name is the route or the layout name. Component recipe files follow it (`Link.js`, `Toasts.js`, `ThemeSwitcher.js`); recipe names and `/add-*` names don't change. `hmrState` keeps its name. Chosen by the maintainer on 2026-11-12 over kebab-case everywhere and over also renaming `hmrState` to `useHmrState`.

## Still open

- Whether `arrow-use` is still free at P8 (Topic 1).
- The tolerance numbers themselves (D35, owned by Design).
