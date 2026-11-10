# Quiver v3 — technical spec

Status: proposed (Architecture thread, 2026-11-08) · Owner: Cas · Inputs: [SPEC.md](SPEC.md), [DECISIONS.md](DECISIONS.md) D1–D35, [NOTES.md](NOTES.md)

This file fixes the public surface that the build phases (P1–P8) implement. SPEC.md stays the source of truth for goals, requirements and phases. This file is the source of truth for **signatures, formats, file layout and checks**. §9 rule 8 applies to it: a build thread that needs anything not written here stops and asks Cas.

Every rule below has an ID (`C-…` core, `M-…` manifest, `S-…` scanner, `X-…` exports, `W-…` workspace, `CI-…` CI, `U-…` composables). A build PR cites the IDs it implements, and the review checks each one against its **Check** line. Choices this file makes that DECISIONS.md does not already cover are listed in §10 for Cas to accept or change in this PR.

Contents: §1 core API · §2 navigation pipeline · §3 route manifest · §4 scanner contract · §5 package exports · §6 workspace layout · §7 CI layout · §8 composables conventions · §9 typedef index · §10 choices beyond DECISIONS.md · §11 open questions.

---

## 1. Core API (`@go4cas/quiver`)

### 1.1 Public entry

`packages/quiver/src/index.js` re-exports exactly these 13 names and nothing else:

```
afterEach  beforeEach  createApp  destroy  go  initRouter  inject
onError    provide     url        useMeta  useRoute  useRouter
```

- **C-1** The public entry exports exactly the 13 names above. *Check:* unit test `Object.keys(await import('../src/index.js')).sort()` equals the list.
- **C-2** `routerState`, `normalizePath`, `matchPath`, `scoreRoute`, `fileToRoutePath` and every other helper are not exported from the entry (D26). Tests import them from their module file. *Check:* covered by C-1.
- **C-3** Importing the entry has no side effects: no `window`, `document`, `navigation` or `localStorage` access at module evaluation (R4). *Check:* a Vitest file with `environment: 'node'` imports the entry and every module under `src/` (except `src/node/`) without throwing.
- **C-4** Browser-side modules import only relative paths and the bare specifier `@arrow-js/core` (R1, R5). No `import.meta.glob`, `import.meta.hot`, `import.meta.env`, no CSS or asset imports, no `node:` imports. *Check:* unit test scans every `.js` under `packages/quiver/src/` outside `src/node/` with a regex for `from '…'` / `import('…')` specifiers and for `import.meta.`; core's `jsconfig.json` has no `vite/client` types (D33).
- **C-5** Core renders no `class` attribute anywhere (R2). *Check:* unit test greps `src/` outside `src/node/` for `class=`; zero matches.

### 1.2 Startup order

```js
provide(key, value)                 // 1. context (optional, any number)
beforeEach(fn); afterEach(fn); onError(fn)   // 2. guards and hooks (optional)
await initRouter({ routes, notFound, base }) // 3. router
const app = createApp({ target, ... })       // 4. mount
```

Guards and hooks registered after `initRouter()` still work for later navigations, but miss the initial one.

### 1.3 `initRouter(options)`

```js
/**
 * @param {InitRouterOptions} options
 * @returns {Promise<void>}
 */
export function initRouter(options)

/**
 * @typedef {Object} InitRouterOptions
 * @property {RouteManifest} routes            pattern → loader (§3)
 * @property {RouteLoader} [notFound]          loader for unmatched paths
 * @property {string} [base]                   absolute pathname, e.g. '/api/custom/app/'
 */
```

- **C-10** Throws `Error` with this exact message when `window.navigation` is missing (D11):
  `Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+). See https://go4cas.github.io/quiver/guide/routing#browser-support`
  P8 creates the `#browser-support` anchor. *Check:* unit test deletes `window.navigation` and asserts the message.
- **C-11** Throws if called again before `destroy()`: `initRouter() was already called. Call destroy() first.` *Check:* unit test.
- **C-12** Validates `routes` synchronously before any navigation work and throws `TypeError` naming the offending key (rules M-1…M-5). *Check:* unit test per rule.
- **C-13** Base resolution (D22), stored with leading and trailing slash:
  1. `options.base` if given. It must start with `/`, otherwise `TypeError`. A missing trailing slash is added (`'/app'` → `'/app/'`).
  2. else, if `document.querySelector('base[href]')` exists: `new URL(el.href).pathname` cut back to its last `/` (`/app/index.html` → `/app/`, `/app/` → `/app/`).
  3. else `'/'`.
  *Check:* unit tests for all three branches, including a `<base>` pointing at a file, and that `document.baseURI` alone (no `<base>`) never changes the result (N1).
- **C-14** If the current `location.pathname` is outside the base (C-20), `initRouter` throws `Current URL "<pathname>" is outside base "<base>".` Misconfiguration fails loud. *Check:* unit test.
- **C-15** On success it adds the `navigate` listener, runs the initial navigation through the pipeline (§2) with `from: null`, and resolves once the route has loaded. It **does not reject** for guard, load or not-found outcomes. Those are recorded in router state and reported when `createApp()` mounts (C-44). It rejects only for C-10…C-14. *Check:* unit test with a rejecting loader: `await initRouter()` resolves and `useRoute().status()` is `'error'`.
- **C-16** Initial-load guard semantics stay as in 2.x: `false` redirects to `/`, a string redirects, both via `history.replaceState` with the base applied, capped by C-27. A redirect (or `false`) whose normalised path equals the current `to` proceeds instead, and in-app navigations follow the same rule (C-27, N66).

### 1.4 Base-relative paths and `url()`

- **C-20** `stripBase(pathname)` (internal) returns the base-relative path, or `null` when outside. With base `B` (trailing slash): `pathname` starting with `B` → `'/' + pathname.slice(B.length)`; `pathname === B.slice(0, -1)` → `'/'` (D23); else `null`. Comparison is case-sensitive on the raw (percent-encoded) pathname. Base `'/'` never returns `null`. *Check:* unit table test: `/app/`→`/`, `/app`→`/`, `/app/x`→`/x`, `/apple`→`null`, `/other`→`null`.
- **C-21** Every path core hands to app code is base-relative and normalised by `normalizePath` (no query, no hash, no trailing slash except `/`): guard `from`/`to`, hook `from`/`to`, `useRoute().path()`. *Check:* unit tests under base `/app/` assert each one.

