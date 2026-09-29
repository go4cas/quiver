# Routing

Routes are generated automatically from files in `src/pages/`. You never register routes manually.

---

## File naming rules

| File path | Route |
|---|---|
| `src/pages/index.js` | `/` |
| `src/pages/login.js` | `/login` |
| `src/pages/users/index.js` | `/users` |
| `src/pages/users/[id].js` | `/users/:id` |
| `src/pages/blog/[slug]/comments.js` | `/blog/:slug/comments` |

- A file named `index.js` maps to the directory path.
- Segments wrapped in `[brackets]` become dynamic params (`:param`).
- Static routes are prioritised over dynamic ones at the same depth.

---

## Page module shape

Every page file must default-export a function that returns an Arrow.js template. Export a `meta` object to declare the layout and document title.

```js
import { html } from '@arrow-js/core'

export const meta = {
  layout: 'menu',   // 'menu' or 'basic' — defaults to 'basic' if omitted
  title: 'My Page', // sets document.title automatically on navigation
}

function MyPage() {
  return html`<h1>My Page</h1>`
}

export default MyPage
```

The router sets `document.title` from `meta.title` after each navigation — no manual call needed.

### Reactive titles with `useMeta`

When the title or description must change with route params or state, call `useMeta({ title, description })` from `src/framework/index.js` at the top of the page function (see `src/pages/users/[id].js`):

```js
import { useMeta } from '../framework/index.js'

function UserDetailPage() {
  const route = useRoute()
  useMeta({
    title: () => `User ${route.params().id}`,
    description: 'User profile.',
  })
  return html`...`
}
```

| Option | Type | Description |
|---|---|---|
| `title` | `string \| () => string` | Sets `document.title`; a function is re-evaluated reactively via `watch()` |
| `description` | `string \| () => string` | Sets `<meta name="description">` (created if missing); a function is reactive |

The router stops `useMeta` watchers on every navigation, so a reactive title never leaks onto the next page.

---

## Reading route params

Use `useRoute()` inside your page function to access the current params reactively.

```js
import { useRoute } from '../composables/useRoute.js'

function UserDetailPage() {
  const route = useRoute()

  return html`
    <p>User ID: ${() => route.params().id}</p>
  `
}
```

`route.params()` is a function — call it inside a `${}` slot so Arrow.js tracks the dependency.

---

## Navigating programmatically

```js
import { useRouter } from '../composables/useRouter.js'

function MyPage() {
  const router = useRouter()

  return html`
    <button @click="${() => router.go('/users')}">Go to users</button>
    <button @click="${() => router.back()}">Back</button>
  `
}
```

For declarative navigation in templates, use the `Link` component:

```js
import { Link } from '../components/Link.js'

// Link renders an <a> tag and applies aria-current="page" when active
${Link({ to: '/users', children: 'Users' })}
```

---

## Navigation guards

Register a guard in `src/main.js` (or anywhere before navigation occurs) using `beforeEach`. The guard receives `{ from, to }` and can cancel or redirect.

```js
import { beforeEach } from './framework/router.js'

beforeEach(({ to }) => {
  if (to.startsWith('/admin') && !isAuthenticated()) {
    return '/login' // redirect
  }
  // return false to cancel
  // return nothing (or undefined) to allow
})
```

`beforeEach` returns an unregister function if you need to remove the guard later. Guards may be async and run in registration order; the first one that returns `false` or a path short-circuits the rest.

Guards also run on the initial page load with `from: null`. On first load, returning `false` redirects to `/` (there is no previous page to stay on); redirect strings re-run the guards for the new destination (capped at 10 hops).

::: warning Client-side only
Guards control client-side navigation UX only — a user can bypass them with DevTools. Always enforce authorization on the server for anything sensitive.
:::

::: tip Import path
`beforeEach`, `go`, `destroyRouter`, and the route utilities are exported from `src/framework/router.js` **only** — they are not re-exported from `src/framework/index.js`. Always import them directly from `router.js`.
:::

---

## Router API

Exported from `src/framework/router.js`. Pages and components normally only need `useRoute()` / `useRouter()`.

| Export | Returns | Description |
|---|---|---|
| `initRouter()` | `Promise<void>` | Attaches the Navigation API listener, runs guards, and resolves the initial route. Await it before `createApp()` |
| `destroyRouter()` | `void` | Removes the navigate listener (tests, teardown) |
| `go(path)` | `Promise<void>` | Navigates to `path` (trailing slash and query string normalised); resolves when navigation completes. Prefer `useRouter().go()` in pages |
| `beforeEach(guard)` | `() => void` | Registers `({ from, to }) => string \| false \| void`; returns the unregister function |
| `resolveRoute(path?)` | `Promise<void>` | Resolves `path` (default `window.location.pathname`) and updates `routerState`. Used internally |

Path utilities, exported for tests and custom routing logic:

```js
normalizePath('/users/?foo=bar')          // '/users' — strips query, hash, trailing slash
normalizePath()                           // '/'
matchPath('/users/:id', '/users/42')      // { id: '42' }
matchPath('/users/:id', '/posts/42')      // null
matchPath('/users', '/users')             // {}
scoreRoute('/')                           // 0  — specificity; static beats dynamic
scoreRoute('/users')                      // 10
scoreRoute('/users/:id')                  // 11
fileToRoutePath('../pages/users/[id].js') // '/users/:id'
fileToRoutePath('../pages/index.js')      // '/'
```

---

## 404 handling

If no route matches, the router renders `src/pages/not-found.js`. Edit that file to customise the not-found experience. It follows the same page module shape as any other page.
