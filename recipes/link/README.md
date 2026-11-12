# link

`Link`: a plain `<a>` with the app's base path added by `url()` and `aria-current="page"` while its route is active. It has no `@click`: the Navigation API already intercepts same-origin clicks, so Cmd/Ctrl/middle-click still open a new tab. No CSS of its own; it passes your `class` through.

## Install

Copy `link.js` to `src/components/`. Needs `@go4cas/quiver`.

## Use

```js
import { Link } from '../components/link.js'

html`<nav>${Link({ to: '/users', children: 'Team', class: 'nav-link' })}</nav>`
```

Style the active state with `.nav-link[aria-current="page"]`. A link is active on its own path and on paths below it (`/users` is active on `/users/42`), except `/`, which is active only on `/`.

`to` is a path, or an absolute `http:`, `https:`, `mailto:` or `tel:` URL. Any other scheme (`javascript:`, `data:`, `file:`…) and protocol-relative `//host` targets render without an `href`, with a console warning, so a link built from user data can't run script. This check is separate from `url()`, which passes every absolute URL through for asset paths. For a destination from untrusted data (a query parameter, stored state, an API record), still check it is one you expect, for example same origin or an allowlisted host: an `https:` URL can point anywhere.
