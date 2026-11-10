# Changelog

All notable changes to Quiver are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **Breaking:** Tailwind CSS. `tailwindcss`, `@tailwindcss/vite` and the Vite plugin are gone, and no markup uses utility classes. Apps built on the 2.x template that added their own Tailwind classes need Tailwind added back themselves, or the classes rewritten as plain CSS
- The `theme-glass:` / `theme-brutalist:` / `dark:` variants and the `--color-*`, `--radius-*`, `--shadow-*`, `--font-*` Tailwind theme tokens. `--font-ui` (never used) is dropped

### Added

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

### Changed

- **Breaking:** the repository is a Bun workspace. The router, `provide`/`inject`, `useMeta`, `useRoute`, `useRouter` and `createApp` moved from `src/framework/`, `src/state/routerState.js` and `src/composables/useRoute.js`/`useRouter.js` into the package `@go4cas/quiver` (`packages/quiver/`, version 3.0.0, not published yet). The demo app moved to `starter/` and imports them from `@go4cas/quiver`. New projects scaffold with `bunx degit go4cas/quiver/starter my-app` once 3.0.0 is on npm; the 2.x template stays at `go4cas/quiver#v2.1.0`
- **Breaking:** `initRouter({ routes, notFound })` takes a route manifest (pattern → loader) instead of globbing `src/pages/` itself; the starter builds it in `src/routes.js`. `createApp({ target, layouts, defaultLayout, loading, error })` takes the mount element and the layouts and loading/error views instead of importing them from the app. Behaviour is unchanged for the starter
- `routerState` is no longer importable; `Link` and `MenuLayout` read the route through `useRoute()`
- Root scripts (`dev`, `build`, `test`, `test:e2e`, `typecheck`, `docs:*`) run across the workspaces with `bun run --filter`; each workspace has its own `jsconfig.json`, and core's has no `vite/client` types
- `ThemeSelector`'s `THEMES` entries are `{ id, label, swatch, swatchDark? }` (hex colours) instead of Tailwind `bg-[…]` class strings
- `bun run test:e2e` runs only the e2e project; `bun run test:visual` runs the screenshot projects
- **Breaking:** `createApp()` mounts straight into `target` with no wrapper `<div>` and replaces the target's existing children. Core's bare loading/error views have no classes. An unknown layout renders the page bare with a warning instead of falling back to `defaultLayout`; a page without `meta.layout` still gets `defaultLayout`
- **Breaking:** startup mistakes throw: `createApp()` before `await initRouter()`, a second `initRouter()`/`createApp()` before `destroy()`, a missing `target`, a current URL outside the base, `go()` before `initRouter()`
- `go()` and guard redirect strings keep their query and hash (2.x dropped them)
- `Link` is a plain anchor (`href` via `url()`) without a click handler, so Cmd/Ctrl/middle-click open a new tab
- Form POST and download navigations are left to the browser instead of being intercepted
- A guard that cancels a navigation now puts back the previous URL with its query and hash, and no longer reloads the page
- A guard redirect to the path already being navigated to proceeds in-app as it does on the first load, so a guard like `() => '/login'` no longer hits the redirect cap on `/login`
- **Breaking:** the starter's `src/routes.js` is gone; `main.js` imports the manifest from `quiver:routes`, served by the `quiver()` plugin in `vite.config.js`, and `src/quiver-routes.d.ts` types it
- Route discovery errors that 2.x ignored now fail the scan with a `[quiver]` message naming the files: a `not-found.js` below the pages root (2.x dropped it silently), two files for one route (`users.js` + `users/index.js`), two that differ only in the param name, or an invalid param name
- A script reload (`location.reload()`, including Vite's dev-server full reload) now loads a new document; 2.x and earlier 3.0 work intercepted it as an in-app navigation, so Vite's reload did nothing. The error view's `retry()` still re-runs the route in place

### Fixed

- Retro body text now uses VT323 and brutalist body text Space Grotesk; a later `:root` rule overrode both in 2.1
- Per-theme panel and float shadows now apply in mono, glass, retro and brutalist; 2.1's compiled shadow utilities always used the default shadow
- Brand buttons are readable in mono dark (contrast 1.04 → 18.97), retro dark (1.51 → 13.29) and brutalist (1.53 → 13.71)
- The brutalist sidebar border sits only on the edge facing the content, not on all four sides

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

[2.1.0]: https://github.com/go4cas/quiver/releases/tag/v2.1.0
[2.0.1]: https://github.com/go4cas/quiver/releases/tag/v2.0.1
[2.0.0]: https://github.com/go4cas/quiver/releases/tag/v2.0.0
[1.1.1]: https://github.com/go4cas/quiver/releases/tag/v1.1.1
[1.1.0]: https://github.com/go4cas/quiver/releases/tag/v1.1.0
[1.0.0]: https://github.com/go4cas/quiver/releases/tag/v1.0.0
