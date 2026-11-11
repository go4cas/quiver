# Layouts

A layout is a function that takes the rendered page and returns the shell around it: navigation, header, footer.

```js
import { html } from '@arrow-js/core'

/** @type {import('@go4cas/quiver').Layout} */
export function MainLayout(content) {
  return html`
    <header>…</header>
    <main>${content}</main>
  `
}
```

## Choosing a layout

`createApp()` takes a map of layouts and a default:

```js
createApp({
  target: '#app',
  layouts: { main: MainLayout, blank: BlankLayout },
  defaultLayout: 'main',
})
```

A page picks one by name with `meta.layout`; a page without it gets `defaultLayout`:

```js
export const meta = { layout: 'blank' }
```

- A name that isn't in `layouts` renders the page bare and logs `[quiver] unknown layout "<name>"`.
- With no `layouts` at all, pages render bare (the implicit default `'default'` doesn't warn).
- The not-found page gets its layout the same way. Loading and error views are rendered without one.
- The rendered page is keyed by path, so navigating between two pages with the same layout replaces the page, and the layout function runs again.

Core renders the layout's output straight into `target`: no wrapper element, no classes.

## The layouts recipe

The [`layouts` recipe](/recipes/layouts) gives you the starter's two layouts:

- **`BasicLayout`** (`'basic'`): a centred card, for login or standalone pages.
- **`MenuLayout`** (`'menu'`): a sidebar with brand and nav links, a header with the current path, the theme controls and a user menu, and the toast container.

Install it with `/add-layout menu` (which also brings `theme`, `link`, `toasts` and `theme-switcher`), then pass its map to `createApp()`:

```js
import { layouts } from './quiver/layouts/layouts.js'

createApp({ target: '#app', layouts, defaultLayout: 'basic' })
```

`MenuLayout` reads what it shows from [`provide()`](/api/core#provide) keys, so you configure it in `main.js` instead of editing it:

```js
provide('app', { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' })
provide('nav', [
  { to: '/', label: 'Dashboard' },
  { to: '/users', label: 'Team' },
])
provide('currentUser', {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  avatar: '/ada.svg',
  signOut: () => auth.signOut(),   // default: go('/login')
})
```

| Key | Shape | Without it |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is a base-relative path | `Quiver` as text, no footer |
| `'nav'` | `[{ to, label }]` | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest entry |

To connect real authentication, fetch the user before `createApp()` and provide it, with a `signOut` that ends the server session and clears the client's user state before it navigates ([the contract](/recipes/layouts#sign-out)). The default only calls `go('/login')`, and the starter's sign-in page is a demo with no session. Since the recipe is a copy in `src/quiver/layouts/`, change anything else directly.

## Adding a layout

In the starter, `src/layouts/index.js` holds the map, so new layouts go next to the recipe's:

```js
// src/layouts/BlankLayout.js
import { html } from '@arrow-js/core'

export function BlankLayout(content) {
  return html`<main class="blank">${content}</main>`
}
```

```js
// src/layouts/index.js
import { layouts as recipeLayouts } from '../quiver/layouts/layouts.js'
import { BlankLayout } from './BlankLayout.js'

/** @type {Record<string, import('@go4cas/quiver').Layout>} */
export const layouts = {
  ...recipeLayouts,
  blank: BlankLayout,
}
```

Style it in `BlankLayout.css` and add an `@import` for it to `src/style.css` ([components](./components#styling-a-component)). `/add-layout <name>` does all of this.

::: tip Cleanup inside layouts
Quiver renders each page and its layout inside a cleanup scope, so `onCleanup` and `arrow-use` composables called in the page or layout function are cleaned up when you navigate away and on `destroy()`. A `component()` nested inside the page's template is not (Arrow 1.0.6); see [troubleshooting](./troubleshooting#cleanup-never-runs).
:::
