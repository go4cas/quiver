# layouts

`BasicLayout` (a centred card) and `MenuLayout` (sidebar and header), and the `layouts` map to pass to `createApp()`. Both mount the toast container, so `useToast()` works on every page.

| | |
|---|---|
| Command | `/add-layout menu` (or `basic`; aliases: `layout`, `MenuLayout`, `BasicLayout`) |
| Copies | `layouts.js`, `layouts.css` → `src/quiver/layouts/` |
| CSS order | after the other component recipes, before `effects.css` |
| Needs | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver`, `arrow-use` |
| Tokens | `--q-color-{brand,brand-tint,fg,fg-soft,fg-faint,line,surface,surface-raised,surface-inset}`, `--q-font-{display,mono}`, `--q-radius-{control,panel}`, `--q-shadow-{panel,float}` |

## Use

```js
// main.js
import { provide, initRouter, createApp } from '@go4cas/quiver'
import { layouts } from './quiver/layouts/layouts.js'

provide('app', { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' })
provide('nav', [{ to: '/', label: 'Dashboard' }, { to: '/users', label: 'Team' }])
provide('currentUser', { name: 'Ada', email: 'ada@example.com', avatar: '/ada.svg', signOut: () => auth.signOut() })

await initRouter({ routes, notFound })
createApp({ target: '#app', layouts, defaultLayout: 'basic' })
```

A page picks one with `export const meta = { layout: 'menu' }`. Add your own next to them: `createApp({ layouts: { ...layouts, wide: WideLayout } })`.

`MenuLayout` shows the sidebar brand and nav links, and a header with the current path, the [theme switcher](./theme-switcher) controls and a user menu. It reads all of it from context:

| Key | Shape | Without it |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is base-relative | `Quiver` as text, no footer |
| `'nav'` | `[{ to, label }]` | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest; Sign out calls `go('/login')` |

Classes: `q-basic`, `q-basic__card`, `q-menu`, `q-menu__{sidebar,brand,logo,name,tagline,nav,nav-link,footer,body,header,path,actions,content}`, `q-user-menu`, `q-user-menu__*`, with the hooks `q-panel`, `q-sidebar`, `q-header` and `q-accent`. The active nav link has `aria-current="page"`; the open user menu is `<details open>`.

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
