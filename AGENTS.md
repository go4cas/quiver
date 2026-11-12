# Quiver — AI agent context

This file is the single source of truth for AI assistants working in this repo. `CLAUDE.md` imports it for Claude Code; Codex and other AGENTS.md-aware tools read it directly. Edit conventions here, not in `CLAUDE.md`.

Quiver is a drop-in router, context and meta layer for Arrow.js (`@go4cas/quiver`), with an Arrow-only composables package (`arrow-use`), copy-in recipes, a Claude Code plugin, and a starter app with file-based routing, layouts, reactive state and a full testing setup. Stack: Arrow.js · Vite · plain CSS on a `--q-*` token contract · Vitest · Playwright. The router is built on the Navigation API (modern browsers only).

---

## Folder structure

The repo is a Bun workspace (planning/v3/TECH-SPEC.md §6). The core package and the starter app are separate workspaces; the starter imports core as `@go4cas/quiver`, never by a relative path.

```
packages/quiver/     # @go4cas/quiver — the core package, edit with care
├── src/             # index.js (public entry, exactly 13 names), router.js (pipeline, guards, hooks),
│                    # app.js (createApp/destroy), base.js (base path, url()), match.js (patterns and the
│                    # route rules both manifest sources share: PATTERN_RULES, patternIssue, routeSet),
│                    # state.js (private router state), route.js (useRoute/useRouter), context.js,
│                    # meta.js, types.js (shared typedefs)
│   └── node/        # Node/Bun only, never imported by browser code: scanner.js (pages/ → manifest),
│                    # conventions.js (scanApp/generateApp: the source folder → `quiver:app`, 3.2),
│                    # literal.js (reads a page's literal `meta` at build time),
│                    # vite.js (@go4cas/quiver/vite), bun.js (@go4cas/quiver/bun)
├── bin/quiver.js    # CLI: `quiver routes [--dir] [--out] [--watch]` writes routes.gen.js,
│                    # `quiver app [--src] [--out] [--watch]` writes app.gen.js (3.2)
├── client.d.ts      # Types for `quiver:routes` and `quiver:app` (@go4cas/quiver/client, add to jsconfig "types")
├── scripts/         # prepack.js copies recipes/ into the package (X-10), postpack.js removes it
├── AGENTS.md        # Agent guide for apps that USE Quiver (ships in the tarball; not this file)
├── llms.txt         # Short index for LLMs (ships in the tarball)
└── tests/           # Unit tests for core (Vitest, jsdom; helpers/navigation.js fakes the Navigation API;
                     # fixtures/pages/ is the route parity fixture, fixtures/broken/ the scanner error cases;
                     # fixtures/app/ the quiver:app parity fixture (app.manifest.txt), fixtures/broken-app/ its errors;
                     # route-rules.test.js runs one rule table against manual and scanned manifests;
                     # browser/ is a Playwright suite on the real Navigation API in Chromium, Firefox and WebKit,
                     # ports 5185 and 5195)

packages/arrow-use/  # arrow-use — Arrow-only composables (VueUse-style), no Quiver imports (SPEC §7, TECH-SPEC §8)
├── src/             # index.js (re-exports only), useFetch.js, useStorage.js, useMediaQuery.js, useEventListener.js
├── tests/           # Unit tests against bare @arrow-js/core (jsdom; no-browser.test.js runs in node)
└── example/         # Vanilla Arrow app behind an import map (no Quiver, no bundler); e2e smoke test, port 5183

recipes/             # Copy-in recipes (private workspace quiver-recipes; shipped in the core tarball, D32)
├── index.json       # Registry: files, css, requires, packages, aliases per recipe
├── README.md        # How to install a recipe (the procedure the /add-* commands follow)
├── <name>/          # theme, link, toasts, theme-switcher, useForm, hmrState, layouts, views:
│                    # JS and CSS named by role (Toasts.js, useForm.js, menu.js; theme: CSS only),
│                    # README.md, tests/ (never copied)
├── tests/           # registry.test.js: index.json matches the folders, imports, layer headers
└── e2e/             # A plain Arrow app (no Quiver, no bundler) using the toasts recipe; port 5184

plugins/quiver/      # The Quiver Claude Code plugin: .claude-plugin/plugin.json + commands/add-*.md
.claude-plugin/      # marketplace.json: this repo as a plugin marketplace (`/plugin marketplace add go4cas/quiver`)
scripts/             # sync-recipes.js (`bun run recipes:sync`): installs recipes/ into starter/src/ by role (D44);
                     # try-packed.js (`pack:try`) and check-packed-types.js (`pack:types`) test the packed tarballs;
                     # audit.js (`bun run audit`) + audit-exceptions.json: dependency advisories (N150)
                     # release-check.js: which package, version and dist-tag a release tag stages (publish.yml, N165)

starter/             # The starter app (degit target: go4cas/quiver/starter)
├── CLAUDE.md        # Imports node_modules/@go4cas/quiver/AGENTS.md and llms.txt
├── src/
│   ├── pages/       # File-based routes — add your pages here; meta.nav adds a sidebar link
│   ├── layouts/     # default.js, menu.js (layouts recipe) — one file per layout, no registry
│   ├── views/       # loading.js, error.js (views recipe)
│   ├── app.config.js # app and currentUser, provided by name (D41)
│   ├── components/  # App components (Counter, UserCard) plus the link, toasts, theme-switcher recipes
│   ├── composables/ # useForm, hmrState (recipes)
│   ├── styles/      # tokens.css, base.css, effects.css, fonts/ (theme recipe)
│   ├── state/       # Global reactive state modules — add stores here
│   ├── app.css      # Starter page styles (plus Counter.css, UserCard.css beside their components)
│   ├── style.css    # CSS entry: layer order + @imports — add each new stylesheet here
│   └── main.js      # App entry: await createApp(app, { target, base }) with quiver:app
└── tests/
    ├── unit/        # Unit tests for quiver:routes, quiver:app and app state (Vitest)
    ├── e2e/         # End-to-end tests (Playwright)
    └── visual/      # Screenshot parity, every page × 5 themes × 2 modes (Playwright)

examples/            # One small app per build mode, each copyable on its own (SPEC P5)
├── vite/            # Vite + quiver() plugin; e2e: dev server at /, production build under /sub/app/
├── bun/             # Bun.build + @go4cas/quiver/bun (splitting); build.js, serve.js
└── no-build/        # No bundler: import map for @arrow-js/core and @go4cas/quiver, `src/app.gen.js` written by `quiver app`

docs/                # VitePress docs site (workspace quiver-docs): guide/, api/ (one page per entry point + CLI),
                     # arrow-use/ (one page per composable), recipes/ (one page per recipe), examples.md
tests/repo/          # Repo-wide checks (Vitest): R7 grep, package boundaries, starter deps, core config, package.json rules,
                     # examples, recipe copies, docs coverage
tests/pack/          # `bun run pack:check`: npm pack --dry-run file lists for both packages (X-4)
tests/packed/bun-app/ # A quiver:app app built by Bun.build (splitting); only `bun run pack:try` runs it, ports 5186/5196 (R32-12)
```

