# Routing

Every file in `src/pages/` is a route. The build turns the folder into a **route manifest**, an object that maps each path pattern to a function that loads the page module, and puts it in the `quiver:app` module that `createApp(app, options)` starts ([app structure](./app-config)):

```js
// what the build makes of src/pages/
{
  routes: {
    '/': () => import('./pages/index.js'),
    '/users/:id': () => import('./pages/users/[id].js'),
  },
  notFound: () => import('./pages/not-found.js'),
}
```

You don't write it by hand, though you can ([manual setup](./manual-setup)).

## File-based routes

| File | Route |
|---|---|
| `src/pages/index.js` | `/` |
| `src/pages/login.js` | `/login` |
| `src/pages/users/index.js` | `/users` |
| `src/pages/users/[id].js` | `/users/:id` |
| `src/pages/blog/[slug]/comments.js` | `/blog/:slug/comments` |
| `src/pages/not-found.js` | the 404 page (`notFound`), not a route |

- `index.js` maps to its folder's path.
- `[name]` is a dynamic segment; read it with `useRoute().params().name`.
- Static segments win over dynamic ones: `/users/new` beats `/users/:id`. The order of files never matters.
- Files and folders whose name starts with `_` or `.` are skipped, so `src/pages/_parts/Card.js` can hold page partials.
- Names can hold spaces and other Unicode: `src/pages/release notes.js` is `/release notes`, and the browser's `/release%20notes` matches it. Write the characters themselves; a `%` in a name is an error, since URLs are matched decoded.
- These are errors, each naming the files: a `not-found.js` in a subfolder; two files for one route (`users.js` and `users/index.js`); two that differ only in the param name (`[id].js` and `[slug].js` in one folder); an invalid param name (`[1st].js`); a `%` or `\` in a name.

Three front-ends share one scanner, so the same folder gives the same manifest everywhere:

| Build | Setup | Import |
|---|---|---|
| Vite | `plugins: [quiver()]` from [`@go4cas/quiver/vite`](/api/vite) | `import routes, { notFound } from 'quiver:routes'` |
| `Bun.build` | `plugins: [quiver()]` from [`@go4cas/quiver/bun`](/api/bun) | `import routes, { notFound } from 'quiver:routes'` |
| anything else | [`quiver routes --watch`](/api/cli) writes `src/routes.gen.js` | `import routes, { notFound } from './routes.gen.js'` |

With [`createApp(app, options)`](./app-config) you don't import the routes at all: `quiver:app` (or `quiver app`'s `src/app.gen.js`) carries the same manifest as its `routes` and `notFound`. The imports above are for a [manual setup](./manual-setup).

With Vite, adding or removing a page reloads the browser with the new manifest, a scan error shows in the error overlay, and `vite build` fails on it. Editing a page uses normal HMR. For types on `quiver:routes`, add [`@go4cas/quiver/client`](/api/client) to `compilerOptions.types`.

### A hand-written manifest

A manifest is plain data, so you can write it yourself or mix in eagerly imported pages:

```js
import Home from './pages/index.js'

/** @type {import('@go4cas/quiver').RouteManifest} */
export default {
  '/': () => ({ default: Home }),              // already loaded
  '/runs': () => import('./pages/runs.js'),     // loaded on first visit
  '/runs/:id': () => import('./pages/runs/[id].js'),
}
```

`initRouter()` checks it before anything else and throws a `TypeError` naming the bad key: a key must start with `/`, have no trailing slash (except `/`), no empty segment, no `?` or `#`; a `:param` name must be a valid identifier, unique in its pattern; and two keys that differ only in param names are rejected, since one could never match.

Static segments are compared decoded and in Unicode NFC, so a key can spell a segment literally (`'/café'`, `'/release notes'`) or percent-encoded (`'/caf%C3%A9'`), and the browser's encoded URL matches either. Two keys that spell the same route both ways are rejected too. Param values are decoded (`/tags/caf%C3%A9` gives `{ tag: 'café' }`) but not normalised.

## Pages

A page module default-exports a function that returns an Arrow template, and may export `meta`:

```js
import { html } from '@arrow-js/core'

export const meta = {
  layout: 'menu',     // src/layouts/menu.js; omitted → src/layouts/default.js
  title: 'Team',      // document.title, set after the page loads
}

export default function TeamPage() {
  return html`<h1>Team</h1>`
}
```

Any other key in `meta` is yours; read it with `useRoute().meta()`.

### Titles and descriptions: `useMeta`

