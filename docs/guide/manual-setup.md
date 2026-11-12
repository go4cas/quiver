# Manual setup

`createApp(app, options)` with the [`quiver:app`](./app-config) module is the setup the rest of these docs use. You can also wire Quiver yourself, step by step. This is the 3.0 and 3.1 way, and it keeps working in every 3.x release. Use it when the app needs its own startup order, such as fetching the signed-in user before the router starts, or when its layouts and views don't live in the convention folders.

The order is fixed:

```js
// src/main.js
import { provide, beforeEach, afterEach, onError, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'
import DefaultLayout from './layouts/default.js'
import MenuLayout from './layouts/menu.js'
import LoadingView from './views/loading.js'
import ErrorView from './views/error.js'

provide('app', { name: 'Acme' })                                  // 1. context
provide('nav', [{ to: '/', label: 'Home' }, { to: '/users', label: 'Team' }])
beforeEach(({ to }) => (to.startsWith('/admin') && !auth.ok ? '/login' : undefined))   // 2. guards and hooks
await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })               // 3. router
createApp({                                                       // 4. mount
  target: '#app',
  layouts: { default: DefaultLayout, menu: MenuLayout },
  loading: LoadingView,
  error: ErrorView,
})
```

1. **`provide(key, value)`** puts values in the app-global context, for `inject()` in layouts and components. This replaces `app.config.js`. Nothing builds `'nav'` from `meta.nav` here, so provide it yourself.
2. **`beforeEach`, `afterEach`, `onError`** register guards and hooks. Guards registered later still run, but they miss the first navigation.
3. **`initRouter({ routes, notFound, base, middleware })`** checks the manifest, works out the base and resolves the first route. It resolves once that route has loaded. `middleware` takes `{ global, sections }`, the same guards the [middleware folders](./middleware) would give you.
4. **`createApp({ target, layouts, defaultLayout, loading, error })`** mounts. It returns the `App` synchronously. Pages pick a layout from `layouts` by `meta.layout`, and pages without one get `defaultLayout` (default `'default'`).

`createApp()` throws if it's called before `initRouter()` has resolved, and so does a second `initRouter()` or `createApp()` before `destroy()`. `destroy()` tears it all down so the sequence can run again ([API](/api/core#destroy)).

## Where the routes come from

`quiver:routes` is the route manifest alone (`{ '/': () => import('./pages/index.js'), … }` plus `notFound`). The [Vite plugin](/api/vite) and the [Bun plugin](/api/bun) serve it. The `quiver routes --watch` CLI writes it to `src/routes.gen.js`, and you can also write it by hand. The [Bun example](/examples#bun) uses this setup.

## Mixing the two

You can take the pieces of `quiver:app` and still start by hand. This is useful when one step must happen in between:

```js
import { provide, initRouter, createApp } from '@go4cas/quiver'
import app from 'quiver:app'

for (const [key, value] of Object.entries(app.config)) provide(key, value)
provide('nav', app.nav)
provide('currentUser', await fetchCurrentUser())          // the step in between
await initRouter({ routes: app.routes, notFound: app.notFound, middleware: app.middleware, base: import.meta.env.BASE_URL })
createApp({ target: '#app', layouts: app.layouts, loading: app.views.loading, error: app.views.error })
```

For a value that depends on the user, a [store](./state) read reactively is often simpler. Keep `createApp(app, options)`, and let the layout read the store.
