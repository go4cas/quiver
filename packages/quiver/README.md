# @go4cas/quiver

A small router, context and meta layer for [Arrow.js](https://arrow-js.com) apps. Quiver 3 is being built in phases (see `planning/v3/SPEC.md` in the repo); this package is not on npm yet.

```js
import { provide, initRouter, createApp } from '@go4cas/quiver'

provide('app', { name: 'My app' })
await initRouter({
  routes: { '/': () => import('./pages/index.js') },
  notFound: () => import('./pages/not-found.js'),
})
createApp({ target: '#app' })
```

`@arrow-js/core` is a peer dependency. The router needs the [Navigation API](https://developer.mozilla.org/docs/Web/API/Navigation_API).

MIT licensed.