For a title or description that depends on params or state, call `useMeta()` in the page function. A function value is reactive:

```js
import { useMeta, useRoute } from '@go4cas/quiver'
import { userState } from '../../state/userState.js'

export default function UserPage() {
  const route = useRoute()
  useMeta({
    title: () => userState.users.find((u) => u.id === route.params().id)?.name ?? 'User',
    description: 'A team member.',
  })
  return html`…`
}
```

The router stops these watchers on every navigation, so a title never leaks onto the next page. `description` sets `<meta name="description">`, creating it if needed. A page that sets neither gets the host page's own title and description back (those in `index.html`).

## Reading the route

`useRoute()` returns getters. Call them inside `() =>` slots, guards or `watch()`, and they stay reactive:

```js
import { useRoute } from '@go4cas/quiver'

const route = useRoute()
html`<p>${() => route.path()} · user ${() => route.params().id}</p>`
```

| Getter | Returns |
|---|---|
| `path()` | the base-relative path, normalised: no query, hash or trailing slash (`''` before `initRouter()`) |
| `params()` | `{ id: '42' }`, decoded |
| `status()` | `'idle'`, `'loading'`, `'ready'`, `'not-found'` or `'error'` |
| `meta()` | the page's `meta` export |

## Navigating

Use links. The Navigation API turns a click on a same-origin `<a href>` into an in-app navigation, so a plain anchor is all you need, and Cmd/Ctrl/middle-click still open a new tab:

```js
import { url } from '@go4cas/quiver'

html`<a href="${url('/users')}">Team</a>`
```

The [`link` recipe](/recipes/link) wraps this for nav menus, with `aria-current="page"` on the current page's link and `data-active` on it and on links to the sections above it. Don't add an `@click` that calls `go()` to a link: it breaks modifier clicks, and the navigation already happens.

From code, after a form submit for example, use `go()` or `useRouter()`:

```js
import { useRouter } from '@go4cas/quiver'

const router = useRouter()
await router.go('/users/42?tab=activity')   // query and hash are kept
await router.back()
await router.forward()
```

Each returns a promise that settles when the navigation and its `afterEach` hooks have finished, following a guard's redirect to the end. A navigation that an unrelated one interrupts resolves quietly.

## Base path

An app can live under a sub-path, such as `https://example.com/tools/app/`. Tell the router once:

```js
await createApp(app, { target: '#app', base: '/tools/app/' })
```

