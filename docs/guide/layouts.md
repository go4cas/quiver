# Layouts

A layout is a function that takes the rendered page and returns the shell around it, such as the navigation, header and footer. Each `.js` file directly in `src/layouts/` is one layout, named after its file. You don't register them anywhere.

```js
// src/layouts/default.js
import { html } from '@arrow-js/core'

export default function DefaultLayout(content) {
  return html`
    <header>…</header>
    <main>${content}</main>
  `
}
```

The layout is the file's default export. `quiver:app` imports every layout up front, since layouts are small and most pages share one.

## Choosing a layout

A page picks a layout by file name with `meta.layout`. A page without one gets `default`, which is `src/layouts/default.js`:

```js
// src/pages/admin.js
export const meta = { layout: 'menu' }   // src/layouts/menu.js
```

- If a page's literal `meta.layout` names a file that isn't in `layouts/`, the build prints a warning. At runtime the page renders bare and logs `[quiver] unknown layout "<name>"`.
- Without `layouts/default.js`, pages that don't name a layout render bare, with no warning.
- The not-found page gets its layout the same way. The loading and error views ([`views/`](./app-config#views)) render without one.
- The rendered page is keyed by path. Navigating between two pages that share a layout replaces the page, and the layout function runs again.

Core renders the layout's output straight into `#app`, with no wrapper element and no classes.

Rules for the folder: only `.js` files directly in `layouts/` count, and a layout name is letters, digits and `-`. A subfolder is a build error, unless its name starts with `_` or `.` (use that for shared parts, such as `layouts/_parts/Footer.js`). Other files, such as `layouts/menu.css`, are ignored, so a layout's stylesheet can sit beside it.

To pass layouts that don't come from the folder, use `createApp(app, { target, layouts: { wide: WideLayout } })`. These merge over the folder's layouts, and the option wins for a name both have.

## The layouts recipe

The [`layouts` recipe](/recipes/layouts) gives you the starter's two layouts:

- **`layouts/default.js`**: a centred card, for the sign-in page and standalone pages.
- **`layouts/menu.js`** (`'menu'`): a sidebar with the brand and nav links, and a header with the current path, the theme controls and a user menu.

Both mount the toast container. Install the recipe with `/add-layout menu`, which also brings `theme`, `link`, `toasts` and `theme-switcher` into `components/` and `styles/`. Pages then pick the menu layout with `meta: { layout: 'menu' }`.

The menu layout reads what it shows from context, so you configure it in [`app.config.js`](./app-config) instead of editing it:

```js
// src/app.config.js
export default {
  app: { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' },
  currentUser: { name: 'Ada Lovelace', email: 'ada@example.com', avatar: '/ada.svg' },
}
```

Its sidebar links come from the pages themselves. A page joins the menu with `meta.nav`:

```js
// src/pages/users/index.js
export const meta = { layout: 'menu', title: 'Team', nav: { label: 'Team', order: 2 } }
```

| Key | Shape | Without it |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is a base-relative path | `Quiver` as text, no footer |
| `'nav'` | `[{ to, label }]`, from each page's `meta.nav` | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest entry |

To connect real authentication, give `currentUser` a `signOut` that ends the server session and clears the client's user state before it navigates ([the contract](/recipes/layouts#sign-out)). The default only calls `go('/login')`, and the starter's sign-in page is a demo with no session. The recipe files are yours in `src/layouts/`, so change anything else directly.

## Adding a layout

Add a file:

```js
// src/layouts/blank.js
import { html } from '@arrow-js/core'

export default function BlankLayout(content) {
  return html`<main class="blank">${content}</main>`
}
```

Pages use it with `meta: { layout: 'blank' }`. In dev the server reloads when the file appears. Style it in `src/layouts/blank.css` and add an `@import` for it to `src/style.css` ([components](./components#styling-a-component)). `/add-layout <name>` does all of this.

::: tip Cleanup inside layouts
Quiver renders each page and its layout inside a cleanup scope. `onCleanup` and `arrow-use` composables called in the page or layout function are cleaned up when you navigate away and on `destroy()`. A `component()` nested inside the page's template is not (Arrow 1.0.6); see [troubleshooting](./troubleshooting#cleanup-never-runs).
:::

Apps that wire Quiver by hand pass a layouts map to `createApp()` instead ([manual setup](./manual-setup)).