The `/add-*` slash commands live in the Quiver plugin (`plugins/quiver/commands/`); `.claude/settings.json` offers it in this repo (or run `claude --plugin-dir plugins/quiver`). In this repo they work on the starter, so their `src/` and `tests/` paths are relative to `starter/`, and they read recipes from `recipes/`. Recipe files in the starter (`styles/`, `components/Link.js`, `Toasts.*`, `ThemeSwitcher.*`, `composables/`, `layouts/`, `views/`) are installed copies: change `recipes/<name>/`, then run `bun run recipes:sync`.

---

## Commands

Run these from the repo root. They fan out to the workspaces with `bun run --filter` (TECH-SPEC W-2):

```
bun run dev           # Start the starter's Vite dev server
bun run test          # Repo checks (tests/repo), then every workspace's unit tests
bun run test:watch    # Starter unit tests in watch mode
bun run test:e2e      # E2E tests (Playwright) in every workspace that has them
bun run test:browsers # Core's router suite in Chromium, Firefox and WebKit (needs `bunx playwright install firefox webkit`)
bun run test:visual   # Screenshot parity — only matches inside the pinned Playwright image (starter/tests/visual/README.md)
bun run typecheck     # Type-check every workspace via JSDoc (tsc --noEmit, checkJs)
bun run build         # Production build of the starter
bun run recipes:sync  # Install recipes/ into starter/src/ by role after editing a recipe
bun run pack:check    # npm pack --dry-run for both packages: exact file lists, .d.ts, recipes (X-4)
bun run pack:try      # Copy the examples and the starter out, install the packed tarballs, typecheck + e2e
bun run pack:types    # Type-check the packed .d.ts in fresh TypeScript 5.9 and repo-TypeScript projects, skipLibCheck off
bun run audit         # bun audit on the whole lockfile; fails on advisories not accepted in scripts/audit-exceptions.json
bun run docs:dev      # Start docs site locally
bun run docs:build    # Build docs site
```

Always run `bun run typecheck && bun run test && bun run test:e2e` before completing a task.

Node minimums differ by scope (NOTES N148): the published `@go4cas/quiver` (CLI, Vite and Bun plugins) runs on Node 22.12+; the workspace and the starter need jsdom's range, `^22.22.2 || ^24.15.0 || >=26.0.0`. CI's `unit` job runs on those minimums (Bun 1.4.4, Node 22.22.2, then Node 22.12.0 for the CLI). In docs, run the CLI as `bunx quiver routes` only where `@go4cas/quiver` is installed; otherwise `bunx --bun --package @go4cas/quiver@3 quiver routes` or `npm exec --package=@go4cas/quiver@3 -- quiver routes` (a bare `quiver` is an unrelated npm package).

## Types

The codebase is plain JavaScript typed via JSDoc, checked by `tsc` under `checkJs` + `strict`. Each workspace has its own `jsconfig.json`: core's extends `jsconfig.base.json` and has `"types": []`, so `import.meta.glob`/`.hot`/`.env` fail its typecheck (SPEC R1); core's `src/node/` and `bin/` are excluded from it and checked by `jsconfig.node.json` with only Node types (`@types/node`, a core dev dependency); the starter's is self-contained (a degit copy has no repo root) and has `"types": ["vite/client", "@go4cas/quiver/client"]`, the second typing `import … from 'quiver:app'` and `'quiver:routes'`; `recipes/` has `"types": []` and checks each recipe's JS (not its tests or `e2e/`), so recipes can't lean on Vite types. CI enforces a clean `bun run typecheck`. When adding code:

- Annotate exported functions with `@param`/`@returns`; use `@typedef` for shared shapes and `@template` for generics
- Reuse existing typedefs via import syntax: `/** @typedef {import('../state/userState.js').User} User */`
- Prefer a JSDoc cast `/** @type {X} */ (expr)` over restructuring code to satisfy the checker
- Do not convert files to TypeScript — the plain-JS + JSDoc setup is deliberate