Without the option, the base is the folder of `<base href>` if the page has one, else `/`. With Vite, pass `import.meta.env.BASE_URL` (Vite's `base`). With `Bun.build` or no bundler, set `<base href="/tools/app/">` in `index.html`; relative script and chunk URLs then resolve against it too.

Inside the app, every path is **base-relative**: manifest keys, `go()`, guard `from`/`to` and redirects, hook paths, `useRoute().path()`. Only `url()` adds the base, for `href`s and public assets:

```js
url('/users/42')        // '/tools/app/users/42'
url('logo.svg')         // '/tools/app/logo.svg'
url('https://x.dev')    // unchanged
```

A link to a path outside the base, such as `/other-app`, is not intercepted: the browser loads it as a normal page. If the page itself loads outside the base, starting the router throws, so a misconfigured base fails loudly.

The starter runs under a sub-path with `QUIVER_BASE=/sub/app/ bun run dev`, and its e2e suite runs that way too.

## Guards

`beforeEach(guard)` runs before every navigation, including the first page load (with `from: null`). Return `false` to cancel, a path to redirect, or nothing to continue:

```js
import { beforeEach } from '@go4cas/quiver'
import { auth } from './state/auth.js'

beforeEach(({ from, to }) => {
  if (to.startsWith('/admin') && !auth.loggedIn) return '/login?next=' + encodeURIComponent(to)
})
```

- Guards may be async. They run in registration order, and the first `false` or path wins.
- Cancelling keeps the page that's on screen, with its URL, query and hash (a fragment the browser set itself, like `#top`, included), and leaves history as it was: Back after a cancelled click goes where it went before. On the first load there is no previous page, so `false` redirects to `/`.
- Where the browser supports [precommit handlers](#browser-support), the guards for a link click, `go()` or a replace run before the navigation commits: a cancel changes nothing, so after going Back, the Forward entries are still there, and a redirect commits once, at its target.
- A redirect keeps its query and hash. A redirect to the path being navigated to just proceeds, so a guard without a `to !== '/login'` check still reaches `/login`.
- A redirect stays inside the app. Returning an absolute URL or a path outside the base is a guard error, so a `?next=` value from the query string can't send users elsewhere. Check such values before using them in a link, too.
- Redirect chains stop after 10 hops with an error (shown in the error view, reported to `onError` with `phase: 'guard'`).
- `beforeEach()` returns a function that unregisters the guard.

::: warning Guards are UX, not security
A user can bypass client-side guards. Enforce authorisation on the server.
:::

Register guards before `await createApp(app, options)`, so they also run for the first page. Registered later, they apply from the next navigation. For guards that live in files, by folder or for every route, use [middleware](./middleware); they run after `beforeEach` guards.

## Hooks

```js
import { afterEach, onError } from '@go4cas/quiver'

afterEach(({ from, to, status }) => analytics.page(to, { status }))   // 'ready' | 'not-found' | 'error'
onError(({ error, from, to, phase }) => reportError(error, { to, phase }))  // 'guard' | 'load' | 'render'
```

- `afterEach` runs once after every navigation that commits, never for a cancelled, redirected or superseded one.
- `onError` runs for an error thrown by a guard, by a page's loader (or a module without a default export), or by the page or layout function while rendering. The error view is already on screen when it runs.
- Errors thrown later, by nested components or reactive updates, are Arrow's to report, not the router's.
- Both return an unregister function, run synchronously in registration order, and a throwing handler is logged without stopping the others.
- For the first page they run inside `createApp()`, once the app is mounted.

## Not found and errors

An unmatched path renders the `notFound` page in its layout (`status()` is `'not-found'`). Without a `notFound` page, the error view shows `No route matches "<path>".`

When a guard, a loader or a render throws, the router renders the error view (`src/views/error.js`, or the `error` option of `createApp()`) with `{ message, error, retry }`. `retry()` runs the current navigation again: guards, load and render. The [`views` recipe](/recipes/views) has a styled `ErrorView` with a **Try again** button.

## Startup and teardown

Register guards and hooks (`beforeEach()`, `afterEach()`, `onError()`), then `await createApp(app, { target })`. It rejects with a message that says what to do: a missing `target`, a base the URL is outside, a second call without `destroy()`. A failed call takes back the keys it provided, stops the router it started and empties the target, so you can fix it and call it again. A `destroy()` before the first page is on screen makes it reject as abandoned. `go()` before the router has started throws. The step-by-step order behind it is on [manual setup](./manual-setup).

`destroy()` (or `app.destroy()`) undoes all of it: it stops listening for navigations, clears guards, hooks, context and meta watchers, runs the current page's cleanups ([page cleanup](./troubleshooting#cleanup-never-runs)), puts back the host page's title and description, resets router state and empties the target. After it, the whole sequence can run again, which is handy in tests and for micro-frontends that come and go.

## Browser support

Quiver's router is built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API). The browser reports link clicks, `navigation.navigate()` calls and back/forward as one `navigate` event, which the router intercepts, so it needs no click handlers, no `popstate` juggling and no special link component.

| Browser | Minimum version |
|---|---|
| Chrome, Edge | 102 |
| Safari | 26.2 |
| Firefox | 147 |

CI runs the router's browser tests in Chromium, Firefox and WebKit through Playwright, whose engines are newer than these minimums; the minimums themselves come from where each browser shipped the Navigation API. Playwright's WebKit is close to Safari but is not Safari itself.

### Guards before commit

Where the browser has the Navigation API's precommit handlers ([`NavigationPrecommitController`](https://developer.mozilla.org/en-US/docs/Web/API/NavigationPrecommitController); Chromium has them at the time of writing), Quiver runs the guards for a link click, `go()` or a replace before the browser commits the new history entry. Where it doesn't, and for Back/Forward and reloads in every browser, the entry commits first and a cancel moves back to the entry the page was on. The page, URL, query and hash come back the same either way. The one difference: in a browser without precommit handlers, a link click cancelled after going Back loses the Forward entries, because the browser drops them as the click commits, before any guard can run.

There is no fallback to the History API. In a browser without `window.navigation`, starting the router (`createApp(app, options)` or `initRouter()`) throws:

```
Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+). See https://go4cas.github.io/quiver/guide/routing#browser-support
```

Catch it to show your own message:

```js
try {
  await createApp(app, { target: '#app' })
} catch (error) {
  document.body.textContent = 'Please update your browser.'
  throw error
}
```

What the router leaves to the browser: downloads, form POSTs, hash-only changes, links outside the base, and real reloads (`location.reload()`, the reload button, Vite's full reload), which load the document again.
