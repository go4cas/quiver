# @go4cas/quiver

A small router, context and meta layer for [Arrow.js](https://arrow-js.com) apps. Quiver 3 is being built in phases (see `planning/v3/SPEC.md` in the repo); this package is not on npm yet.

```js
import { provide, beforeEach, onError, initRouter, createApp, url } from '@go4cas/quiver'

provide('app', { name: 'My app' })                 // 1. context
beforeEach(({ to }) => (to === '/admin' ? '/login' : undefined))
onError(({ error, phase }) => console.error(phase, error))  // 2. guards and hooks

await initRouter({                                  // 3. router
  routes: {
    '/': () => import('./pages/index.js'),
    '/users/:id': () => import('./pages/users/[id].js'),
  },
  notFound: () => import('./pages/not-found.js'),
  base: '/my/app/',                                 // optional; default: <base href> directory, else '/'
})

const app = createApp({ target: '#app' })           // 4. mount (layouts, defaultLayout, loading, error optional)

url('/users/42')                                    // '/my/app/users/42', for hrefs
app.destroy()                                       // tear down; initRouter + createApp work again
```

Paths are base-relative everywhere except `url()` output. `@arrow-js/core` is a peer dependency. The router needs the [Navigation API](https://developer.mozilla.org/docs/Web/API/Navigation_API) (Chrome/Edge 102+, Safari 26.2+, Firefox 147+).

MIT licensed.
