# layouts

Two layouts. `default.js` is a centred card, used by every page that names no layout. `menu.js` is a sidebar with the brand and nav links, and a header with the current path, the theme controls and a user menu. Both mount the toast container, so `useToast()` works on every page.

## Install

`/add-layout menu` installs `default.js`, `menu.js` and `layouts.css` into `src/layouts/`, plus the recipes they import: `theme`, `link`, `toasts` and `theme-switcher`. In `menu.js`, the imports of those recipes point at where they are installed (`'../components/Link.js'`). Needs `@go4cas/quiver` and `arrow-use`.

## Use

`quiver:app` picks the layouts up from `src/layouts/` by file name, so there is nothing to register. A page picks the menu with `export const meta = { layout: 'menu' }`, and pages without `meta.layout` get `default`. Add your own as more files in `src/layouts/`.

The menu layout reads everything it shows from context keys. `createApp(app, options)` provides them from `app.config.js` and the pages' `meta.nav`, so you rarely edit it:

```js
// src/app.config.js
export default {
  app: { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' },
  currentUser: { name: 'Ada', email: 'ada@example.com', avatar: '/ada.svg', signOut: () => auth.signOut() },
}
```

| Key | Shape | Default |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is a base-relative path | `{ name: 'Quiver' }`: the name as text, no footer |
| `'nav'` | `[{ to, label }]`, built from each page's `meta: { nav: { label, order } }`; a `nav` key in `app.config.js` replaces it | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest; Sign out calls `go('/login')` |

In a manual setup (`provide()`, `initRouter()`, `createApp({ target })`), provide these keys yourself and pass `layouts: { default: DefaultLayout, menu: MenuLayout }`, importing each file's default export.

## Sign-out

The default Sign out only navigates to `/login`: it ends nothing, because the recipe knows nothing about your sessions. A real app gives `currentUser` a `signOut`, and it must:

1. End the session on the server (for example `POST /logout`, which clears the HttpOnly session cookie or revokes the token), since the server is what protects data.
2. Clear the client's identity: the user store, cached user data, anything in `localStorage` tied to the user.
3. Then navigate, typically `go('/login')`.

```js
// src/app.config.js
import { go } from '@go4cas/quiver'
import { authState } from './state/authState.js'

export default {
  currentUser: {
    ...authState.user,
    signOut: async () => {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' })
      authState.clear()
      await go('/login')
    },
  },
}
```

A user known only after startup is provided the same way at runtime: `provide('currentUser', { ...user, signOut })`.

Navigation guards only decide what the app shows; they protect nothing on the server. The starter's sign-in page is a demo with a fixed user and no session.

## Styling

Classes `q-basic`, `q-basic__card`, `q-menu`, `q-menu__*` (`sidebar`, `brand`, `logo`, `name`, `tagline`, `nav`, `nav-link`, `footer`, `body`, `header`, `path`, `actions`, `content`) and `q-user-menu`, `q-user-menu__*`; the hook classes `q-panel`, `q-sidebar`, `q-header` and `q-accent` let theme effects reach them. The active nav link has `aria-current="page"`; the open user menu is `<details open>`.
