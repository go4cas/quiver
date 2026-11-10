# link

`Link`: a plain `<a>` whose `href` goes through `url()`, so it carries the base path, with `aria-current="page"` while its route is active.

| | |
|---|---|
| Command | `/add-component Link` |
| Copies | `link.js` → `src/quiver/link/` |
| CSS | none: it passes your `class` through |
| Needs | `@go4cas/quiver` |
| Tokens | none |

## Use

```js
import { Link } from '../quiver/link/link.js'

html`
  <nav>
    ${Link({ to: '/', children: 'Dashboard', class: 'nav-link' })}
    ${Link({ to: '/users', children: 'Team', class: 'nav-link' })}
  </nav>
`
```

| Prop | Type | |
|---|---|---|
| `to` | `string` | base-relative path |
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