---

## Arrow.js rules

These are non-obvious constraints. Violating them causes silent bugs or runtime errors.

1. **Reactive slots must be arrow functions.** Any `${}` interpolation referencing state that can change must be `() =>`:
   - Correct: `` html`<p>${() => user.name}</p>` ``
   - Wrong: `` html`<p>${user.name}</p>` `` (renders once, never updates)

2. **No HTML comments inside templates.** Arrow.js uses HTML comment nodes as internal slot markers. Adding `<!-- -->` inside `` html`...` `` throws `Invalid HTML position`. Put comments outside the template literal.

3. **`.disabled` is not the DOM disabled property.** Writing `.disabled="${() => bool}"` sets a literal attribute named `.disabled` — the button remains clickable. Use `aria-disabled="true/false"` and style `[aria-disabled="true"]` in CSS (`opacity: 0.5; cursor: not-allowed`) instead.

4. **Use `.key()` on components in loops.** Without `.key(uniqueId)`, Arrow re-creates DOM nodes on every state change:
   - Correct: `` html`${() => items.map(i => Card({ i }).key(i.id))}` ``

5. **A slot that is sometimes a template is always a template.** In a keyed list, a slot that is `''` for one item and a template for another breaks in Arrow 1.0.6: once an item that rendered `''` there is removed, later items fail to render (NOTES N99). Return an empty template, from a function slot:
   ```js
   html`<li>${() => (item.done ? html`<b>done</b>` : html``)}</li>`.key(item.id)
   ```

---

## Conventions

File names follow the folder (D45): `components/` PascalCase, named for the component (`UserCard.js`, `Toasts.js`, with `UserCard.css` beside it); `composables/` camelCase, named for the export (`useForm.js`, `hmrState.js`); `state/` camelCase with a `State` suffix (`userState.js`); `pages/`, `layouts/`, `views/` and `middleware/` lower-case or kebab-case, because the file name is the route or the layout name. `tests/repo/naming.test.js` checks the starter and the recipes.

### Pages

File `src/pages/path.js` → route `/path`. Structure:

```js
import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { layout: 'menu', title: 'Page Title', nav: { label: 'Page', order: 5 } }

function MyPage() {
  useMeta({ title: 'Page Title' })
  return html`<div>...</div>`
}

export default MyPage
```

- `[param].js` → dynamic segment; read params with `useRoute().params()` inside the function
- `not-found.js` handles 404 (only at the root of `pages/`; a nested one is a scan error)
- Files and folders starting with `_` or `.` are not routes (`pages/_parts/Card.js`). Two files for one route, or two that differ only in the param name, are a scan error naming both
- Names may hold spaces and Unicode (`release notes.js` → `/release notes`, served at `/release%20notes`); static segments match decoded and NFC-normalised (`canonicalSegment` in `match.js`, N135). A `%` or `\` in a page name is a scan error
- `meta` is read at build time by a small tokenizer (`src/node/literal.js`, N210): only a top-level `export const meta =` whose whole initializer is one plain literal counts; comments and strings never shadow it. Two `_middleware.js` folders that are one section, an unreadable convention folder, or a symlinked layout/middleware/view/`_middleware.js` is a scan error (N211). The CLI only overwrites files starting with `// Generated by Quiver.` and rejects scanner inputs as `quiver app --out` (N212)
- The `quiver()` plugin from `@go4cas/quiver/vite` (in `vite.config.js`) builds the app manifest; `main.js` imports it as `import app from 'quiver:app'` (`quiver:routes`, the routes alone, stays for a manual setup). Adding or removing a page reloads the dev server's page (files under `_`/`.` names don't); never hand-edit a manifest. Without Vite: `@go4cas/quiver/bun` for `Bun.build`, or `quiver app [--watch]` writing `src/app.gen.js` (`quiver routes` writes `src/routes.gen.js`; an `--out` `.js` file inside `--dir` is a usage error unless its name starts with `_`; `--watch` serialises scans, writes atomically and keeps the last good manifest on a scan error, N136)
- `useMeta` also accepts functions for reactive values: `` useMeta({ title: () => `Team (${userState.users.length})` }) `` — the router stops these watchers automatically on every navigation (see `src/pages/users/[id].js` for a working example)

### Base path and links