```js
/**
 * Base-aware href for a base-relative path. Query and hash are kept.
 * @param {string} path
 * @returns {string}
 */
export function url(path)
```

- **C-22** `url()` rules (D18):
  1. `path` matching `/^[a-z][a-z\d+.-]*:/i` (`https:`, `mailto:`) or starting with `//` → returned unchanged.
  2. otherwise one leading `/` is removed and the result is appended to the base: base `/app/`: `url('/')` → `/app/`, `url('/runs/42?tab=log#x')` → `/app/runs/42?tab=log#x`, `url('runs')` → `/app/runs`, `url('')` → `/app/`.
  3. Before `initRouter()` and after `destroy()` the base is `'/'`.
  *Check:* unit table test, including base `/`.

### 1.5 Navigation functions

```js
/**
 * Navigate to a base-relative path (query and hash kept) or an absolute URL.
 * @param {string} path
 * @returns {Promise<void>} settles when the navigation and its afterEach handlers finish
 */
export function go(path)

/**
 * @param {NavigationGuard} fn
 * @returns {() => void} unregister
 */
export function beforeEach(fn)

/**
 * @param {AfterEachHook} fn
 * @returns {() => void} unregister
 */
export function afterEach(fn)

/**
 * @param {ErrorHook} fn
 * @returns {() => void} unregister
 */
export function onError(fn)
```

- **C-30** `go(path)` calls `navigation.navigate(url(path))`. It keeps query and hash (2.x dropped them, N21). It resolves when `finished` settles, swallows `AbortError` (2.x behaviour) and rethrows anything else. *Check:* unit tests with a mocked `navigation`.
- **C-31** `go()` before `initRouter()` or after `destroy()` throws `Quiver router is not initialised. Call initRouter() first.` *Check:* unit test.
- **C-32** Guard contract is unchanged from 2.x except for paths (base-relative, C-21): `({ from, to }) => false | string | void | Promise<…>`. `false` cancels and puts back the previous URL, query and hash included (§2 step 3, N67); a string redirects; anything else proceeds. A redirect string is base-relative and may carry query and hash, which are kept (N21). Guards run in registration order and stop at the first `false` or string.
- **C-33** Unregister functions are idempotent, and unregistering during a run does not skip the next handler in that run (the run iterates a copy). *Check:* unit test.
- **C-34** `afterEach` and `onError` handlers are called synchronously in registration order and not awaited. A handler that throws is caught and logged with `console.error('[quiver] afterEach handler threw', err)` / `'[quiver] onError handler threw'`, and the remaining handlers still run (D24). *Check:* unit test with a throwing first handler.

### 1.6 `createApp(options)` and `destroy()`

```js
/**
 * @param {CreateAppOptions} options
 * @returns {App}
 */
export function createApp(options)

/**
 * @typedef {Object} CreateAppOptions
 * @property {Element | string} target           element, or a selector for document.querySelector
 * @property {Record<string, Layout>} [layouts]   default {}
 * @property {string} [defaultLayout]             default 'default'
 * @property {LoadingView} [loading]              default bare view (C-45)
 * @property {ErrorView} [error]                  default bare view (C-45)
 *
 * @typedef {{ destroy: () => void }} App
 */

/** Tear down router, hooks, context, meta and the mounted app. Idempotent. */
export function destroy()
```

- **C-40** `createApp()` before `initRouter()` resolved throws `createApp() needs a router. Call in this order: provide(), beforeEach()/afterEach()/onError(), await initRouter(), createApp().` (D26). *Check:* unit test.
- **C-41** A second `createApp()` before `destroy()` throws `createApp() was already called. Call destroy() first.` (D12). *Check:* unit test.
- **C-42** A selector `target` that matches nothing throws `createApp(): target "<selector>" not found.` A non-Element, non-string target throws `TypeError`. *Check:* unit test.
- **C-43** Mounting replaces the target's existing children (so a static placeholder or `<noscript>` disappears) and renders the outlet directly into `target`, with no wrapper element (D28). Mounting is synchronous; `createApp` stays sync (D27). *Check:* unit test asserts `target.firstElementChild` is the page's root element.
- **C-44** Hooks for the **initial** navigation fire inside `createApp()`, after the first synchronous mount: `onError` (if the initial navigation errored, or the first render throws) then `afterEach`. If `createApp()` is never called, they never fire. Later navigations fire hooks from the pipeline (§2). *Check:* unit test: rejecting initial loader → no `onError` call before `createApp()`, exactly one after.
- **C-45** Outlet rendering by route status:

  | status | renders |
  |---|---|
  | `'idle'`, `'loading'` | `loading()` |
  | `'error'` | `error({ message, error, retry })` |
  | `'not-found'` with a `notFound` page | that page inside its layout (C-47) |
  | `'not-found'` without `notFound` | `error({ message: 'No route matches "<path>".', error: null, retry })`, no `onError` call |
  | `'ready'` | the page inside its layout (C-47) |

  Bare defaults render no `class` (R2): `` html`<p>Loading…</p>` `` and `` html`<p role="alert">${message}</p>` ``. *Check:* unit test per row.
