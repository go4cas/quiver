# link

`Link`: a plain `<a>` whose `href` goes through `url()`, so it carries the base path, with `aria-current="page"` while its route is active.

| | |
|---|---|
| Command | `/add-component Link` |
| Installs | `src/components/link.js` |
| CSS | none: it passes your `class` through |
| Needs | `@go4cas/quiver` |
| Tokens | none |

## Use

```js
import { Link } from '../components/link.js'

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

A link is active on its own path and below it (`/users` on `/users/42`), except `/`, which is active only on `/`. Style it with the attribute:

```css
@layer quiver.components {
  :where(.nav-link)[aria-current="page"] {
    background-color: var(--q-color-brand-tint);
    color: var(--q-color-brand);
  }
}
```

There is no `@click`: the Navigation API already turns the click into an in-app navigation, and Cmd/Ctrl/middle-click open a new tab. If you don't need `aria-current`, a plain `` html`<a href="${url('/users')}">Team</a>` `` does the same.

## Safe targets

`to` is a path, or an absolute `http:`, `https:`, `mailto:` or `tel:` URL. Any other scheme (`javascript:`, `data:`, `file:`…) and protocol-relative `//host` targets render without an `href`, with a console warning, so a link built from user data can't run script. This check is separate from `url()`, which passes every absolute URL through for asset paths. For a destination from untrusted data (a query parameter, stored state, an API record), still check it is one you expect, for example same origin or an allowlisted host: an `https:` URL can point anywhere.
