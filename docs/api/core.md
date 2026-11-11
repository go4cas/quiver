# @go4cas/quiver

```js
import {
  initRouter, createApp, destroy,
  go, beforeEach, afterEach, onError,
  useRoute, useRouter, useMeta, url,
  provide, inject,
} from '@go4cas/quiver'
```

The package entry exports exactly these 13 functions, plus types. Importing it has no side effects and touches no browser API, so it can be imported on a server or in tests. `@arrow-js/core` (`^1.0.6`) is its only peer dependency.

Every path below is **base-relative** (`/users/42`, not `/app/users/42`), except what `url()` returns.

## Startup

```js
provide(key, value)                                  // 1. context
beforeEach(fn); afterEach(fn); onError(fn)           // 2. guards and hooks
await initRouter({ routes, notFound, base })         // 3. router
const app = createApp({ target, layouts, ... })      // 4. mount
```

Guards and hooks registered after `initRouter()` still run, but miss the first navigation.

### initRouter

```ts
initRouter(options: InitRouterOptions): Promise<void>
```

Starts the router: checks the manifest, works out the base, listens for navigations, and resolves the current URL (guards, then the page's loader). Resolves once the first route has loaded.

| Option | Type | Default | |
|---|---|---|---|
| `routes` | `RouteManifest` | required | pattern → loader, e.g. from `quiver:routes` |
| `notFound` | `RouteLoader` | none | page for unmatched paths |
| `base` | `string` | `<base href>` folder, else `'/'` | absolute pathname the app lives under; a missing trailing slash is added |

```js
import routes, { notFound } from 'quiver:routes'

await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
```

- It does **not** reject when a guard, loader or the not-found case fails for the first page: the error view shows it once `createApp()` mounts, and `onError` reports it then.
- It throws (rejects) when: `window.navigation` is missing (`Quiver needs the Navigation API (…)`, see [browser support](/guide/routing#browser-support)); it was already called (`initRouter() was already called. Call destroy() first.`); the manifest is invalid (`TypeError` naming the key); `base` doesn't start with `/` (`TypeError`); the current URL is outside the base (`Current URL "…" is outside base "…".`).
- Manifest rules: keys start with `/`, no trailing slash (except `/`), no `//`, `?` or `#`; `:param` names are identifiers, unique per pattern; no two keys that differ only in param names, or that spell one route two ways (`/café`, `/caf%C3%A9`). Values are functions. Static segments match decoded and NFC-normalised, so a literal or an encoded key matches the browser's URL.
- Matching: the most specific pattern wins (a static segment beats a param, leftmost first), whatever the key order.

### createApp

```ts
createApp(options: CreateAppOptions): App   // App = { destroy(): void }
```

Mounts the current route into `target`, inside its layout, and keeps it in sync. Fires the first navigation's `onError` and `afterEach` once mounted.

| Option | Type | Default | |
|---|---|---|---|
| `target` | `Element \| string` | required | element or CSS selector; its children are replaced |
| `layouts` | `Record<string, Layout>` | `{}` | layouts pages pick by `meta.layout` |
| `defaultLayout` | `string` | `'default'` | layout for pages without `meta.layout` |
| `loading` | `LoadingView` | `` html`<p>Loading…</p>` `` | shown while status is `'idle'` or `'loading'` |
| `error` | `ErrorView` | `` html`<p role="alert">${message}</p>` `` | shown for errors, gets `{ message, error, retry }` |

```js
import { layouts } from './quiver/layouts/layouts.js'
import { LoadingView, ErrorView } from './quiver/views/views.js'

const app = createApp({ target: '#app', layouts, defaultLayout: 'basic', loading: LoadingView, error: ErrorView })
```

| Route status | Renders |
|---|---|
| `'idle'`, `'loading'` | `loading()` |
| `'ready'` | the page inside its layout |
| `'not-found'` with `notFound` | the not-found page inside its layout |
| `'not-found'` without `notFound` | `error({ message: 'No route matches "<path>".', error: null, retry })` |
| `'error'` | `error({ message, error, retry })` |

- `message` is `error.message` for an `Error`, else `String(error)`. `retry()` re-runs guards, load and render for the current URL and resolves when done.
- A `meta.layout` (or explicit `defaultLayout`) that isn't in `layouts` renders the page bare with `console.warn('[quiver] unknown layout "<name>"')`. The implicit `'default'` is silent.
- No wrapper element and no `class` are rendered: the layout's output goes straight into `target`.
- Throws: before `initRouter()` resolved (`createApp() needs a router. Call in this order: …`); a second time (`createApp() was already called. Call destroy() first.`); a selector that matches nothing (`createApp(): target "#app" not found.`); a target that is neither an element nor a string (`TypeError`).
- Render errors are caught for the page and layout functions themselves; errors thrown later by nested components or reactive updates are not.

### destroy

```ts
destroy(): void
```

Tears everything down, in order: drops in-flight navigations, removes the navigation listener, clears guards and hooks, stops `useMeta` watchers, clears the `provide` context, unmounts and empties the target, and resets router state and the base. `app.destroy` is the same function. Idempotent, and works when only `initRouter()` ran. Afterwards `initRouter()` and `createApp()` can run again.

```js
import { afterEach } from 'vitest'
afterEach(() => destroy())
```

`onCleanup` callbacks registered in the page and layout functions run, inside a layout too ([page cleanup](/guide/troubleshooting#cleanup-never-runs)). `document.title` and `<meta name="description">` go back to what the host page had when `initRouter()` ran.

## Navigation

### go

```ts
go(path: string): Promise<void>
```

Navigates to a base-relative path (query and hash kept) or an absolute URL. Resolves when the navigation and its `afterEach` handlers have finished, including a guard's redirect (and that target's own guards) or the rollback after a cancel. A navigation interrupted by an unrelated one resolves quietly, without waiting for the newer one; other errors reject. Throws before `initRouter()` (`Quiver router is not initialised. Call initRouter() first.`).

```js
await go('/users/42?tab=activity#notes')
```

For links, render `<a href="${url(path)}">` instead: the Navigation API makes it an in-app navigation and modifier clicks still open a new tab.

### url

```ts
url(path: string): string
```

The `href` for a base-relative path: the base plus the path without its leading `/`, query and hash kept. An absolute URL (`https:`, `mailto:`, `//host`) is returned unchanged. Before `initRouter()` and after `destroy()`, the base is `/`.

```js
// base '/app/'
url('/')                      // '/app/'
url('/runs/42?tab=log#x')     // '/app/runs/42?tab=log#x'
url('logo.svg')               // '/app/logo.svg'
url('https://example.com')    // 'https://example.com'
```

### beforeEach

```ts
beforeEach(guard: NavigationGuard): () => void
// NavigationGuard = ({ from, to }: GuardContext) => false | string | void | Promise<…>
```

Registers a guard and returns its unregister function. Guards run in registration order before every navigation, the first page load included (`from: null`), and the first `false` or string wins:

- `false` cancels: the last page that finished loading stays (or comes back, if another navigation had started loading), with its URL, query and hash. A cancelled link click or Back/Forward adds and rewrites no history entry; a cancelled replace puts the old URL back in place. On the first load, `false` redirects to `/`.
- a string redirects (base-relative, may carry a query and hash). A redirect to the path already being navigated to proceeds. More than 10 redirects in a row is an error (`Too many redirects (10) from "<path>".`). A redirect must stay inside the app: an absolute URL (`https:`, `javascript:`, `//host`) or a path outside the base is a guard error (`A guard redirected to "…". Redirects must be base-relative paths inside the app; use go() for other URLs.`); call `go()` in the guard's place for an external URL.
- `from` is the page on screen, never one still loading for a navigation that was superseded. Once a newer navigation starts, the older one's remaining guards don't run.
- anything else continues.

A throwing guard renders the error view and calls `onError` with `phase: 'guard'`.

```js
const stop = beforeEach(({ to }) => (to.startsWith('/admin') && !auth.loggedIn ? '/login' : undefined))
```

### afterEach

```ts
afterEach(hook: AfterEachHook): () => void
// AfterEachHook = ({ from, to, status }: AfterEachContext) => void
// status: 'ready' | 'not-found' | 'error'
```

Runs once after every committed navigation, never for a cancelled, redirected or superseded one. For the first page it runs inside `createApp()`.

```js
afterEach(({ to, status }) => analytics.page(to, { status }))
```

### onError

```ts
onError(hook: ErrorHook): () => void
// ErrorHook = ({ error, from, to, phase }: ErrorContext) => void
// phase: 'guard' | 'load' | 'render'
```

Runs for an error thrown by a guard, by a loader (or a page module without a default export function: `Route "/users/:id" must default export a page function.`), or by the page or layout function while rendering. The error view is already shown when it runs, and `afterEach` follows with `status: 'error'`.

```js
onError(({ error, to, phase }) => Sentry.captureException(error, { tags: { to, phase } }))
```

`afterEach` and `onError` handlers run synchronously, in registration order, and are not awaited. One that throws is logged (`[quiver] afterEach handler threw`) and the rest still run. Unregister functions are idempotent.

## Reading the route

### useRoute

```ts
useRoute(): {
  path: () => string,
  params: () => Record<string, string>,
  status: () => RouteStatus,   // 'idle' | 'loading' | 'ready' | 'not-found' | 'error'
  meta: () => PageMeta,
}
```

Reactive getters for the current route, usable anywhere: templates, `watch()`, guards, stores. `path()` is base-relative and normalised (no query, hash or trailing slash), and `''` before `initRouter()`. `params()` values are decoded.

```js
const route = useRoute()
html`<h1>User ${() => route.params().id}</h1>`
```

### useRouter

```ts
useRouter(): { go: typeof go, back: () => Promise<void>, forward: () => Promise<void> }
```

`go` is the function above; `back()` and `forward()` move through history and resolve when the navigation finishes, like `go()`.

```js
const router = useRouter()
html`<button @click="${() => router.back()}">Back</button>`
```

### useMeta

```ts
useMeta(config?: { title?: MetaValue, description?: MetaValue }): void
// MetaValue = string | (() => string)
```

Sets `document.title` and `<meta name="description">` (created if missing). A function value is watched and re-applied when what it reads changes; the router stops those watchers on every navigation and on `destroy()`. On every navigation that commits, the title and description go back to the host page's own (what they were when `initRouter()` ran; a description tag the host page didn't have is removed), then a page's static `meta.title` export is applied, before it renders. So a page without metadata, the not-found page and the error view never show the previous page's.

```js
useMeta({ title: () => `Team (${userState.users.length})`, description: 'Everyone on the team.' })
```

## Context

### provide

```ts
provide(key: string, value: unknown): void
```

Stores a value in the app-wide context. The last `provide()` for a key wins; `destroy()` clears them all. Core reserves no keys; the [layouts recipe](/recipes/layouts) reads `'app'`, `'nav'` and `'currentUser'`.

```js
provide('app', { name: 'Acme' })
```

### inject

```ts
inject<T = unknown>(key: string, fallback?: T): T
```

Reads a context value, or returns `fallback` when the key is missing, `null` or `undefined`.

```js
const app = inject('app', { name: 'Untitled' })
```

## Types

All importable from the package in JSDoc or TypeScript, e.g. `/** @typedef {import('@go4cas/quiver').RouteManifest} RouteManifest */`.

| Type | Shape |
|---|---|
| `RouteManifest` | `Record<string, RouteLoader>` |
| `RouteLoader` | `() => PageModule \| Promise<PageModule>` |
| `PageModule` | `{ default: Page, meta?: PageMeta }` |
| `Page` | `() => ArrowRenderable` |
| `PageMeta` | `{ layout?: string, title?: string, [key: string]: unknown }` |
| `Layout` | `(content: ArrowRenderable) => ArrowRenderable` |
| `LoadingView` | `() => ArrowRenderable` |
| `ErrorView` | `(props: ErrorViewProps) => ArrowRenderable` |
| `ErrorViewProps` | `{ message: string, error: unknown, retry: () => Promise<void> }` |
| `InitRouterOptions` | `{ routes, notFound?, base? }` |
| `CreateAppOptions` | `{ target, layouts?, defaultLayout?, loading?, error? }` |
| `App` | `{ destroy: () => void }` |
| `NavigationGuard` | `(ctx: GuardContext) => false \| string \| void \| … \| Promise<…>` |
| `GuardContext` | `{ from: string \| null, to: string }` |
| `AfterEachHook`, `AfterEachContext` | `(ctx) => void`, `{ from: string \| null, to: string, status: 'ready' \| 'not-found' \| 'error' }` |
| `ErrorHook`, `ErrorContext` | `(ctx) => void`, `{ error: unknown, from: string \| null, to: string, phase: ErrorPhase }` |
| `ErrorPhase` | `'guard' \| 'load' \| 'render'` |
| `RouteStatus` | `'idle' \| 'loading' \| 'ready' \| 'not-found' \| 'error'` |
| `MetaValue` | `string \| (() => string)` |
