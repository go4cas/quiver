# Changelog

All notable changes to Quiver are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@go4cas/quiver`: the router's browser suite also runs in Firefox and WebKit, at `/` and under `/sub/app/`, from `bun run test:browsers` and a CI `browsers` job in the pinned Playwright image; it also checks the error `initRouter()` throws without the Navigation API (N155)

### Changed

- `@go4cas/quiver` (3.1): each page renders with its layout inside a cleanup scope, a private component keyed by path. `onCleanup` from `@arrow-js/core`, and every `arrow-use` composable, called in a page or layout function is cleaned up when the page is left (after the next navigation's guards pass), on `retry()` and on `destroy()`, inside a layout too; before, `onCleanup` there threw and composables were never stopped. A `component()` nested inside a page's template still gets no cleanup (Arrow 1.0.6). No new export (N160, N162, N163)
- `@go4cas/quiver` (3.1): a reactive value read in a page or layout body (outside a `() =>` slot) no longer renders the whole page again; only slots update (N161)
- Starter: the Posts page drops its `afterEach` workaround; `useFetch` aborts on its own when you leave the page or call `destroy()`
- `@go4cas/quiver`, internal only: the manifest check and the page scanner share one set of route-pattern rules and collision checks (each keeps its own messages), and the router classifies guard results in one place for the initial load and in-app navigations, with each navigation's pending render errors and initial report kept on the navigation itself (audit R14, N170, N171). No API change and one timing difference: a navigation replaced by a newer one while its guards settle no longer acts on their result (cancel, redirect or error); new tests run one rule table against manual and scanned manifests, and the browser suite now covers startup redirects, `retry()` and `destroy()` during a load in all three engines

### Security

- Repo tooling, no package change: a `Publish` workflow can stage releases of `@go4cas/quiver` and `arrow-use` on npm from a release tag through trusted publishing (OIDC, no npm token), with provenance; the maintainer still approves each one on npmjs.com. It is switched on for this repository, so releases are staged from CI from now on; `RELEASING.md` has the setup, the release steps and the by-hand fallback

### Documentation

- Docs match the unreleased 3.1 page cleanup: the composables guide and the `useFetch`, `useEventListener`, `useMediaQuery` and arrow-use pages no longer tell you to call `stop()` yourself in a page inside a layout; `destroy()` in the routing guide and the package's `AGENTS.md` runs the page's cleanups and restores the host page's title and description; the `beforeEach` reference says a replaced navigation's guard result is ignored. `README.md` and `CONTRIBUTING.md` list `test:browsers`, `pack:types` and `audit`, and `RELEASING.md` makes CI publishing the default path (N175)

## [3.0.3] - 2026-11-11

Published as `@go4cas/quiver` 3.0.3 and `arrow-use` 0.1.1. Fixes from the external review and security audit of 3.0.2.

### Fixed

- `@go4cas/quiver`: a guard that cancels while another route is still loading no longer leaves the app stuck on the loading view; the page on screen, its URL and status come back. Guards get that page as `from`, and a superseded navigation calls no further guards (N126)
- `@go4cas/quiver`: cancelling a link click or Back/Forward no longer adds or rewrites a history entry, so Back after a cancelled click goes where it went before (N126)
- `@go4cas/quiver`: `await go()`, `retry()`, `back()` and `forward()` resolve after a guard's redirect target, its guards and hooks, or a cancel's rollback, have finished, instead of when the first navigation is replaced (N127)
- `@go4cas/quiver`: a page without a title or description no longer keeps the previous page's; every committed navigation, the not-found page and the error view get the host page's own back, and so does `destroy()` (N128)
- `@go4cas/quiver`: a guard redirect must be a base-relative path inside the app; an absolute URL (`https:`, `javascript:`, `//host`) or a path outside the base is a guard error instead of a navigation, also on the first load, where it used to make `initRouter()` throw. Quiver ignores an app's own Navigation API `info` that looks like its internal markers (N129)
- Docs: the no-bundler quickstart, the CLI reference and the no-build README name the scoped package when nothing is installed (`bunx --bun --package @go4cas/quiver@3 quiver routes`, `npm exec --package=@go4cas/quiver@3 -- quiver routes`); a bare `bunx quiver` / `npx quiver` fetched npm's unrelated `quiver` package
- Docs: the getting-started quickstarts produce a working app: the common setup has a mount element and a declared layout, the Bun section shows where `index.html` goes and how deep links are served, and the no-build section switches `main.js` to `routes.gen.js`
- Docs: type resolution is documented per entry point (the main entry also works under `node10` since 3.0.1), and the Vite page states the tested Vite range (8) instead of "any Vite"
- Node minimums are stated separately: `@go4cas/quiver` (CLI and plugins) on Node 22.12+, the workspace and the starter (Vitest with jsdom) on Node `^22.22.2 || ^24.15.0 || >=26.0.0`; CI's unit job runs on those minimums
- Example servers (`examples/bun`, `examples/no-build`, the arrow-use example, the recipes' e2e app) listen on `127.0.0.1` only, serve only the folders the page needs, answer malformed paths with 400, and refuse an unsafe `QUIVER_BASE`
- `arrow-use` `useStorage`: creating it no longer writes and removes a `__arrow-use__` probe key, which overwrote and deleted an app's own key of that name. Construction only reads, so a stored value now loads when the storage allows reads but not writes; a failed read, write or remove each falls back to memory on its own (N130)
- `arrow-use` `useFetch`: a non-`Error` thrown value (e.g. a `transform` that throws `null`) no longer makes `refetch()` reject with a `TypeError`; it becomes an `error()` message. An abort through a caller's `signal` with a custom reason is no longer reported as an error. A `transform` that calls `reset()`, `stop()` or `refetch()` no longer publishes its stale result (N131)
- `@go4cas/quiver`: pages whose names hold spaces or other Unicode (`release notes.js`, `café.js`) are reachable. The browser reports `/release%20notes`, and static segments used to be compared byte for byte with the literal key; they are now compared decoded and in Unicode NFC, so literal and percent-encoded keys both match, at the root and under a base, from the Vite plugin, the Bun plugin and `quiver routes`. A file name stored as NFD (older macOS) gives the same NFC route
- `@go4cas/quiver`: `initRouter()` rejects two keys that spell one route two ways (`/café`, `/caf%C3%A9`), and the scanner rejects `%` and `\` in page names, naming the file
- `quiver routes --watch`: a missing or unreadable pages folder prints one `[quiver] ` line and exits 1, instead of a stack trace; a watcher error does the same. Scans no longer overlap, so a burst of changes ends at the manifest for the folder's final state, and the file is replaced atomically through a temporary file. A scan error still leaves the last good manifest in place
- `useForm` recipe: a throwing or rejecting `validate` no longer leaves the form stuck in `submitting`; its message goes to `form.message` and the user can submit again. Each submit clears `submitted` and `message` first, and `validate` and `onSubmit` get the same snapshot of the values
- Starter: leaving the Posts page aborts its requests (from an `afterEach` registered in the page, since a page inside a layout gets no `onCleanup`)
- Core tarball: `prepack` copies each recipe's registry `files` and README, the same copy `recipes:sync` uses, so stray files in a recipe folder can't ship
- `/add-layout`: the scaffold adds the toast import and the `ToastContainer()` mount together, only when the toasts recipe is installed

### Added

- `@go4cas/quiver`: a Playwright suite on the real Navigation API (`packages/quiver/tests/browser/`, ports 5185 and 5195), run by `bun run test:e2e`
- `bun run pack:types` uses the Vite plugin inside Vite's `defineConfig()` and the Bun plugin inside a `Bun.build()` call typed by `@types/bun`, with `skipLibCheck: false`

### Security

- Repo tooling only, no package change: the docs toolchain resolves Vue 3.5.45 (was 3.5.33, GHSA-g2v6-rqmx-r4w6) and a single `source-map-js` 1.2.2 (was also 1.2.1, GHSA-68fv-2mgg-jv7q) through root `overrides`. VitePress 1.6.4's Vite 5.4.21 and esbuild 0.21.5 dev-server advisories are accepted until 2027-02-11 (NOTES N150)
- `bun run audit` and a CI `audit` job fail on any lockfile advisory not listed, unexpired and version-scoped, in `scripts/audit-exceptions.json`
- CI: the Pages deploy permissions are on the deploy job only; actions are pinned to commit SHAs and the Playwright image to its digest; checkouts don't persist credentials; the screenshot re-capture renders with a read-only token and a separate job, which installs and runs nothing, commits the PNGs (NOTES N151)
- `Link` recipe: `to` may be a path or an `http(s):`, `mailto:` or `tel:` URL; any other scheme (`javascript:`, `data:`…) and `//host` render without an `href`
- Starter: the sign-in page says it is a demo with no password check and no session; the layouts recipe documents what a real `signOut` must do (end the server session, clear client user state)

### Documentation

- Cleanup claims for `arrow-use` and pages are qualified for pages inside a layout, with the `afterEach` pattern in troubleshooting

## [3.0.2] - 2026-11-10

### Fixed

- `@go4cas/quiver`: the published types no longer name `NavigationResult`, which TypeScript 5.x's DOM lib doesn't have, so projects on TypeScript 5.x with `skipLibCheck: false` no longer get `TS2304: Cannot find name 'NavigationResult'` from `types/router.d.ts`. No runtime change

### Added

- `bun run pack:types` (CI `pack` job): type-checks both packed tarballs in fresh projects on TypeScript 5.9 and the repo's TypeScript with `skipLibCheck: false`

## [3.0.1] - 2026-11-10

### Fixed

- `@go4cas/quiver`: the `bin` path is written without a leading `./`, so `npm publish` no longer warns that it was invalid and removed
- `@go4cas/quiver/vite`: adding or removing a file the scanner skips (a name or folder starting with `_` or `.`, e.g. `pages/_parts/Card.js`) no longer invalidates `quiver:routes` and reloads the page in dev
- `@go4cas/quiver`: a top-level `"types"` field, so TypeScript projects on `moduleResolution: node10` (which ignores `exports`) find the main entry's types

## [3.0.0] - 2026-11-10

### Removed

- **Breaking:** Tailwind CSS. `tailwindcss`, `@tailwindcss/vite` and the Vite plugin are gone, and no markup uses utility classes. Apps built on the 2.x template that added their own Tailwind classes need Tailwind added back themselves, or the classes rewritten as plain CSS
- The `theme-glass:` / `theme-brutalist:` / `dark:` variants and the `--color-*`, `--radius-*`, `--shadow-*`, `--font-*` Tailwind theme tokens. `--font-ui` (never used) is dropped

### Added

- `"publishConfig": { "access": "public" }` in `@go4cas/quiver`, so the first publish of the scoped package is public without `--access public`
- A plain-CSS token contract of 27 `--q-*` custom properties in `src/styles/tokens.css` (colours, radii, shadows, font stacks), including the new `--q-color-on-brand` and `--q-font-body`, with the `[data-theme]` / `[data-mode]` override blocks
- `src/styles/base.css`, the reset that replaces Tailwind's preflight, and `src/styles/effects.css` for per-theme effects, all in the cascade layers `quiver.tokens`, `quiver.base`, `quiver.components`, `quiver.effects`. Unlayered app CSS beats them without `!important`
- Component CSS beside each component and layout (`q-` classes for the reusable ones), with state as attributes (`aria-current`, `aria-pressed`, `data-type`, `data-state`) and hook classes `q-panel`, `q-sidebar`, `q-header`, `q-accent` for theme effects
- Self-hosted fonts (Audiowide, Orbitron, Space Grotesk, VT323; latin woff2 with their OFL licences) instead of the Google Fonts request
- A visual-parity suite (`bun run test:visual`): every page state in 5 themes × 2 modes, desktop and mobile, 190 screenshots, run by a new `screenshots` CI job in the pinned Playwright image
- A repo test that fails if Tailwind reappears outside the changelog and the theming guide's layer-order note
- Repo tests that fail if core imports from the starter, if `starter/package.json` uses a `workspace:` range, or if core's typecheck config gains ambient types
- `initRouter({ base })`: apps can live under a sub-path. The base comes from the option, else the directory of `<base href>`, else `/`. Every path the app sees or passes (`go()`, guards, hooks, manifest keys, `useRoute().path()`) is base-relative, and navigations outside the base load normally
- `url(path)` for base-aware hrefs (query and hash kept; absolute URLs unchanged)
- `afterEach(fn)` and `onError(fn)` hooks. Guard, load and render errors all reach the error view, which now receives `{ message, error, retry }`
- `destroy()` (also `app.destroy()`) tears down the router, guards, hooks, context, meta watchers and the mounted app, so `initRouter()` + `createApp()` can run again
- Route manifests are validated (each mistake is a `TypeError` naming the key), and routes are sorted deterministically whatever the key order
- The starter runs under a sub-path with `QUIVER_BASE=/sub/app/`, and every e2e test also runs that way (`subpath` Playwright project)
- File-based routing as part of `@go4cas/quiver`: the Vite plugin `@go4cas/quiver/vite` and the Bun plugin `@go4cas/quiver/bun` serve the route manifest for `src/pages/` as the virtual module `quiver:routes` (`import routes, { notFound } from 'quiver:routes'`), and the `quiver routes [--dir] [--out] [--watch]` CLI writes it to `src/routes.gen.js` for any other setup. All three use one scanner with the 2.x file rules. The Bun plugin works with `Bun.build({ splitting: true })`, one chunk per page. In Vite dev, adding or removing a page reloads the browser with the new manifest
- Files and folders in `src/pages/` whose name starts with `_` or `.` are skipped, so pages folders can hold partials
- `@go4cas/quiver/client`: types for `quiver:routes`. Add it to `compilerOptions.types`, as with `vite/client`
- Three example apps, one per build mode, each with an e2e smoke test at `/` and under `/sub/app/` in CI: `examples/vite` (the `quiver()` Vite plugin, dev server and production build), `examples/bun` (`Bun.build` with `@go4cas/quiver/bun` and page splitting) and `examples/no-build` (no bundler: an import map for `@arrow-js/core` and `@go4cas/quiver`, one Arrow copy, a hand-written route manifest). The Bun and no-build examples set the base path with `<base href>` alone
- `arrow-use` 0.1.0, a composables package for any Arrow.js app (no Quiver needed) in `packages/arrow-use/`: `useFetch` (moved from the starter), `useStorage` (`localStorage`/`sessionStorage`, synced across tabs, memory fallback), `useMediaQuery` and `useEventListener`. Each returns getters plus `stop()`, cleans up when its `component()` unmounts, and can be imported outside a browser. Option and return types are exported too (`UseFetchReturn`, `UseStorageReturn<T>`, …). Includes a vanilla Arrow example with an import map and a smoke test
- `useFetch().stop()`: aborts the request in flight and ignores later `refetch()` calls
- Recipes: `recipes/` holds the opinionated pieces as copy-in code you own: `theme` (`tokens.css`, `base.css`, optional `effects.css` and fonts), `link`, `toasts`, `theme-switcher`, `useForm`, `hmrState`, `layouts` and `views`. Each has JS, CSS where it has styles, a README and tests; `recipes/index.json` lists their files, CSS order, dependencies and aliases. They ship inside the `@go4cas/quiver` tarball under `recipes/` (copied in at `prepack`, not in `exports`). `toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so plain Arrow apps can use them
- The Quiver Claude Code plugin (`plugins/quiver/`, installable with `/plugin marketplace add go4cas/quiver` and `/plugin install quiver@quiver`): the eight `/add-*` commands, now usable in any app. `/add-component`, `/add-layout`, `/add-theme` and `/add-composable` install the matching recipe from `node_modules/@go4cas/quiver/recipes/` (e.g. `/add-component toast` in a plain Arrow app gives it working toasts) and otherwise scaffold new code
- `AGENTS.md` and `llms.txt` ship inside `@go4cas/quiver` for agents working in apps; the starter's `CLAUDE.md` imports both from `node_modules`
- `views` recipe: `LoadingView`, and `ErrorView` with a **Try again** button that calls `retry()` (the starter's 2.x error card ignored it) and a **Go home** link
- `MenuLayout` reads its sidebar links from `provide('nav', [{ to, label }])`, and its logo, footer and sign-out from optional `logo`, `footer` (on `'app'`) and `signOut` (on `'currentUser'`), so apps configure it in `main.js` instead of editing it
- `.d.ts` files for every entry point, generated from the JSDoc at `prepack`: `@go4cas/quiver`, `@go4cas/quiver/vite` and `@go4cas/quiver/bun` (the plugins' types included), and `arrow-use`
- A rewritten documentation site: every guide updated for 3.0, a [2.x → 3.0 migration guide](https://go4cas.github.io/quiver/guide/migration), an optional Tailwind guide (exposing the `--q-*` tokens through a v4 `@theme`), an API reference for `@go4cas/quiver`, `/vite`, `/bun`, `/client`, the `quiver routes` CLI and `arrow-use`, a page per `arrow-use` composable and per recipe, and an examples page. Repo tests check that every export, CLI flag, recipe, composable and example is documented
- `bun run pack:check` checks the file list of both npm tarballs, and `bun run pack:try` runs the examples and the starter, copied out of the repository, against the packed tarballs; a new `pack` CI job runs both

### Changed

- **Breaking:** `useFetch` moved from the starter's `src/composables/useFetch.js` to `arrow-use`: `import { useFetch } from 'arrow-use'`. Its behaviour is unchanged, except that `data()` now returns the parsed JSON itself rather than a reactive proxy of it, so mutating that object no longer re-renders (call `refetch()`, or copy it into your own `reactive()`)
- **Breaking:** the repository is a Bun workspace. The router, `provide`/`inject`, `useMeta`, `useRoute`, `useRouter` and `createApp` moved from `src/framework/`, `src/state/routerState.js` and `src/composables/useRoute.js`/`useRouter.js` into the package `@go4cas/quiver` (`packages/quiver/`, version 3.0.0, not published yet). The demo app moved to `starter/` and imports them from `@go4cas/quiver`. New projects scaffold with `bunx degit go4cas/quiver/starter my-app` once 3.0.0 is on npm; the 2.x template stays at `go4cas/quiver#v2.1.0`
- **Breaking:** `initRouter({ routes, notFound })` takes a route manifest (pattern → loader) instead of globbing `src/pages/` itself; the starter builds it in `src/routes.js`. `createApp({ target, layouts, defaultLayout, loading, error })` takes the mount element and the layouts and loading/error views instead of importing them from the app. Behaviour is unchanged for the starter
- `routerState` is no longer importable; `Link` and `MenuLayout` read the route through `useRoute()`
- Root scripts (`dev`, `build`, `test`, `test:e2e`, `typecheck`, `docs:*`) run across the workspaces with `bun run --filter`; each workspace has its own `jsconfig.json`, and core's has no `vite/client` types
- `ThemeSelector`'s `THEMES` entries are `{ id, label, swatch, swatchDark? }` (hex colours) instead of Tailwind `bg-[…]` class strings
- `bun run test:e2e` runs only the e2e project; `bun run test:visual` runs the screenshot projects
- **Breaking:** the starter's reusable pieces moved into recipe copies under `starter/src/quiver/`: `components/{Link,ToastContainer,ThemeSelector,ThemeToggle,LoadingCard,ErrorCard}.js`, `composables/{useForm,useToast}.js`, `state/{toastState,uiState}.js`, `utils/hmrState.js`, `styles/` and the two layouts. Imports change accordingly (for example `useToast` and `toastState` now come from `src/quiver/toasts/toasts.js`, `useForm` from `src/quiver/useForm/useForm.js`); `LoadingCard`/`ErrorCard` are `LoadingView`/`ErrorView`; the screenshots are unchanged
- **Breaking:** `uiState` is replaced by the theme switcher's `themeState` (`theme()`, `mode()`, `setTheme()`, `setMode()`, `toggleMode()`), built on one shared `useStorage` per key and `useMediaQuery`. The stored `ui-theme`/`ui-mode` values are read as before; the mode now follows the system setting until the user picks one, and nothing is written to storage until then
- Toasts leave when their exit animation ends (`el.getAnimations()`), not after a fixed 200 ms, so they also go at once with reduced motion or without the CSS. `toastState.dismiss()` returns a promise that resolves once the toast is removed
- The `/add-*` commands moved from `.claude/commands/` into the plugin; in this repository `.claude/settings.json` offers the plugin instead
- **Breaking:** `createApp()` mounts straight into `target` with no wrapper `<div>` and replaces the target's existing children. Core's bare loading/error views have no classes. An unknown layout renders the page bare with a warning instead of falling back to `defaultLayout`; a page without `meta.layout` still gets `defaultLayout`
- **Breaking:** startup mistakes throw: `createApp()` before `await initRouter()`, a second `initRouter()`/`createApp()` before `destroy()`, a missing `target`, a current URL outside the base, `go()` before `initRouter()`
- `go()` and guard redirect strings keep their query and hash (2.x dropped them)
- `Link` is a plain anchor (`href` via `url()`) without a click handler, so Cmd/Ctrl/middle-click open a new tab
- Form POST and download navigations are left to the browser instead of being intercepted
- A guard that cancels a navigation now puts back the previous URL with its query and hash, and no longer reloads the page
- A guard redirect to the path already being navigated to proceeds in-app as it does on the first load, so a guard like `() => '/login'` no longer hits the redirect cap on `/login`
- **Breaking:** the starter's `src/routes.js` is gone; `main.js` imports the manifest from `quiver:routes`, served by the `quiver()` plugin in `vite.config.js`, and `@go4cas/quiver/client` in `jsconfig.json` types it
- Route discovery errors that 2.x ignored now fail the scan with a `[quiver]` message naming the files: a `not-found.js` below the pages root (2.x dropped it silently), two files for one route (`users.js` + `users/index.js`), two that differ only in the param name, or an invalid param name
- A script reload (`location.reload()`, including Vite's dev-server full reload) now loads a new document; 2.x and earlier 3.0 work intercepted it as an in-app navigation, so Vite's reload did nothing. The error view's `retry()` still re-runs the route in place
- `quiver routes` refuses an `--out` `.js` file inside `--dir` (exit code 2), which the scan would otherwise pick up as a page of its own manifest; a name starting with `_` there is fine. Under `--watch`, the watcher starts before the first write, so a page added during startup is not missed
- The docs navbar shows the version of `@go4cas/quiver` (it read the root `package.json`, which has none since the workspace split)

### Fixed

- Retro body text now uses VT323 and brutalist body text Space Grotesk; a later `:root` rule overrode both in 2.1
- Per-theme panel and float shadows now apply in mono, glass, retro and brutalist; 2.1's compiled shadow utilities always used the default shadow
- Brand buttons are readable in mono dark (contrast 1.04 → 18.97), retro dark (1.51 → 13.29) and brutalist (1.53 → 13.71)
- The brutalist sidebar border sits only on the edge facing the content, not on all four sides
- After a non-dismissible toast had gone, later toasts no longer rendered, because of an Arrow 1.0.6 slot bug; the toast's dismiss slot now always renders a template

## [2.1.0] - 2026-10-01

### Added

- Status colour tokens: `success`, `error`, `warning`, `info`, each with a `-tint` variant, defined for light and dark mode in `src/style.css`

### Changed

- Toasts, alerts, form errors, status badges and the demo pages use the status tokens instead of hard-coded Tailwind palette classes, so they now follow the active theme. The decorative concept badges on the demo pages use `brand-tint`
- Docs no longer recommend palette utilities for status colour

## [2.0.1] - 2026-09-30

### Changed

- The npm fallback now needs Node.js 22.12+ (was 20.19+), because Vitest 5 dropped Node 20. Node 20 reached end-of-life in April 2026. Bun users are unaffected
- Vitest 4 → 5 (dev dependency)

## [2.0.0] - 2026-09-29

A smaller API and a Bun toolchain. Every removal below is breaking; each has a one-step replacement.

### Migrating from 1.x

| 1.x | 2.0 |
|---|---|
| `createStore((reactive) => reactive({ items: [] }))` | `reactive({ items: [] })` from `@arrow-js/core` |
| `toastState.configure({ duration: 6000 })` | Pass `{ duration: 6000 }` per toast (`useToast().success('Saved', { duration: 6000 })`), or edit the default in `toastState.add()` |
| Toast `position` option | Toasts render bottom-right; change the classes in `ToastContainer.js` to move them |
| `await createApp({ root: '#app', plugins: [p] })` | `p.install()` then `createApp()` |
| `getRouteRecords()` | No replacement (it had no callers) |
| `theme-retro:` / `theme-mono:` classes | Register the variant in `src/style.css`, like `theme-glass:` |
| `useFetch(url, { delay: 1500 })` | `useFetch(url)` |
| `npm install && npm run dev` | `bun install && bun run dev` (npm still works on Node.js 20.19+, without a lockfile) |

### Changed

- **Breaking (toolchain):** Bun 1.4+ is the supported package manager and runtime. `bun.lock` replaces `package-lock.json`; `bunfig.toml` runs scripts and tools on Bun; CI, the docs deploy and Playwright's dev server use Bun; Dependabot tracks the `bun` ecosystem. Scripts stay plain, so `npm install && npm run dev` still works on Node.js 20.19+ (without a lockfile) — this is how the StackBlitz button runs
- `bun.lock` is pinned to `"lockfileVersion": 1`, the newest format Dependabot's Bun updater can read (see the note in `.github/dependabot.yml`)

### Removed

- **Breaking:** `createStore()` — state modules are plain `reactive({...})` objects from `@arrow-js/core`, like `routerState` and `uiState` already were
- **Breaking:** `toastState.configure()`, `toastState.config` and toast positions — toasts render bottom-right; `duration` and `dismissible` remain per-call options (via `useToast()` or `toastState.add()`), and their defaults are edited in `toastState.add()`
- **Breaking:** `createApp()` options `root` and `plugins` — it always mounts `#app`; run setup code before calling it. `createApp()` is now synchronous
- **Breaking:** `getRouteRecords()` from `src/framework/router.js` — it had no callers
- **Breaking:** the unused `theme-retro:` and `theme-mono:` Tailwind variants — the themes remain; register a variant in `src/style.css` when a component needs one
- **Breaking:** the `useFetch` `delay` option — data is exposed as soon as it arrives; use DevTools network throttling to inspect loading states

### Fixed

- The sidebar footer no longer shows a hard-coded, stale `v1.0`

## [1.1.1] - 2026-09-29

### Changed

- Internal simplifications with no behaviour change: `resolveRoute` state writes, redundant root-path special cases in `scoreRoute`/`matchPath`, `hmrState`, the default Vite port setting, a no-op `nextTick()` in the Team page, and a redundant `forcedError` flag in the Posts demo
- Dev dependency lockfile bumps (Vitest 4.1.11, PostCSS 8.5.28, undici 7.30.0) clear all open dev-only Dependabot alerts

### Removed

- `@arrow-js/framework` dependency — `createApp()` mounts the root template with `@arrow-js/core` directly (also drops its nested `jsdom`/`ws` install tree)
- Undocumented `page.layout` fallback — a page's layout comes from `meta.layout` only
- Duplicate `docs/guide/contributing.md`; the docs sidebar links to `CONTRIBUTING.md`
- Separate API reference section (`docs/api/`) — its reference tables are folded into the matching guide pages, so each topic is documented once
- `.github/copilot-instructions.md` — `AGENTS.md` is the single source for every AI tool, Copilot included
- Accidentally committed `.claude/worktrees/` gitlink (now ignored)

### Fixed

- A malformed percent-escape in a URL (e.g. `/users/%zz`) now matches the route with the raw segment instead of rendering the error page
- A toast's auto-dismiss timer is cancelled on manual dismiss, so a stale timer can no longer fire against a removed toast
- A throwing `onSubmit` is caught and surfaced as `form.message` instead of becoming an unhandled promise rejection
- The toast demo page's position `<select>` now follows the template's own reactive-slot and `.key()` rules

## [1.1.0] - 2026-07-05

### Added

- The user detail page demonstrates a reactive document title via `useMeta` (`src/pages/users/[id].js`)

### Removed

- `src/components/index.js` barrel file — import components directly from their source files

### Fixed

- Reactive `useMeta` watchers are now cleared by the router on every navigation, so a reactive title can no longer leak onto the next page

- Rapid navigation can no longer render a stale page: `resolveRoute` now ignores writes from superseded navigations
- A guard cancelling a navigation no longer remounts the current page (and can no longer cause a navigate loop)
- `go()` no longer leaks unhandled `AbortError` rejections when a navigation is preempted or cancelled
- `useForm` ignores repeat submits while an async `validate` is still pending
- Inactive nav links no longer render `aria-current="undefined"` (announced as current by screen readers); the attribute is now omitted entirely

### Changed

- `npm test` now runs the unit suite once; use `npm run test:watch` for watch mode
- CI workflow token is scoped to `contents: read`
- Docs: guard initial-load behaviour, `useFetch` `reset()`/`delay`, and async `validate` are now documented; routing guide notes that client-side guards are UX, not authorization
- Dev dependencies bumped (Vite 8.1.3, Vitest 4.1.9, Playwright 1.61.1, Tailwind 4.3.2) and GitHub Actions updated (checkout v7, setup-node v6, Pages actions) via Dependabot

## [1.0.0] - 2026-07-05

First tagged release.

### Added

- File-based routing built on the Navigation API, with dynamic segments, specificity-aware matching, and `beforeEach` navigation guards
- Layout system with `BasicLayout` and `MenuLayout`
- Reactive global state via `createStore()`, with built-in `userState`, `uiState`, `toastState`, and `routerState` modules
- Composables: `useRoute`, `useRouter`, `useForm`, `useFetch`, `useToast`
- `provide`/`inject` dependency injection and `useMeta` for document metadata
- Four visual themes (Monochrome, Liquid Glass, Retro / Y2K, Neo Brutalism) with dark/light mode
- Vitest unit tests, Playwright end-to-end tests, and a CI workflow that runs both
- AI tooling: `CLAUDE.md`, `AGENTS.md`, Copilot instructions, and Claude Code slash commands
- VitePress documentation site with developer guides and API reference

### Fixed

- Navigation guards now run on the initial page load, so deep links can no longer bypass them
- `useFetch` no longer lets a superseded request clear the loading state of a newer one; caller-supplied abort signals are honoured; `reset()` aborts in-flight requests
- `useForm` awaits async `validate()` functions instead of silently passing validation
- Blocked `localStorage` (embedded iframes, strict privacy modes) no longer crashes the app at startup

[Unreleased]: https://github.com/go4cas/quiver/compare/v3.0.3...HEAD
[3.0.3]: https://github.com/go4cas/quiver/releases/tag/v3.0.3
[3.0.2]: https://github.com/go4cas/quiver/releases/tag/v3.0.2
[3.0.1]: https://github.com/go4cas/quiver/releases/tag/v3.0.1
[3.0.0]: https://github.com/go4cas/quiver/releases/tag/v3.0.0
[2.1.0]: https://github.com/go4cas/quiver/releases/tag/v2.1.0
[2.0.1]: https://github.com/go4cas/quiver/releases/tag/v2.0.1
[2.0.0]: https://github.com/go4cas/quiver/releases/tag/v2.0.0
[1.1.1]: https://github.com/go4cas/quiver/releases/tag/v1.1.1
[1.1.0]: https://github.com/go4cas/quiver/releases/tag/v1.1.0
[1.0.0]: https://github.com/go4cas/quiver/releases/tag/v1.0.0