Every path the app sees or passes is **base-relative**: manifest keys, `go()`, guard `from`/`to` and redirects, hook paths, `useRoute().path()`. Only `url(path)` adds the base, for `href`s and public assets: `` html`<a href="${url('/users')}">` ``, `` src="${url('/logo.svg')}" ``. The starter passes `base: import.meta.env.BASE_URL` to `createApp(app, options)`, so `QUIVER_BASE=/sub/app/ bun run dev` serves it under a sub-path. Use the `Link` component or a plain `<a href="${url(path)}">` for navigation (`Link` renders no `href` for schemes other than `http(s):`, `mailto:`, `tel:`, for `//host`, or for a path whose parsed URL leaves the app's origin or base, N144, N220; it sets `aria-current="page"` only on an exact canonical match and `data-active` on sections too; `url()` itself passes every absolute URL through); never add an `@click` that calls `go()` (the Navigation API already intercepts the click, and the handler breaks Cmd/Ctrl/middle-click).

### Navigation guards and hooks

`beforeEach(fn)` from `@go4cas/quiver` registers a guard and returns an unregister function. The guard receives `{ from, to }`; return `false` to cancel, a path string to redirect (query and hash are kept), anything else to proceed. Guards also run on the initial page load with `from: null` — on first load, `false` redirects to `/` (there is no previous page to stay on). A redirect to the path already being navigated to proceeds, so a guard without a `to !== '/login'` check still reaches `/login`. Redirects are capped at 10 hops, and must stay base-relative paths inside the app: an absolute URL or a path outside the base is a guard error (use `go()` for external URLs). Cancelling keeps the page on screen with its URL, query and hash (a native fragment change included), and adds or rewrites no history entry; where the browser has precommit handlers, a push's or replace's guards run before it commits (`guardBeforeCommit`), so a cancel leaves the Forward entries and a redirect commits once (N201); `await go()` resolves after a redirect's target (and its guards) or a cancel's rollback has finished. A page that sets no title or description gets the host page's own back on every navigation. Each page renders with its layout inside a cleanup scope keyed by path (N160): `onCleanup` from `@arrow-js/core` and `arrow-use` composables called in the page or layout function are cleaned up when the page is left (after the next navigation's guards pass), on `retry()` and on `destroy()`, inside a layout too, so `starter/src/pages/posts.js` just calls `useFetch`. A reactive value read in the page body (outside a `() =>` slot) does not re-render the page (N161). A `component()` nested inside a page's template still never gets `onCleanup` (Arrow 1.0.6, N64, N163): call composables in the page function and pass values down, or call their `stop()` yourself.

`afterEach(({ from, to, status }) => …)` runs after every committed navigation (`status`: `'ready'`, `'not-found'` or `'error'`). `onError(({ error, from, to, phase }) => …)` runs for guard, load and render errors (`phase`: `'guard'`, `'load'`, `'render'`), after the error view is shown. Both return an unregister function; a throwing handler is logged and the others still run. For the initial load they fire inside `createApp()`.

```js
import { beforeEach } from '@go4cas/quiver'

beforeEach(({ from, to }) => {
  if (to.startsWith('/admin') && !authState.loggedIn) return '/login'
})
```

The starter (and the docs) start with `await createApp(app, { target, base })`, `app` from `quiver:app` (D40). The manual startup order is fixed: `provide()` → `beforeEach()`/`afterEach()`/`onError()` → `await initRouter({ routes, notFound, base })` → `createApp({ target, ... })`; the Bun example keeps it. `createApp()` before `initRouter()` resolves throws, and so does a second `initRouter()` or `createApp()` before `destroy()`. `destroy()` (or `app.destroy()`) tears everything down (listener, guards, hooks, context, meta watchers, router state, the mounted target), after which the sequence can run again.

Middleware and the app form (3.2, C-70…C-74): `initRouter({ middleware: { global, sections } })` runs global guards and then each covering section (`sectionCovers` in `match.js`, outermost first) after the `beforeEach` guards, all inside `runGuards()`, so `decide()` classifies them like any guard; a section is matched against the route pattern without loading the page, and a not-found path runs only global middleware. `createApp(app, options)` with two arguments is async: it provides `app.config`'s keys and `app.nav`, awaits `initRouter`, then calls the one-argument form; a failure undoes its own `provide()` calls (`provideUndoable` in `context.js`, which checks the writer, not the value) and, once its `initRouter` has run, the router's listeners, middleware, state and the partial mount (`abandonRouter()`), keeping the caller's guards, hooks and keys, then rejects (R32-02, N202); a `destroy()` during its first load supersedes it (`routerGeneration()`), and it rejects without touching a newer app (R32-03, N203). Tests: `tests/middleware.test.js`, `tests/create-app-manifest.test.js`.

### State modules

```js
import { reactive } from '@arrow-js/core'

export const myState = reactive({
  items: [],
  /** @param {{ name: string }} item */
  addItem(item) { this.items.push({ ...item, id: crypto.randomUUID() }) },
})
```

Create at module scope; export as a singleton.

### Components

```js
import { html } from '@arrow-js/core'

export function MyCard({ title }) {
  return html`<div class="card"><h2>${title}</h2></div>`
}
```

Import components directly from their files (e.g. `import { MyCard } from '../components/MyCard.js'`) — there is no barrel file. Apply all Arrow.js rules above.