- **C-46** `message` is `error instanceof Error ? error.message : String(error)`. `error` is the original thrown value. `retry()` calls `navigation.reload({ info: { retry: true } })` and resolves when it finishes, so it re-runs guards, load and render for the current URL with `from === to`. *Check:* unit test: a loader that fails once then succeeds renders the page after `retry()`.
- **C-47** Layout selection: `name = meta.layout ?? defaultLayout`. If `layouts[name]` exists, render `layouts[name](Page())`. Otherwise render `Page()` bare, and `console.warn('[quiver] unknown layout "<name>"')` when the name came from `meta.layout` or from an explicitly passed `defaultLayout`. The implicit `'default'` with no such layout is silent (D28). The rendered result is keyed by the base-relative path. *Check:* unit tests for each branch, including the silent case.
- **C-48** Render errors (D24 `phase: 'render'`): the outlet wraps the synchronous `Page()` and `Layout()` calls in `try/catch`. On a throw it records the error (status `'error'`), renders the error view, and the pipeline reports it (§2 step 7). Errors thrown later by nested components or reactive updates are not covered; the docs say so. *Check:* unit test with a throwing page: error view shown, one `onError` with `phase: 'render'`, `afterEach` gets `status: 'error'`.
- **C-49** `destroy()` does, in order (D25):
  1. bumps the navigation epoch, so in-flight loads and hooks are dropped
  2. removes the `navigate` listener
  3. clears guards, `afterEach` and `onError` handlers
  4. stops `useMeta` watchers (`document.title` is not restored)
  5. clears the `provide`/`inject` context
  6. unmounts the outlet: sets the mount's private `mounted` flag to `false` so Arrow drops the page chunk and runs component `onCleanup` callbacks, then `target.replaceChildren()`
  7. replaces router state with a fresh object `{ status: 'idle', path: '', params: {}, meta: {}, … }` and the base with `'/'`
  8. marks router and app as not initialised
  It is idempotent, and works when only `initRouter()` ran. After it, `initRouter()` + `createApp()` work again. **Caveat (Arrow 1.0.6, N64):** step 6 runs `onCleanup` only for a page component rendered without a layout. Components nested inside a layout's template (and any child component) are recycled with their parent and never get `onCleanup`, on `destroy()` or on navigation, as in 2.x. The P8 docs must say so; an upstream Arrow issue is drafted in N64. *Check:* unit tests: (a) a page component rendered without a layout has its `onCleanup` run on `destroy()`; (b) after `destroy()`, `useRoute().status()` is `'idle'`, `inject('k')` is `undefined`, a navigate event is not intercepted, target is empty; (c) a full second `initRouter` + `createApp` cycle renders.
