# layouts

`BasicLayout` (a centred card) and `MenuLayout` (sidebar with brand and nav, header with the current path, theme controls and a user menu), plus the `layouts` map for `createApp()`. Both mount the toast container, so `useToast()` works on every page.

## Install

`/add-layout menu` (or `basic`) copies `layouts.js` and `layouts.css` to `src/quiver/layouts/`, with the recipes it imports: `theme`, `link`, `toasts` and `theme-switcher`. Needs `@go4cas/quiver` and `arrow-use`.

## Use

```js
// main.js
import { provide, initRouter, createApp } from '@go4cas/quiver'
import { layouts } from './quiver/layouts/layouts.js'

provide('app', { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' })
provide('nav', [{ to: '/', label: 'Dashboard' }, { to: '/users', label: 'Team' }])
provide('currentUser', { name: 'Ada', email: 'ada@example.com', avatar: '/ada.svg', signOut: () => auth.signOut() })

await initRouter({ routes })
createApp({ target: '#app', layouts, defaultLayout: 'basic' })
```

A page picks its layout with `export const meta = { layout: 'menu' }`. To add your own, register it next to these: `createApp({ layouts: { ...layouts, wide: WideLayout } })`.

`MenuLayout` reads everything it shows from `provide()` keys, so you rarely edit it:

| Key | Shape | Default |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is a base-relative path | `{ name: 'Quiver' }`: the name as text, no footer |
| `'nav'` | `[{ to, label }]` | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest; Sign out calls `go('/login')` |

## Sign-out

The default Sign out only navigates to `/login`: it ends nothing, because the recipe knows nothing about your sessions. A real app passes `signOut` on `'currentUser'`, and it must:

1. End the session on the server (for example `POST /logout`, which clears the HttpOnly session cookie or revokes the token), since the server is what protects data.
2. Clear the client's identity: the user store, cached user data, anything in `localStorage` tied to the user.
3. Then navigate, typically `go('/login')`.

```js
provide('currentUser', {
  ...user,
  signOut: async () => {
    await fetch('/logout', { method: 'POST', credentials: 'same-origin' })
    authState.clear()
    await go('/login')
  },
})
```

Navigation guards only decide what the app shows; they protect nothing on the server. The starter's sign-in page is a demo with a fixed user and no session.

## Styling

Classes `q-basic`, `q-basic__card`, `q-menu`, `q-menu__*` (`sidebar`, `brand`, `logo`, `name`, `tagline`, `nav`, `nav-link`, `footer`, `body`, `header`, `path`, `actions`, `content`) and `q-user-menu`, `q-user-menu__*`; the hook classes `q-panel`, `q-sidebar`, `q-header` and `q-accent` let theme effects reach them. The active nav link has `aria-current="page"`; the open user menu is `<details open>`.
