# link

`Link`: a plain `<a>` with the app's base path added by `url()` and `aria-current="page"` while its route is active. It has no `@click`: the Navigation API already intercepts same-origin clicks, so Cmd/Ctrl/middle-click still open a new tab. No CSS of its own; it passes your `class` through.

## Install

Copy `link.js` to `src/quiver/link/`. Needs `@go4cas/quiver`.

## Use

```js
import { Link } from '../quiver/link/link.js'

html`<nav>${Link({ to: '/users', children: 'Team', class: 'nav-link' })}</nav>`
```

Style the active state with `.nav-link[aria-current="page"]`. A link is active on its own path and on paths below it (`/users` is active on `/users/42`), except `/`, which is active only on `/`.
