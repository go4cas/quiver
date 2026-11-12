# Middleware

Middleware are guards kept in files. They run before a page loads and decide whether the navigation goes ahead. There are two kinds:

- **Global** middleware in `src/middleware/` runs on every navigation.
- **Section** middleware in a `_middleware.js` inside `src/pages/` runs for every route in that folder and below.

Each file default-exports a function with the [`beforeEach`](/api/core#beforeeach) signature. It gets `{ from, to }` and returns one of:

- `false` to cancel. The page on screen stays, and no history entry is added. On the first load it goes to `/`.
- A path to redirect to, such as `'/login'` or `'/login?next=/admin'`.
- Anything else, or nothing, to continue.

It can be `async`. A throw shows the error view and reaches `onError` with `phase: 'guard'`.

## Global middleware

```js
// src/middleware/auth.js
import { authState } from '../state/authState.js'

export default function auth({ to }) {
  if (to !== '/login' && !authState.user) return `/login?next=${encodeURIComponent(to)}`
}
```

Every `.js` file directly in `middleware/` is global. The files run in file-name order (code-unit order, as `sort()` gives), so a number prefix sets the order: `01.auth.js` runs before `02.analytics.js`. Without prefixes the order is alphabetical, which is fine when the files don't depend on each other. A subfolder is a build error, unless its name starts with `_` or `.` (use that for shared helpers).

## Section middleware

```js
// src/pages/admin/_middleware.js: guards /admin and every route under it
import { authState } from '../../state/authState.js'

export default function adminOnly() {
  if (!authState.user?.admin) return '/'
}
```

A `_middleware.js` covers its folder's routes, including the folder's `index.js`. Folders nest: with `pages/_middleware.js` and `pages/admin/_middleware.js`, a visit to `/admin/users/7` runs the outer one first, then the inner one. A folder with a parameter in its name (`pages/users/[id]/_middleware.js`) covers every user's routes. `_middleware.js` is never a route itself.

The build fails, rather than run only some guards, when it can't be sure it found them all:

- Two folders that are the same section, such as `pages/[id]/` and `pages/[slug]/` (they differ only in the parameter name), or `café` spelled two ways in Unicode, can't both hold a `_middleware.js`. The error names both files; keep one folder.
- A `middleware/` folder, or a folder under `pages/`, that exists but can't be read is an error. A missing `middleware/` is fine.
- Quiver doesn't follow symbolic links inside `pages/`, `layouts/`, `middleware/` or `views/`. A linked `.js` file in `layouts/`, `middleware/` or `views/`, or a linked `_middleware.js`, is an error; put the file itself there. A linked page or folder under `pages/` is not read, like any other file that isn't a page.

## Order

On every navigation, guards run in this order. The first one that cancels or redirects stops the rest.

1. guards registered with `beforeEach()`, in registration order
2. global middleware, in file-name order
3. section middleware, outermost folder first

Quiver finds the sections from the route's pattern before it loads the page, so a section guard runs before the page's code is downloaded. A path that matches no route (the not-found page) runs global middleware only.

Redirects follow the same rules as a `beforeEach` redirect: the path is base-relative, query and hash are kept, and the chain stops after 10 hops with an error. When the redirect target is itself guarded, its own middleware runs too. A guard that returns the path already being navigated to lets the navigation through, so a guard that sends everyone to `/login` still reaches `/login`.

::: tip Guards hide pages; servers protect data
Middleware decides what the app shows. A user can still call your API directly, so check permissions on the server too.
:::

## Without the folders

`initRouter()` takes the same middleware as an object, for apps that wire Quiver by hand ([manual setup](./manual-setup)):

```js
await initRouter({
  routes,
  middleware: {
    global: [auth],
    sections: { '/admin': [adminOnly] },
  },
})
```

`beforeEach()` is still there for guards that depend on runtime state, or that a module registers and removes again. It returns an unregister function.