- **C-50** Internal state objects (router state, the mount's `mounted` flag) are replaced, not mutated back to defaults, on `destroy()`, so watchers from the old mount subscribe to an abandoned object and can be collected. Arrow 1.0.6 has no public unmount (N30). *Check:* covered by C-49 (c): a navigation after re-init doesn't re-render into the old, detached outlet (spy on the old page function).

### 1.7 Route reading, navigation helpers, meta, context

```js
/**
 * Read-only reactive accessors. Works anywhere: components, guards, state modules.
 * @returns {{
 *   path: () => string,                     // base-relative, '' before initRouter
 *   params: () => Record<string, string>,
 *   status: () => RouteStatus,
 *   meta: () => PageMeta,
 * }}
 */
export function useRoute()

/**
 * @returns {{ go: typeof go, back: () => Promise<void>, forward: () => Promise<void> }}
 */
export function useRouter()

/**
 * @param {{ title?: MetaValue, description?: MetaValue }} [config]
 * @returns {void}
 */
export function useMeta(config)

/** @param {string} key @param {unknown} value @returns {void} */
export function provide(key, value)

/**
 * @template [T=unknown]
 * @param {string} key
 * @param {T} [fallback]  returned when the key is missing or null/undefined
 * @returns {T}
 */
export function inject(key, fallback)

/** @typedef {string | (() => string)} MetaValue */
/** @typedef {'idle' | 'loading' | 'ready' | 'not-found' | 'error'} RouteStatus */
```

- **C-60** `useRoute()` getters read the current router state object at call time (so they follow C-50 replacement). `params()` values are decoded with the 2.x `matchPath` fallback for malformed escapes. *Check:* unit test reads each getter inside a `watch()` and sees it update.
- **C-61** `useRouter().back()` / `forward()` call `navigation.back()` / `forward()`, resolve on `finished`, and swallow `AbortError` like `go()`. *Check:* unit test.
- **C-62** `useMeta` semantics are unchanged from 2.x (static strings set once, functions become `watch()`ers that core stops on every navigation and on `destroy()`). A page's static `meta.title` is applied by the router after load, before render. *Check:* existing 2.x `meta.test.js` cases, plus one for `destroy()`.
- **C-63** `provide`/`inject` keep 2.x semantics: one app-global map, last write wins. Core reserves no keys; `'app'` and `'currentUser'` become starter conventions. *Check:* existing `context.test.js`, plus one for `destroy()`.

---

## 2. Navigation pipeline

One pipeline handles in-app navigations, the initial load (C-15) and `retry()` (C-46). Steps, for a destination `to` (base-relative):

1. **Intercept filter** (in-app navigations only). The `navigate` handler returns without intercepting when any of these hold:
   - `!event.canIntercept`
   - `event.hashChange`
   - `event.downloadRequest !== null`
   - `event.formData !== null` (a form POST is left to the browser, N22)
   - `event.navigationType === 'reload'` without `event.info?.retry` (a script reload such as `location.reload()` or Vite's dev full reload is a real document reload, N73)
   - `event.info?.rollback` (guard-cancel rollback, 2.x). This one calls `event.intercept()` with no handler before returning, so the URL changes in place without a document load or a pipeline run (N72)
   - `stripBase(new URL(event.destination.url).pathname) === null` (outside the base, R3)
   
   Otherwise it calls `event.intercept({ handler })` and steps 2–8 run in the handler.
2. **Epoch.** `const epoch = ++navEpoch`. After every `await`, a stale epoch returns at once: no state writes, no hooks.
3. **Guards** with `{ from: currentPath | null, to }`. A throw goes to step 6 with `phase: 'guard'` (N2). `false`: in-app, `navigation.navigate(fromUrl, { history: 'replace', info: { rollback: true } })` and stop, no hooks, where `fromUrl` is `navigation.currentEntry.url` captured in the `navigate` handler before `intercept()` commits the new URL, so the previous query and hash survive (N67); initial load, redirect to `/`. A string whose normalised path equals `to` proceeds to step 4 (C-16, N66). Any other string: `navigation.navigate(url(result), { history: 'replace', info: { redirects: n + 1 } })` (initial load: `history.replaceState`) and stop; the new navigation runs its own pipeline.
4. **Load.** Clear meta watchers, set state `{ status: 'loading', path: to, params: {}, meta: {}, error: null }`. Pick the first sorted route (M-6) whose pattern matches; otherwise the `notFound` loader; otherwise not-found without a page. `await loader()`. A rejection, or a module whose `default` isn't a function, goes to step 6 with `phase: 'load'`. The bad-export message names the pattern: `Route "/users/:id" must default export a page function.` (D21).
5. **Commit.** Set state `{ status: 'ready' | 'not-found', page, params, meta, layout }`, apply a static `meta.title`.
6. **Error commit** (from 3 or 4). Set state `{ status: 'error', error, page: null, meta: {} }`. Queue `onError({ error, from, to, phase })`.
7. **Render.** `await nextTick()`. Arrow re-renders the outlet. A synchronous render throw (C-48) sets status `'error'` and queues `onError` with `phase: 'render'`.
8. **Hooks.** Call queued `onError` handlers, then `afterEach({ from, to, status })` with the final status (`'ready'`, `'not-found'` or `'error'`). For the initial load, step 7 and 8 happen inside `createApp()` (C-44).

Rules:

- **C-25** A navigation fires `afterEach` exactly once if it reaches step 5 or 6, and never if it is cancelled (`false`), redirected (the redirect target fires instead), or superseded. *Check:* unit tests for each case.
- **C-26** Every error reaches the error view before `onError` runs (D24). *Check:* in the `onError` handler, the test asserts the error view's text is already in the target.
- **C-27** Redirects are capped at 10 consecutive hops, counted through `info.redirects` (in-app) or the loop counter (initial load). The 11th hop goes to step 6 with `phase: 'guard'` and `Error('Too many redirects (10) from "<first to>".')`. 2.x only capped the initial load (N23). A redirect to the current normalised `to` is not a hop: it proceeds, on the initial load and in-app alike (C-16, N66), so the cap only catches real cycles. *Check:* unit test with a guard that always redirects to a new path, and one with an unconditional `return '/login'` reaching `/login` both ways.
- **C-28** A rollback, redirect or `retry()` never remounts a page that didn't change, and query-only changes re-run the pipeline (2.x behaviour). *Check:* existing 2.x rollback test, ported.

---

## 3. Route manifest

```js
/** @typedef {() => PageModule | Promise<PageModule>} RouteLoader */
/** @typedef {Record<string, RouteLoader>} RouteManifest */
/** @typedef {{ default: Page, meta?: PageMeta }} PageModule */
/** @typedef {() => import('@arrow-js/core').ArrowRenderable} Page */
/** @typedef {{ layout?: string, title?: string, [key: string]: unknown }} PageMeta */
/** @typedef {(content: import('@arrow-js/core').ArrowRenderable) => import('@arrow-js/core').ArrowRenderable} Layout */
/** @typedef {() => import('@arrow-js/core').ArrowRenderable} LoadingView */
/** @typedef {(props: { message: string, error: unknown, retry: () => Promise<void> }) => import('@arrow-js/core').ArrowRenderable} ErrorView */
```

Example, hand-written (Audition can use this from P3):

```js
import Home from './pages/index.js'                    // eager import is fine (D21)
export default {
  '/': () => ({ default: Home }),
  '/runs': () => import('./pages/runs/index.js'),
  '/runs/:id': () => import('./pages/runs/[id].js'),
}
```

Validation (C-12), each failure a `TypeError` naming the key:

- **M-1** `routes` is a plain object; every value is a function.
- **M-2** Every key starts with `/`, has no trailing slash (except `/` itself), no empty segment (`//`), no `?` or `#`.
- **M-3** A segment starting with `:` is a parameter whose name matches `/^[A-Za-z_$][\w$]*$/`, unique within the pattern. No wildcards, no optional segments.
- **M-4** Two keys that differ only in parameter names (`/u/:id`, `/u/:slug`) are rejected: one could never match.
- **M-5** `notFound`, if given, is a function. There is no reserved 404 key (D21): a literal `/not-found` key is an ordinary route.

Matching:

- **M-6** Routes are sorted once at `initRouter()` by `scoreRoute` descending (2.x: static segment 10, param 1), ties broken by comparing segments left to right with a static segment beating a param, then by key in code-unit order. Key order in the object never affects the result (D21, N20). *Check:* unit test: the same manifest in two key orders gives the same sorted list; `/a/:b` beats `/:a/b` for `/a/b`.
- **M-7** `matchPath` keeps 2.x semantics: segment counts equal, statics equal, params decoded with the raw-segment fallback. Matching runs on the base-relative normalised path.

*Check for M-1…M-5:* one unit test per rule.

---

## 4. Scanner contract (Vite plugin, Bun plugin, CLI)

One module, `packages/quiver/src/node/scanner.js`, used by all three front-ends. It runs in Node ≥ 22.12 and Bun ≥ 1.4.4, uses only `node:fs/promises` and `node:path` (no `Bun.Glob`, so the Vite plugin runs under Node), and is never imported by browser code (C-4).

### 4.1 API (internal, not in `exports`)

```js
/**
 * @typedef {{ pattern: string, file: string }} ScanRoute     // file: POSIX path relative to dir
 * @typedef {{ routes: ScanRoute[], notFound: string | null }} ScanResult
 */

/** @param {string} dir absolute pages directory @returns {Promise<ScanResult>} */
export async function scanPages(dir)

/**
 * @param {ScanResult} scan
 * @param {(file: string) => string} specifier  maps a ScanResult file to an import specifier
 * @returns {string} ES module source
 */
export function generateManifest(scan, specifier)

/** @param {string} file POSIX path relative to the pages dir @returns {string} */
export function fileToRoutePath(file)
```

### 4.2 Rules

- **S-1** Includes every `*.js` file under `dir`, recursively. Skips any file or directory whose name starts with `.` or `_`. No other filter (2.x included every `.js`).
- **S-2** `fileToRoutePath` keeps 2.x semantics: strip `.js`, `/index` → parent (`index.js` → `/`), `[name]` → `:name`.
- **S-3** `not-found.js` at the root of `dir` becomes `notFound`. A `not-found.js` anywhere deeper is an error (`Nested not-found.js is not supported: users/not-found.js`); 2.x silently dropped it (N25).
- **S-4** Two files that map to the same pattern (`users.js` + `users/index.js`), or that differ only in parameter names (M-4), are an error naming both files.
- **S-5** A pattern that fails M-2/M-3 is an error naming the file.
- **S-6** `routes` is sorted by `pattern` in code-unit order (stable diffs; core sorts for matching, M-6). Files are POSIX paths whatever the OS.
- **S-7** Errors are thrown as `Error` with message prefix `[quiver] `. The scan collects all errors and throws once, listing each on its own line.
- **S-8** `generateManifest` output, byte for byte except specifiers:
  ```js
  // Generated by Quiver. Do not edit.
  export default {
    '/': () => import('<specifier(index.js)>'),
    '/users/:id': () => import('<specifier(users/[id].js)>'),
  }
  export const notFound = () => import('<specifier(not-found.js)>')
  ```
  With no root `not-found.js`: `export const notFound = undefined`. Keys and specifiers are emitted with `JSON.stringify` then re-quoted as single quotes; LF line endings; trailing newline.

App usage is the same for all three front-ends:

```js
import routes, { notFound } from 'quiver:routes'   // or './routes.gen.js'
await initRouter({ routes, notFound })
```

### 4.3 Vite plugin (`@go4cas/quiver/vite`)

```js
/**
 * @param {{ dir?: string }} [options]  pages dir, relative to Vite root; default 'src/pages'
 * @returns {VitePluginLike}
 */
export default function quiver(options)
```

- **S-10** Resolves the id `quiver:routes` to `\0quiver:routes` and loads `generateManifest(scan, f => toPosix(path.join(absDir, f)))` (absolute paths).
- **S-11** In dev, adding or removing a `.js` file under `dir` invalidates the virtual module and triggers a full reload. Editing a page uses Vite's normal HMR.
- **S-12** Scan errors fail `vite build` and show the Vite error overlay in dev.
- **S-13** The return type is a local structural typedef (`{ name, configResolved, resolveId, load, configureServer }`; `configResolved` resolves `dir` against Vite's root, N75), not `import('vite').Plugin`, so the published `.d.ts` needs no `vite` types and `vite` is not a peer (§9 rule 5).

### 4.4 Bun plugin (`@go4cas/quiver/bun`)

```js
/**
 * @param {{ dir?: string }} [options]  pages dir, relative to process.cwd(); default 'src/pages'
 * @returns {BunPluginLike}
 */
export default function quiver(options)
```

- **S-20** `setup(build)` registers `onResolve({ filter: /^quiver:routes$/ })` → namespace `quiver`, and `onLoad({ filter: /.*/, namespace: 'quiver' })` → `{ contents: generateManifest(scan, absolute), loader: 'js' }`.
- **S-21** Works with `Bun.build({ splitting: true })` on Bun 1.4.4, emitting one chunk per page (SPEC appendix spike; P4 re-proves it with a test).
- **S-22** Return type is a local structural typedef (no `bun-types`), same reason as S-13. Bun's dev server and `bunfig.toml` plugins are not covered in v3.

### 4.5 CLI (`quiver routes`)

```
quiver routes [--dir <pages dir>] [--out <file>] [--watch]
  --dir    default src/pages    (relative to cwd)
  --out    default src/routes.gen.js
  --watch  rescan on add/remove/rename under --dir
```

- **S-30** Writes `generateManifest(scan, f => relative specifier from dirname(out))`. Specifiers always start with `./` or `../`.
- **S-31** Writes only when the content changed (no mtime churn under `--watch`).
- **S-32** Exit codes: `0` success; `1` scan error (messages on stderr); `2` usage error (unknown command or flag, prints usage). `quiver --help` and `quiver routes --help` print usage and exit `0`.
- **S-33** `--watch` uses `fs.watch(dir, { recursive: true })`, debounced 50 ms. A scan error under `--watch` is printed and the watcher keeps running.
- **S-34** `bin/quiver.js` starts with `#!/usr/bin/env node` and uses no Bun-only API, so it runs on Node ≥ 22.12 (D20) and on Bun.

### 4.6 Parity (P4 Done-when)

- **S-40** One fixture `packages/quiver/tests/fixtures/pages/` (static, nested, index, dynamic, nested dynamic, root `not-found.js`, a `_partial.js` and a `.hidden.js` that must be skipped) produces, through each front-end, a module whose source is identical after replacing every import specifier with the fixture-relative file. *Check:* one Vitest test calls the Vite plugin's `load`, the Bun plugin's `onLoad` callback (with a fake `build`), and the CLI (spawned with `node` into a temp dir), normalises specifiers, and compares the three strings with each other and with a committed snapshot. Error rules S-3…S-5 each have a broken fixture.

---

## 5. Package exports

Common rules for both published packages (D20):

- **X-1** `"type": "module"`, `"license": "MIT"`, a `LICENSE` file, `"sideEffects": false`, an `exports` map with `"types"` first and `"default"` second in each condition object, `"./package.json"` exported. No `main`, `module` or `browser` field.
- **X-2** `peerDependencies` is exactly `{ "@arrow-js/core": "^1.0.6" }`. `dependencies` is absent. `@arrow-js/core` is also in `devDependencies` for tests.
- **X-3** Published runtime files are the untouched source. `prepack` only adds generated files (`types/`, and for core `recipes/`); `postpack` removes them. Both paths are in `.gitignore`.
- **X-4** Every `exports` target and every `files` entry exists after `prepack`. *Check:* a test (P8) runs `npm pack --dry-run --json` per package and asserts the file list: runtime files, `.d.ts` per runtime file, `LICENSE`, `README.md`, and for core `AGENTS.md`, `llms.txt`, `recipes/**`, `bin/quiver.js`.

### 5.1 `@go4cas/quiver` (`packages/quiver/package.json`)

```json
{
  "name": "@go4cas/quiver",
  "version": "3.0.0",
  "type": "module",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".":      { "types": "./types/index.d.ts",     "default": "./src/index.js" },
    "./vite": { "types": "./types/node/vite.d.ts", "default": "./src/node/vite.js" },
    "./bun":  { "types": "./types/node/bun.d.ts",  "default": "./src/node/bun.js" },
    "./package.json": "./package.json"
  },
  "bin": { "quiver": "./bin/quiver.js" },
  "files": ["src", "types", "bin", "recipes", "AGENTS.md", "llms.txt", "README.md", "LICENSE"],
  "peerDependencies": { "@arrow-js/core": "^1.0.6" },
  "engines": { "node": ">=22.12" },
  "scripts": {
    "typecheck": "tsc -p jsconfig.json && tsc -p jsconfig.node.json",
    "test": "vitest run",
    "prepack": "node scripts/prepack.js",
    "postpack": "node scripts/postpack.js"
  }
}
```

- **X-10** `recipes/` lives at the repo root (D19) and is copied into `packages/quiver/recipes/` by `prepack`, because npm's `files` can't reach outside the package folder (N24). The copy excludes each recipe's tests and the recipes workspace's `package.json`/`jsconfig.json`. Recipes are not in `exports` (D32).
- **X-11** `prepack` emits `.d.ts` into `types/` with `tsc -p jsconfig.types.json` (`declaration`, `emitDeclarationOnly`, `outDir: types`, includes `src`). TS 7.0.2 emits declarations from the 2.x JSDoc cleanly (N26).
- **X-12** The version is `3.0.0` from P2 on, not a prerelease. Bun links the starter's `^3.0.0` to the workspace only when the workspace version satisfies the range; `3.0.0-alpha.0` makes `bun install` go to npm and fail (N18).

### 5.2 `arrow-use` (`packages/arrow-use/package.json`)

```json
{
  "name": "arrow-use",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".": { "types": "./types/index.d.ts", "default": "./src/index.js" },
    "./package.json": "./package.json"
  },
  "files": ["src", "types", "README.md", "LICENSE"],
  "peerDependencies": { "@arrow-js/core": "^1.0.6" },
  "scripts": {
    "typecheck": "tsc -p jsconfig.json",
    "test": "vitest run",
    "prepack": "tsc -p jsconfig.types.json",
    "postpack": "node -e \"fs.rmSync('types',{recursive:true,force:true})\""
  }
}
```

- **X-20** One entry (`.`). No per-composable subpaths in 0.1; `sideEffects: false` lets bundlers drop unused ones, and the no-build import map needs one line.
- **X-21** The name appears only in `package.json`, imports and docs, so a switch to `@go4cas/arrow-use` is one find-and-replace (D4). *Check:* P8 greps for it.

---

## 6. Workspace layout

```
package.json            private root: workspaces, fan-out scripts, shared devDependencies
jsconfig.base.json      shared compilerOptions (strict, checkJs, es2022, bundler resolution)
vitest.config.js        root project: tests/repo/** only
tests/repo/             repo-wide checks (W-10)
packages/quiver/
  src/                  browser code: index.js, router.js, base.js, match.js, state.js,
                        app.js, context.js, meta.js, route.js (useRoute/useRouter)
  src/node/             scanner.js, vite.js, bun.js (Node/Bun only)
  bin/quiver.js
  scripts/              prepack.js, postpack.js
  tests/                unit tests + fixtures/
  jsconfig.json         src/ minus src/node/, types: []
  jsconfig.node.json    src/node/, bin/, scripts/, types: ["node"]
  jsconfig.types.json   declaration emit
  vitest.config.js      environment: 'jsdom'
  AGENTS.md  llms.txt  README.md  LICENSE
packages/arrow-use/
  src/                  index.js, useFetch.js, useStorage.js, useMediaQuery.js, useEventListener.js
  tests/  example/      vanilla Arrow app (U-11)
  jsconfig.json  jsconfig.types.json  vitest.config.js  README.md  LICENSE
recipes/                private workspace "quiver-recipes": typecheck + tests only, never published
  <name>/               <name>.js, <name>.css, README.md, tests/
starter/                private "quiver-starter": the degit target
  src/  public/  tests/{unit,e2e}/  index.html  vite.config.js  playwright.config.js
  jsconfig.json  vitest.config.js  CLAUDE.md  package.json
examples/vite/  examples/bun/  examples/no-build/   private, each with tests/e2e/
docs/                   private "quiver-docs": VitePress, builds to docs/.vitepress/dist
planning/               not a workspace
.claude-plugin/ or plugins/quiver/   Claude Code plugin with the /add-* commands (P7 picks the path)
```

- **W-1** Root `package.json`: `"private": true`, `"workspaces": ["packages/*", "recipes", "starter", "examples/*", "docs"]`, `engines.bun: ">=1.4.4"` (D34).
- **W-2** Root scripts (D33). `bun run --filter '*' <script>` runs the script in every workspace that has it, skips the rest, and orders by dependency (N27):
  ```json
  "typecheck": "bun run --filter '*' typecheck",
  "test":      "vitest run && bun run --filter '*' test",
  "test:e2e":  "bun run --filter '*' test:e2e",
  "dev":       "bun run --filter quiver-starter dev",
  "build":     "bun run --filter quiver-starter build",
  "docs:dev":  "bun run --filter quiver-docs dev",
  "docs:build":"bun run --filter quiver-docs build"
  ```
  So §9 rule 4's `bun run typecheck && bun run test && bun run test:e2e` works unchanged from the root, and `docs.yml`'s `bun run docs:build` still writes `docs/.vitepress/dist` (D19).
- **W-3** Shared dev tools (`typescript`, `vitest`, `jsdom`, `@playwright/test`) are root `devDependencies`. The starter also lists the ones it uses (`vite`, `vitest`, `jsdom`, `@playwright/test`, `typescript`), because a degit copy has no root. Nothing new is added beyond §11 Q-A.
- **W-4** Workspace dependencies use real ranges, never `workspace:` in the starter (D19, D34). Examples and recipes use `"@go4cas/quiver": "^3.0.0"` and `"arrow-use": "^0.1.0"` too, so copied examples install.
- **W-5** Each workspace has its own `jsconfig.json`. The published packages' configs extend `../../jsconfig.base.json`; core's browser config has `"types": []`, so `import.meta.glob`/`.hot` fail typecheck (D33, R1). The starter's config is self-contained (the base's compiler options copied in, plus `"types": ["vite/client"]`), because a degit copy of `starter/` has no parent config to extend (N56; accepted with P2).
- **W-6** Starter `main.js` passes `base: import.meta.env.BASE_URL` to `initRouter`, and `vite.config.js` sets `base: process.env.QUIVER_BASE ?? '/'`. This is how the sub-path e2e runs without changing app code.

Repo-wide checks (D34), all plain Vitest tests reading files, in `tests/repo/`:

- **W-10** `boundaries.test.js`: nothing under `packages/quiver/` imports from `starter/`, `recipes/` or `examples/`; nothing under `packages/arrow-use/` imports `@go4cas/quiver` or a relative path outside the package; nothing under `recipes/useForm/` imports `@go4cas/quiver` (D32).
- **W-11** `starter-deps.test.js`: no value in `starter/package.json` starts with `workspace:`.
- **W-12** `tailwind.test.js`: the R7 grep. Walks the repo excluding `.git/`, `node_modules/`, `planning/`, `bun.lock` and build output; matches only in `CHANGELOG.md`, the Tailwind guide and the layer-order note (D29). Active from P1.
- **W-13** `packages.test.js`: X-1, X-2 and engines rules for both published packages.

---

## 7. CI layout

`.github/workflows/test.yml` (triggers: push to `main`, pull requests, and from P1 a manual `workflow_dispatch` for `screenshots-update`):

| Job | Steps | From |
|---|---|---|
| `unit` | setup-bun `1.4.x` · `bun install --frozen-lockfile` · `bun run typecheck` · `bun run test` · setup-node `22` · `node packages/quiver/bin/quiver.js routes --dir packages/quiver/tests/fixtures/pages --out "$RUNNER_TEMP/routes.gen.js"` (proves S-34 on Node) | P2 (CLI step P4) |
| `e2e` | setup-bun · install · `bunx playwright install --with-deps chromium` · `bun run test:e2e` | now |
| `screenshots` | runs in the container `mcr.microsoft.com/playwright:v<bun.lock version>-noble` (DESIGN §8.3) · apt `unzip` · setup-bun · install · `bun run test:visual`; baselines live in the repo and are only updated on CI (D35) | P1 |
| `screenshots-update` | only on a manual `workflow_dispatch` with `update-screenshots` (added to the triggers in P1), never on `main`; same container; `test:visual --update-snapshots=changed`, then commits the PNGs to the branch. The only job with `contents: write` | P1 |
| `pack` | setup-bun · install · the X-4 `npm pack --dry-run --json` test for both packages (P8 adds it as a `pack:check` script) | P8 |

`.github/workflows/docs.yml` doesn't change (W-2 keeps its command and output path).

- **CI-1** Playwright configs live per workspace; each `webServer` uses a fixed port with `--strictPort` so `--filter` runs can't collide: starter `5173`, starter sub-path `5174`, `examples/vite` `5180`, `examples/bun` `5181`, `examples/no-build` `5182`.
- **CI-2** The starter's Playwright config has two projects: `root` (`baseURL: http://localhost:5173/`) and `subpath` (`baseURL: http://localhost:5174/sub/app/`, server started with `QUIVER_BASE=/sub/app/`). The whole starter suite runs in both (P3 Done-when).
- **CI-3** E2E tests navigate with relative URLs (`page.goto('users/1')`, `page.goto('./')`), never a leading `/`, because Playwright resolves `/…` against the origin and would drop `/sub/app/`. *Check:* a repo test greps `starter/tests/e2e` and `examples/*/tests` for `goto('/`; zero matches.
- **CI-4** The sub-path project also has (P3): a deep link (`goto('users/1')` renders the user), back/forward, a link outside the base (the test sets `window.__quiverMarker = 1`, clicks a link to `/outside`, waits for load, and asserts the marker is gone, which proves a full document load), and Cmd/Ctrl-click (`click({ modifiers: ['ControlOrMeta'] })` opens a new page via `context.waitForEvent('page')` and the original URL doesn't change).
- **CI-5** Examples (P5) each run a smoke test at `/` and one project under a base path. `examples/no-build` is served by a small `Bun.serve` script with an SPA fallback (no new dependency) and an import map that maps only `@go4cas/quiver` and `@arrow-js/core` (one Arrow copy, R5/R6). Its test asserts that exactly one `@arrow-js/core` module URL was requested.

---

## 8. Composables conventions (`arrow-use`), as testable rules

These turn SPEC §7 "Composables" (D7, D8) into checks. P6 implements them; the review checks each **Check**.

- **U-1 Peer only.** `package.json` matches X-2. *Check:* W-13.
- **U-2 Public Arrow only.** Every import specifier in `src/` is relative or exactly `@arrow-js/core`. No `@arrow-js/core/internal`, no `@go4cas/quiver`, nothing else. *Check:* W-10 plus a package-local regex test.
- **U-3 Nothing at import.** Importing `src/index.js` under Vitest `environment: 'node'` (no `window`, `document`, `localStorage`, `matchMedia`) succeeds, and module top levels contain only imports, exports and declarations. *Check:* node-environment test.
- **U-4 Guarded at call time.** Each composable called in the node environment returns its full shape without throwing, and its getters return the documented no-browser default (table below). *Check:* one test per composable.
- **U-5 Inside and outside components.** Each composable called outside `component()` doesn't throw and returns `stop()`. Called inside a mounted `component()`, its cleanup runs when the component unmounts (Arrow's `onCleanup` throws outside a component, so it's registered with `try { onCleanup(stop) } catch {}`). *Check:* two tests per composable: outside → `stop()` releases (listener removed, request aborted); inside → unmount releases without calling `stop()`.
- **U-6 Getters, plus `stop`.** The return value is a plain object. Every state member is a zero-argument function; there are no raw values and no exposed `reactive()` objects. Every return includes `stop()`, which is idempotent and leaves getters returning their last value. *Check:* a shape test iterates the returned object: every member is a function, and `stop` is present.
- **U-7 Options last.** Signatures are `useX(required…, options = {})`; every option is optional with a default in JSDoc. *Check:* review against the JSDoc; typecheck catches missing defaults under `strict`.
- **U-8 One file per composable.** `src/useX.js` exports a named `useX`; `src/index.js` re-exports each and nothing else; no default exports. *Check:* a test lists `src/use*.js` and compares with `Object.keys(await import('../src/index.js'))`.
- **U-9 Typed.** Every export has `@param`/`@returns` JSDoc and the package typechecks under `strict` + `checkJs`; `prepack`'s `.d.ts` has no `any` on exported signatures except where the JSDoc says `any` on purpose (`useFetch` `data()`). *Check:* `bun run typecheck`; P8 inspects the `.d.ts`.
- **U-10 Plain ESM + JSDoc, no build** (D16). *Check:* X-3.
- **U-11 Vanilla Arrow example.** `packages/arrow-use/example/` uses all four composables with only `@arrow-js/core` and `arrow-use` behind an import map, and an e2e smoke test runs in CI. *Check:* the test.

### 8.1 v0.1 signatures

```js
/**
 * @param {string} url
 * @param {{ immediate?: boolean, transform?: (raw: any) => any } & RequestInit} [options]  immediate default true
 * @returns {{ data: () => any, loading: () => boolean, error: () => string | null,
 *             status: () => number | null, refetch: () => Promise<void>, reset: () => void, stop: () => void }}
 */
export function useFetch(url, options)
// 2.x behaviour kept (abort on refetch, supersession, AbortSignal.any). New: stop() aborts and ignores later refetch().

/**
 * @template T
 * @param {string} key
 * @param {T} initial
 * @param {{ storage?: 'local' | 'session', serializer?: { read: (raw: string) => T, write: (value: T) => string } }} [options]
 *   storage default 'local'; serializer default JSON
 * @returns {{ value: () => T, set: (value: T) => void, remove: () => void, stop: () => void }}
 */
export function useStorage(key, initial, options)
// Syncs across tabs through the 'storage' event. Storage that throws (private mode, blocked) falls back to memory.

/**
 * @param {string} query
 * @returns {{ matches: () => boolean, stop: () => void }}
 */
export function useMediaQuery(query)

/**
 * @param {EventTarget | (() => EventTarget | null | undefined) | null | undefined} target
 * @param {string} type
 * @param {(event: Event) => void} handler
 * @param {AddEventListenerOptions} [options]
 * @returns {{ stop: () => void }}
 */
export function useEventListener(target, type, handler, options)
// A getter target is read once at call time (Arrow has no ref type to watch).
```

| Composable | No-browser default (U-4) |
|---|---|
| `useFetch` | `data() === null`, `loading() === false`; with `immediate`, no request is made when `fetch` is undefined |
| `useStorage` | `value() === initial`; `set` updates the in-memory value |
| `useMediaQuery` | `matches() === false` |
| `useEventListener` | no listener; `stop()` is a no-op |

---

## 9. Typedef index

All in `packages/quiver/src/types.js` (JSDoc only, no runtime code), re-exported for `.d.ts` consumers: `RouteManifest`, `RouteLoader`, `PageModule`, `Page`, `PageMeta`, `Layout`, `LoadingView`, `ErrorView`, `ErrorViewProps`, `InitRouterOptions`, `CreateAppOptions`, `App`, `NavigationGuard`, `GuardContext` (`{ from: string | null, to: string }`), `AfterEachHook` / `AfterEachContext` (`{ from: string | null, to: string, status: 'ready' | 'not-found' | 'error' }`), `ErrorHook` / `ErrorContext` (`{ error: unknown, from: string | null, to: string, phase: ErrorPhase }`), `ErrorPhase` (`'guard' | 'load' | 'render'`), `RouteStatus`, `MetaValue`.

Apps import them as `/** @typedef {import('@go4cas/quiver').RouteManifest} RouteManifest */`.

---

## 10. Choices this spec makes beyond DECISIONS.md

Accept or change these in the review of this PR. Each is the smallest rule that closes a gap found while writing the signatures; none adds scope.

| # | Choice | Why |
|---|---|---|
| T1 | `destroy` is also a named export, and `app.destroy === destroy` | the coordinator brief lists `destroy` among core functions; tests and HMR can tear down without holding `app` |
| T2 | `initRouter` twice, `go()` before init, unknown target, initial URL outside base all throw (C-11, C-14, C-31, C-42) | fail loud on misconfiguration, matching D26's startup-order error |
| T3 | Not-found without a `notFound` page renders the error view with `No route matches "<path>".`, status stays `'not-found'`, no `onError` (C-45) | D28 defines only loading/error views; a third bare view would be new API |
| T4 | Initial-navigation hooks fire inside `createApp()` after mount (C-44) | D24 says the error view shows before `onError`, and there is no view before mount (N28) |
| T5 | `retry()` is `navigation.reload()` (C-46) | reuses the pipeline, re-runs guards so a guard error can be retried |
| T6 | `go()` and redirect strings keep query and hash (C-30, C-32) | 2.x dropped them through `normalizePath` (N21); D18 already keeps them in `url()` |
| T7 | Form POST and download navigations are not intercepted (§2 step 1) | 2.x would swallow a POST (N22) |
| T8 | In-app redirect cap of 10 (C-27) | 2.x could loop forever on in-app redirects (N23) |
| T9 | Deterministic tie-break in route sorting (M-6), and M-4 rejects param-name-only duplicates | D21 says key order doesn't matter, but `scoreRoute` has ties (N20) |
| T10 | Scanner skips `_*` and `.*`, rejects nested `not-found.js` (S-1, S-3) | 2.x silently dropped nested ones (N25); `_` gives pages folders a place for partials |
| T11 | `createApp` replaces the target's existing children (C-43) | a static placeholder would otherwise sit above the app |
| T12 | `src/node/` split, two core jsconfigs (W-5) | keeps `node:` out of browser code and lets C-4 be a typecheck failure |
| T13 | `recipes/` is a private workspace for tests and typecheck, copied into the core tarball at `prepack` (X-10) | D19 says "not a package" (not published); npm `files` can't reach outside the package (N24) |
| T14 | `arrow-use` v0.1 signatures in §8.1, including `stop()` on `useFetch` and `useStorage`'s `storage: 'local' \| 'session'` | SPEC §7 rule 2 requires `stop()`; P6 needs a fixed API to build against |
| T15 | Plugin return types are local structural typedefs (S-13, S-22) | keeps `vite`/`bun-types` out of the published `.d.ts` and out of peers |

---

## 11. Open questions for Cas

- **Q-A (new dev dependency).** *P4 adds it pending Cas's answer on the P4 PR (N80).* The scanner, both plugins and the CLI import `node:fs/promises` and `node:path`. Under `checkJs` + `strict`, `tsc` fails with TS2591 ("Cannot find name 'node:fs/promises'… install type definitions for node") without `@types/node` (N19). Recommendation: add `@types/node` (22.x) as a **dev** dependency of `packages/quiver` only, used by `jsconfig.node.json`. The alternative is leaving `src/node/` and `bin/` out of typecheck, which weakens CI. This needs your OK under §9 rule 8.
- **Q-B (plugin location).** P7 must pick where the Claude Code plugin lives (`plugins/quiver/` vs a root `.claude-plugin/`). It doesn't affect any API here, so it's left to P7 unless you have a preference.