Style a component in a sibling `MyCard.css` and add an `@import` for it to `src/style.css` (before `effects.css`). JS never imports CSS:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.my-card) {
    padding: 1.25rem;
    border: 1px solid var(--q-color-line);
    border-radius: var(--q-radius-panel);
    background-color: var(--q-color-surface-raised);
    &[data-tone="error"] { color: var(--q-color-error); }
    @media (hover: hover) { &:hover { box-shadow: var(--q-shadow-float); } }
  }
}
```

- Every selector inside `:where()`; variants and state as attributes (`data-tone`, `aria-current`, `aria-pressed`), never modifier classes
- Colours, radii, shadows, fonts only from `--q-*` tokens; spacing and sizes as `rem` literals; transforms via `translate`/`scale` properties, not `transform`
- No `transition` on `button`, `a` or `input` (`base.css` owns it)
- Recipe-style classes (layouts, toasts, theme controls, views) use the `q-` prefix; starter app classes don't
- Add hook classes so theme effects apply: `q-panel` on cards/panels, `q-accent` on brand-coloured text, `q-sidebar`/`q-header` on layout chrome

For local component state that should survive Vite hot reloads in dev, use `hmrState(key, initialState)` from the hmrState recipe (`src/composables/hmrState.js`). The key must be unique per component instance on the page (derive it from a prop, e.g. `` `counter-${props.label}` ``) — duplicate keys silently link state between instances in dev mode.

### Composables

Call these inside a page or component function, never at module scope; the exception is shared state built on `arrow-use` (a module-level `useStorage` singleton, see below). `useRoute` and `useRouter` come from `@go4cas/quiver`; `useFetch`, `useStorage`, `useMediaQuery` and `useEventListener` from `arrow-use`; `useForm` and `useToast` are recipes (`src/composables/useForm.js`, `src/components/Toasts.js` in the starter):

- `useRoute()` → `{ path(), params(), status(), meta() }` — reactive route accessors
- `useRouter()` → `{ go(path), back(), forward() }` — navigation; each returns a promise that resolves when the navigation finishes
- `url(path)` (from `@go4cas/quiver`) → the base-aware href for a base-relative path; absolute URLs pass through
- `useForm(values, { validate, onSubmit })` → `{ form, handleSubmit, field(name) }` — form state; `validate` may be sync or async, return `{}` when valid or `{ fieldName: 'message' }` on errors; a thrown or rejected `validate` or `onSubmit` is caught, written to `form.message`, and `submitting` is released; each submit clears `submitted`/`message` first and hands `validate` and `onSubmit` one deep snapshot of the values (N140, N221): supported values are primitives and plain objects and arrays of them; anything else (`Date`, `Map`, `File`, a function) stops the submit with a `form.message`
- `useFetch(url, options)` (from `arrow-use`) → `{ data(), loading(), error(), status(), refetch(), reset(), stop() }` — HTTP with reactive state; options: `{ immediate = true, transform, ...fetchOptions }`; refetch aborts the previous in-flight request; `stop()` aborts and ignores later refetches; anything thrown (even by `transform`, which is synchronous) lands in `error()`, and an abort, including the caller's `signal`, is not an error. **Use this for API calls — do not hand-roll fetch + loading/error state.**
- `useStorage(key, initial, { storage, serializer })`, `useMediaQuery(query)`, `useEventListener(target, type, handler, options)` (from `arrow-use`) → `{ value(), set(), remove(), stop() }`, `{ matches(), stop() }`, `{ stop() }` — persisted state synced across tabs (creating it only reads; a failed write keeps the value in memory), a reactive media query, a listener removed on unmount. Use these instead of hand-wiring `localStorage`, `matchMedia` or `addEventListener` in a component
- `useToast()` → `{ success(msg, opts), error(msg, opts), warning(msg, opts), info(msg, opts), dismiss(id) }` — **use this for user notifications — do not build ad-hoc banners.** Options per call: `{ duration, dismissible }`

Keep **one** `useStorage` instance per key for the whole app (a module-level singleton, like `themeState` in the theme-switcher recipe): two instances of one key in the same tab don't see each other's writes, because the `storage` event only fires in other tabs.

### Recipes (`recipes/`)

Opinionated UI and helpers ship as copy-in recipes (SPEC G4, D32), not as package exports: `theme`, `link`, `toasts`, `theme-switcher`, `useForm`, `hmrState`, `layouts`, `views`. Rules for a recipe:

- One folder `recipes/<name>/` (the folder and the registry key keep the recipe's name, which `/add-*` accepts) with its JS, named by the folder it installs into (a component recipe's file is PascalCase: `link/Link.js`, `toasts/Toasts.js`, `theme-switcher/ThemeSwitcher.js`; D45) (the theme recipe is CSS only; layouts and views have one default-exported file each: `default.js`, `menu.js`, `loading.js`, `error.js`), its CSS, a `README.md` with `## Install` and `## Use` sections, and `tests/` (never copied into apps or the tarball). List it in `recipes/index.json`: `files` (a map from each file in the folder to where it installs under an app's `src/`: `<kind folder>/<same name>`, kind `styles` → `styles/`, `component` → `components/`, `composable` → `composables/`, `layout` → `layouts/`, `view` → `views/`, D44), `css` (load order), `requires` (other recipes), `packages`, `aliases` (names `/add-*` accepts, unique case-insensitively). `recipes/tests/registry.test.js` checks all of it
- Imports are `@arrow-js/core`, the packages in `packages`, or `../<recipe>/<file>.js` for a recipe in `requires`. `useForm` never imports `@go4cas/quiver` (W-10), and `toasts`/`useForm`/`hmrState` import only Arrow, so plain Arrow apps can use them
- Recipe JS never imports CSS; CSS follows the component rules above, with `q-` classes (DESIGN §6). Class names are part of what apps copy, so treat them as stable
- `scripts/copy-recipes.js` holds both copies: `installRecipes()` (`recipes:sync`) writes each recipe's `files` into the starter's `src/` by role, rewriting `../<recipe>/<file>.js` imports to the installed places; `copyRecipes()` (core's `prepack`) copies the same `files` plus each `README.md` into the tarball in the repository layout, so a file not in `files` ships nowhere (N143)
- After changing a recipe, run `bun run recipes:sync`: the starter must hold exactly what `installRecipes()` writes, and no `src/quiver/` (`tests/repo/recipes-sync.test.js`). The starter's screenshots then cover the recipes too
- Apps install recipes by role, following the procedure in `recipes/README.md`, which `/add-*` follows: every destination in `files` is checked, only missing files are copied, and an existing file is the app's and is never replaced unless the owner asks ("Existing files", N222); `packages/quiver/scripts/prepack.js` copies them into the tarball (X-10)

### arrow-use (`packages/arrow-use/`)

Rules for every composable in the package (TECH-SPEC U-1…U-11); `tests/conventions.test.js` and `tests/repo/boundaries.test.js` check most of them:

- Imports are relative or exactly `@arrow-js/core` (peer only). Never `@go4cas/quiver`, never `@arrow-js/core/internal`
- One file `src/useX.js` per composable with a named export; `src/index.js` only re-exports, plus a `/** @typedef {import('./useX.js').T} T */` line for each typedef; no default exports
- Signature `useX(required…, options = {})`; return a plain object of zero-argument getters plus an idempotent `stop()`. Keep values raw and drive reactivity with a `reactive({ version })` counter, so getters never return reactive proxies
- Nothing runs at import; check browser APIs (`fetch`, `matchMedia`, storage, `window`) at call time and return the no-browser defaults (TECH-SPEC §8.1 table)
- Register cleanup with `try { onCleanup(stop) } catch {}` (Arrow's `onCleanup` throws outside a component). Test both: outside → `stop()` releases; inside a mounted `component()` (`tests/helpers/mount.js`) → unmount releases. Cleanup only runs for a component that is itself the slot value (NOTES N64), or for code called in a Quiver page or layout function (N160)

### Toasts

`ToastContainer` is already mounted by the layouts recipe — calling `useToast()` from any page or component just works. Toasts render bottom-right; defaults (`duration: 4000`, `dismissible: true`) live in `toastState.add()`. Dismissing sets `data-state="closing"` and removes the toast once `el.getAnimations()` finish (D31), so no JS timer mirrors the CSS duration.

### Layouts

Each `src/layouts/<name>.js` (default export) is the layout `<name>` (D38): the starter has `default.js` (centred card, for pages without `meta.layout`) and `menu.js` (sidebar + header, `meta.layout: 'menu'`), both from the layouts recipe. Add a layout by adding a file; there is no registry. An unknown literal `meta.layout` is a build warning (D43) and renders the page bare with a `console.warn`. `src/views/loading.js` and `src/views/error.js` (from the views recipe) are the loading view and the error view, which receives `{ message, error, retry }` (its **Try again** button calls `retry()`). Global guards go in `src/middleware/*.js` (file-name order) and section guards in `src/pages/**/_middleware.js` (D39). Core's bare defaults are `<p>Loading…</p>` and `<p role="alert">message</p>`, and core renders no wrapper element and no `class`.

### Theming

Two orthogonal attributes on `<html>`: `data-theme` (`default` · `mono` · `glass` · `retro` · `brutalist`) and `data-mode` (`light` · `dark`), both driven by `themeState` from the theme-switcher recipe and persisted to localStorage (`ui-theme`, `ui-mode`, plain strings; the mode follows the system until the user picks one).

- **Tokens** (`recipes/theme/tokens.css`, `@layer quiver.tokens`): the 27-token contract — `--q-color-{brand,brand-hover,brand-tint,on-brand,surface,surface-raised,surface-inset,fg,fg-soft,fg-faint,line,line-strong}`, status `--q-color-{success,error,warning,info}` each with `-tint`, `--q-radius-{control,panel}`, `--q-shadow-{panel,float}`, `--q-font-{body,display,mono}`. Themes override subsets in `[data-theme]` / `[data-mode]` blocks. Never hard-code colours, or theme switching breaks; soft status borders are `color-mix(in oklab, var(--q-color-error) 30%, transparent)`.
- **Layers**: `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` starts every stylesheet. Later layers win; unlayered app CSS beats all of them.
- **Effects** (`recipes/theme/effects.css`, `@layer quiver.effects`): per-theme blur, glow, scanlines, heading type and borders. They select only the hook classes `q-panel`, `q-sidebar`, `q-header`, `q-accent`, plus `<html>`, `h1`–`h3`, `button`, `:focus-visible`. A one-component tweak for one theme goes in that component's CSS: `[data-theme="brutalist"] :where(.btn)[data-variant="primary"] { … }`. Dark-mode non-colour differences nest `:where([data-mode="dark"]) &`.

To add a theme: token blocks (light + dark) in `recipes/theme/tokens.css`, optional effects in `recipes/theme/effects.css`, and an entry `{ id, label, swatch, swatchDark? }` in the `THEMES` array in `recipes/theme-switcher/ThemeSwitcher.js`, then `bun run recipes:sync` (in an app, `src/styles/tokens.css`, `src/styles/effects.css` and `src/components/ThemeSwitcher.js`). See the Theming guide or the `/add-theme` command.

### Dependency injection

Each key of `src/app.config.js` is provided under its own name by `createApp(app, options)` (D41), as is `'nav'`, built from each page's literal `meta.nav: { label, order? }` unless the config sets `nav`; in a manual setup, `provide(key, value)` before `initRouter()`. `inject(key, fallback)` anywhere. The context is app-global — last `provide` for a key wins, and `destroy()` clears it. Core reserves no keys; the layouts recipe reads these (all optional):
- `'app'` — `{ name, tagline?, logo?, footer? }` — `MenuLayout` sidebar brand (`logo` is base-relative; without it the name shows as text) and footer
- `'nav'` — `[{ to, label }]` — `MenuLayout` sidebar links, from the pages' `meta.nav`
- `'currentUser'` — `{ name, email, avatar, signOut? }` — `MenuLayout` user menu (`signOut` defaults to `go('/login')`, which ends no session; a real `signOut` ends the server session and clears client user state, then navigates: layouts README "Sign-out"). The starter's sign-in page and user are a labelled demo with no session (N142)

---

## Testing

- Unit: Vitest in `packages/quiver/tests/` (core), `packages/arrow-use/tests/` (composables, against bare Arrow), `recipes/<name>/tests/` (each recipe, jsdom) and `starter/tests/unit/` (starter) — test pure functions with `describe`/`it`. Arrow flushes the DOM on a microtask: `await nextTick()` before reading it, and with fake timers fake only the timers (`toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']`), or `nextTick()` never resolves
- Recipes in a plain Arrow app: `recipes/e2e/` serves a no-Quiver, no-bundler app that uses the toasts recipe (port `5184`) and checks a toast shows with the theme tokens, closes, and goes at once under reduced motion (SPEC P7)
- Route rules: a pattern rule belongs in `PATTERN_RULES` in `match.js` (a scanner-only rule in `FILE_RULES`), with a message in both front ends' tables and a row in `packages/quiver/tests/route-rules.test.js`, which runs every rule against a hand-written and a scanned manifest (N170). The router's guard outcomes are classified once, in `decide()`, for startup and in-app navigations; per-navigation state lives on the `Nav` record, not in module globals (N171)
- Route discovery: `packages/quiver/tests/routes-parity.test.js` runs the Vite plugin, the Bun plugin and the CLI on `tests/fixtures/pages/` and compares each with `tests/fixtures/pages.manifest.txt` (TECH-SPEC S-40); `app-parity.test.js` does the same for `quiver:app` on `tests/fixtures/app/` against `tests/fixtures/app.manifest.txt`, with the same warnings from each (S-65). Update those files when a fixture or a module format changes. The Bun splitting test spawns `bun`, so Bun must be on `PATH`
- E2E: Playwright in `starter/tests/e2e/` — test real browser flows; use `getByRole`, `getByLabel`, `getByTestId`. Every test runs twice, in the `root` project (port 5173) and the `subpath` project (port 5174, app under `/sub/app/`), so navigate with relative URLs (`page.goto('users')`, `page.goto('./')`, `toHaveURL('users')`), never a leading `/` (a repo test enforces it)
- Core in a real browser: `packages/quiver/tests/browser/` serves a bare Quiver app from `src/` behind an import map (`tests/browser/serve.js`) and checks cancellation, history entries, redirect settlement, metadata, startup guards, `retry()`, `destroy()` during a load and the no-Navigation-API error, at `/` (port `5185`) and `/sub/app/` (port `5195`). Projects are `<engine>-root`/`<engine>-subpath` for `chromium`, `firefox` and `webkit`: `bun run test:e2e` runs the Chromium two, `bun run test:browsers` all six, and CI's `browsers` job runs all six in the pinned Playwright image (N155). A test that fails in one engine is a finding, never a skip. The jsdom fake (`tests/helpers/navigation.js`) keeps history entries with keys, but only a browser shows how entries commit (N126)
- arrow-use example: `packages/arrow-use/example/` is a vanilla Arrow app (import map, no Quiver) whose Playwright smoke test runs from `bun run test:e2e` on port `5183`; it checks every composable and that Arrow loads from one URL (TECH-SPEC U-11)
- Examples: each folder in `examples/` has a Playwright smoke suite run by `bun run test:e2e`, once at `/` and once under `/sub/app/`, on fixed ports (vite `5180`/`5190`, bun `5181`/`5191`, no-build `5182`/`5192`; TECH-SPEC CI-1, CI-5). The Bun and no-build examples take the base from `<base href>`, which their `serve.js` fills in from `QUIVER_BASE`. Every demo server (`examples/bun`, `examples/no-build`, `tests/packed/bun-app`, `packages/arrow-use/example`, `recipes/e2e`) is local-only: it binds `127.0.0.1`, maps each URL prefix to exactly one folder and serves only real files inside it, answers malformed paths with 400, and refuses a `QUIVER_BASE` that isn't plain path segments (`tests/repo/servers.test.js`, NOTES N149). Keep each one self-contained, since examples are copied out. `examples/no-build` also asserts that Arrow loads from one URL. Examples use real ranges (`^3.2.0` for vite and no-build, which use `quiver:app`; `^3.0.0` for bun), never `workspace:`, and import nothing from outside their own folder, so each can be copied out
- Repo checks: Vitest in `tests/repo/`: SPEC R7 (the old utility framework is gone from the repo), W-10 (core imports nothing from the starter or examples; arrow-use imports no Quiver and nothing outside its package), W-11 (no `workspace:` ranges in `starter/package.json`), CI-3 (relative e2e URLs), core's config (no ambient types, version `3.2.0`), W-13 (`packages.test.js`: `package.json` rules X-1/X-2 for both published packages, arrow-use `0.1.2`, core `engines.node` `>=22.12`, root and starter `engines.node` equal to jsdom's), the examples (`examples.test.js`: ranges, scripts, ports, self-contained imports, the no-build import map), `recipes-sync.test.js` (`starter/src/` holds each recipe file exactly as `installRecipes()` writes it, D44), `servers.test.js` (the demo servers, S03), `release.test.js` (the release resolver and `publish.yml`, N165), and `docs.test.js` (D36: every export of `@go4cas/quiver`, `/vite`, `/bun` and `arrow-use` has a heading on its `docs/api/` page, every `quiver routes` flag is on `docs/api/cli.md`, every recipe and composable has its own page and every `examples/` folder is linked from `docs/examples.md`, the no-install CLI commands name the scoped package (S02), and no 2.x-only string (NOTES N115) appears in `docs/` or `README.md` outside the migration guide)
- Docs: a new export, CLI flag, recipe, composable or example needs its docs page in the same PR, or `docs.test.js` fails. `bun run docs:build` must stay green (VitePress fails on dead links)
- Packaging: `bun run pack:check` (CI `pack` job) asserts both tarballs' file lists; `prepack` emits `.d.ts` for `src/` and `src/node/` with `tsc -p jsconfig.types.json`. `bun run pack:try` (same job) runs the examples, `tests/packed/bun-app` (a `quiver:app` app built by a real `Bun.build` with splitting, ports `5186`/`5196`, R32-12; not a workspace) and the starter, copied out of the repo, against the packed tarballs. `bun run pack:types` (same job) installs both tarballs into fresh projects on TypeScript 5.9 and the repo's TypeScript with `skipLibCheck: false` (`bundler`, `nodenext`, and `node10` for the main entry), using the Vite plugin in Vite's `defineConfig()` and the Bun plugin in a `Bun.build()` typed by `@types/bun` (both installed only in the temp projects, N147), so the `.d.ts` must not name DOM types that TS 5.x's lib lacks (N125: describe the shape locally, like `SettleableResult` in `router.js`)
- Visual: Playwright in `starter/tests/visual/` compares every page state in 5 themes × 2 modes with the baseline in `starter/tests/visual/__screenshots__/` (tolerance `threshold: 0.02`, `maxDiffPixelRatio: 0.0001`; never loosen it). The baseline only matches inside `mcr.microsoft.com/playwright:v<version>-noble`, so CI's `screenshots` job runs it there; re-capture an intended visual change by running the `Tests` workflow by hand with `update-screenshots` on your branch (see `starter/tests/visual/README.md`)
- Dependencies: `bun run audit` (CI `audit` job) runs `bun audit` on the whole lockfile, dev tooling included. An advisory passes only if it is fixed or listed in `scripts/audit-exceptions.json` with its package, the exact locked versions, an owner, an expiry date and an N-entry in NOTES.md; expired or stale entries fail too, and so does an accepted advisory that matches no locked version or an entry naming a version the advisory doesn't match (S32-04, N231; `tests/repo/audit.test.js`). Patched transitive versions are forced with root `overrides` (Vue packages aligned on one version, `source-map-js`); ask the maintainer before adding or changing one
- CI workflows: actions pinned to full commit SHAs with a `# vX.Y.Z` comment, the Playwright container pinned as `v<version>-noble@sha256:…`, `persist-credentials: false` on every checkout that doesn't push, and write permissions only on jobs that install and run nothing (`deploy` in `docs.yml`, `screenshots-commit` in `test.yml`, `stage` in `publish.yml`). The checks live in `checks.yml`, a reusable workflow (`workflow_call`) that `test.yml` runs on pull requests and `main`, and `publish.yml` runs on the release tag's commit before `stage` (S32-05, N230); required checks are named `checks / <job>`
- Releases: `RELEASING.md`. `publish.yml` stages a release on npm with provenance through trusted publishing (no npm token) when a `v<version>` (core) or `arrow-use-v<version>` tag is pushed and the repository variable `NPM_PUBLISH_FROM_CI` is `true`; the maintainer approves it on npmjs.com. Only its `stage` job has `id-token: write`, and it runs no repository code; it needs the `checks` job, which runs all of `checks.yml` on the tagged commit (`tests/repo/release.test.js`). The repository settings that back this (the `main` and release-tag rulesets, the `npm` environment's tag policy) are JSON in `.github/settings/`, applied by the maintainer (RELEASING.md). Never push a release tag, run the workflow without dry-run, or change the variable without the maintainer's go-ahead
- Unit and E2E must pass before a task is complete; the `screenshots` CI job must pass before merge

---

## Scope

Quiver has been refactored from a starter template into a drop-in library (v3); P8 prepares the 3.0.0 release. The plan, requirements and phases are in [`planning/v3/SPEC.md`](planning/v3/SPEC.md), with decisions recorded in [`planning/v3/DECISIONS.md`](planning/v3/DECISIONS.md), the CSS design (tokens, `base.css`, recipe CSS, screenshot parity) in [`planning/v3/DESIGN.md`](planning/v3/DESIGN.md), findings in [`planning/v3/NOTES.md`](planning/v3/NOTES.md), and final signatures, manifest and scanner formats, exports maps, workspace and CI layout in [`planning/v3/TECH-SPEC.md`](planning/v3/TECH-SPEC.md). Build PRs cite the TECH-SPEC rule IDs (`C-…`, `M-…`, `S-…`, `X-…`, `W-…`, `CI-…`, `U-…`) they implement. For v3 work, the spec is the source of truth; with P8 every convention above describes the v3 code. Publishing to npm, tags and releases happen only with the maintainer's go-ahead.

In scope:

- The phases P0–P9 in the spec, one phase per branch and PR, in dependency order (P9, the 3.2 conventions layer, is four PRs: SPEC §8)
- Bug fixes in the framework code, test improvements and doc corrections, as before

Out of scope (spec §2 non-goals): swapping Arrow.js, SSR/hydration, a plugin system (core has only `afterEach`/`onError` hooks), a Navigation API fallback, multiple Quiver apps on one page, and app-specific features or backend/auth (those belong in an app).

Stop and ask the maintainer before: public API changes beyond `planning/v3/TECH-SPEC.md`, scope additions, new dependencies, package renames, or anything touching npm, tags, releases or GitHub Pages. Never merge or push to `main`.
