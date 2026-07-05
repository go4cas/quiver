# Router API

Functions exported from `src/framework/router.js`.

---

## `initRouter()`

Attaches the Navigation API event listener and resolves the initial route. Must be awaited before `createApp()`.

**Source:** `src/framework/router.js`

```js
import { initRouter } from './framework/router.js'

await initRouter()
```

**Returns:** `Promise<void>` — resolves after the current URL's page module has loaded.

---

## `destroyRouter()`

Removes the Navigation API event listener. Useful for testing or teardown scenarios.

```js
import { destroyRouter } from './framework/router.js'

destroyRouter()
```

**Returns:** `void`

---

## `go(path)`

Navigates to a path using the Navigation API.

```js
import { go } from './framework/router.js'

go('/users')
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `path` | `string` | Target path — trailing slashes and query strings are normalised |

**Returns:** `Promise<void>` — resolves when navigation and rendering complete.

Prefer `useRouter().go()` from inside components and pages.

---

## `beforeEach(guard)`

Registers a navigation guard that runs before every route change.

```js
import { beforeEach } from './framework/router.js'

const unregister = beforeEach(({ from, to }) => {
  if (to.startsWith('/admin') && !isAuthenticated()) {
    return '/login'   // redirect
  }
  // return false   → cancel navigation
  // return nothing → allow navigation
})
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `guard` | `({ from: string \| null, to: string }) => string \| false \| void` | Guard function. Return a path string to redirect, `false` to cancel, or nothing to allow. May be async. |

**Returns:** `() => void` — call the returned function to unregister the guard.

Guards run in registration order. The first guard that returns `false` or a redirect path short-circuits the rest.

Guards also run on the initial page load with `from: null`. On first load, returning `false` redirects to `/` (there is no previous page to stay on); redirect strings re-run the guards for the new destination (capped at 10 hops).

---

## `resolveRoute(path?)`

Resolves a path against the route records and updates `routerState`. Called internally by `initRouter` and the navigate event handler.

```js
import { resolveRoute } from './framework/router.js'

await resolveRoute('/users/42')
```

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `window.location.pathname` | Path to resolve |

**Returns:** `Promise<void>`

---

## `getRouteRecords()`

Returns the list of registered route records derived from `src/pages/`.

```js
import { getRouteRecords } from './framework/router.js'

getRouteRecords()
// [{ file: '../pages/index.js', path: '/' }, ...]
```

**Returns:** `Array<{ file: string, path: string }>`

---

## Path utility functions

These are also exported for use in tests or advanced routing logic.

### `normalizePath(path?)`

Strips query strings and hash fragments, removes a trailing slash (except on `/`).

```js
normalizePath('/users/?foo=bar') // → '/users'
normalizePath('/')               // → '/'
normalizePath()                  // → '/'
```

### `matchPath(routePath, urlPath)`

Matches a route pattern against a URL path. Returns a params object on match, or `null` on no match.

```js
matchPath('/users/:id', '/users/42')   // → { id: '42' }
matchPath('/users/:id', '/posts/42')   // → null
matchPath('/users', '/users')          // → {}
```

### `scoreRoute(path)`

Returns a specificity score for a route path. Used to sort routes so static segments are matched before dynamic ones.

```js
scoreRoute('/')           // → 0 (checked last)
scoreRoute('/users')      // → 10
scoreRoute('/users/:id')  // → 11
```

### `fileToRoutePath(file)`

Converts a `src/pages/` file path to a route path.

```js
fileToRoutePath('../pages/users/[id].js') // → '/users/:id'
fileToRoutePath('../pages/index.js')      // → '/'
```
