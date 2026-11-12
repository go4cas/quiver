# link

`Link`: a plain `<a>` with the app's base path added by `url()`, `aria-current="page"` on the current page's link and `data-active` on it and on links to the sections above it. It has no `@click`: the Navigation API already intercepts same-origin clicks, so Cmd/Ctrl/middle-click still open a new tab. No CSS of its own; it passes your `class` through.

## Install

Copy `Link.js` to `src/components/`. Needs `@go4cas/quiver`.

## Use

```js
import { Link } from '../components/Link.js'

html`<nav>${Link({ to: '/users', children: 'Team', class: 'nav-link' })}</nav>`
```

Style the active state with `.nav-link[data-active]`. A link to the current page gets `aria-current="page"` and `data-active="page"`; a link to a section above it gets only `data-active="section"` (`/users` on `/users/42`); `/` is never a section. Paths compare as the router matches them: segment by segment, percent-escapes decoded, Unicode NFC (`/release notes` is current at `/release%20notes`). The query and hash in `to` don't count, and an external URL is never active.

`to` is a path, or an absolute `http:`, `https:`, `mailto:` or `tel:` URL. Link parses the `href` it renders as the browser will, against `document.baseURI`: a path must resolve to this origin and inside the base, and an absolute URL's parsed scheme must be one of those four. Anything else renders without an `href`, with a console warning: other schemes (`javascript:`, `data:`, `file:`…), protocol-relative `//host`, and paths the browser would send to another host or outside the base (`\evil.example`, a tab before `/evil.example`, `/../other` under a sub-path). So a link built from user data can't run script or leave the app. This check is separate from `url()`, which passes every absolute URL through for asset paths. For a destination from untrusted data (a query parameter, stored state, an API record), still check it is one you expect, for example same origin or an allowlisted host: an `https:` URL can point anywhere.
