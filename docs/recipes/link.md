# link

`Link`: a plain `<a>` whose `href` goes through `url()`, so it carries the base path, with `aria-current="page"` on the current page's link and `data-active` on the links to it and to the sections above it.

| | |
|---|---|
| Command | `/add-component Link` |
| Installs | `src/components/Link.js` |
| CSS | none: it passes your `class` through |
| Needs | `@go4cas/quiver` |
| Tokens | none |

## Use

```js
import { Link } from '../components/Link.js'

html`
  <nav>
    ${Link({ to: '/', children: 'Dashboard', class: 'nav-link' })}
    ${Link({ to: '/users', children: 'Team', class: 'nav-link' })}
  </nav>
`
```

| Prop | Type | |
|---|---|---|
| `to` | `string` | base-relative path, or an `http(s):`, `mailto:` or `tel:` URL |
| `children` | anything Arrow renders | the link content |
| `class` | `string` | classes for the `<a>` |

A link to the current page gets `aria-current="page"` and `data-active="page"`. A link to a section above it gets only `data-active="section"` (`/users` on `/users/42`), since it isn't the current page; `/` is never a section. Paths compare the way the router matches them, segment by segment, with percent-escapes decoded and Unicode normalised, so `/release notes` is current at `/release%20notes` and `/café` at `/caf%C3%A9`. A query or hash in `to` doesn't count, and an external URL is never active. Style the active state with `data-active` (or `[aria-current="page"]` for the current page alone):

```css
@layer quiver.components {
  :where(.nav-link)[data-active] {
    background-color: var(--q-color-brand-tint);
    color: var(--q-color-brand);
  }
}
```

There is no `@click`: the Navigation API already turns the click into an in-app navigation, and Cmd/Ctrl/middle-click open a new tab. If you don't need `aria-current`, a plain `` html`<a href="${url('/users')}">Team</a>` `` does the same.

## Safe targets

`to` is a path, or an absolute `http:`, `https:`, `mailto:` or `tel:` URL. Link parses the `href` it renders the way the browser will, against `document.baseURI`: a path must resolve to this origin and inside the app's base, and an absolute URL's parsed scheme must be one of those four. Anything else renders without an `href`, with a console warning: other schemes (`javascript:`, `data:`, `file:`…), protocol-relative `//host`, and paths the browser would turn into another host or a place outside the base once it drops tabs and newlines and reads `\` as `/` (`\evil.example`, a tab before `/evil.example`, `/../other` under a sub-path). So a link built from user data can't run script or leave the app by accident. This check is separate from `url()`, which passes every absolute URL through for asset paths. For a destination from untrusted data (a query parameter, stored state, an API record), still check it is one you expect, for example same origin or an allowlisted host: an `https:` URL can point anywhere.
