# layouts

Two layouts: `layouts/default.js` (a centred card, for every page that names no layout) and `layouts/menu.js` (sidebar and header, `meta: { layout: 'menu' }`). Both mount the toast container, so `useToast()` works on every page.

| | |
|---|---|
| Command | `/add-layout menu` (or `basic`; aliases: `layout`, `MenuLayout`, `BasicLayout`) |
| Installs | `src/layouts/default.js`, `src/layouts/menu.js`, `src/layouts/layouts.css` |
| CSS order | after the other component recipes, before `effects.css` |
| Needs | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver`, `arrow-use` |
| Tokens | `--q-color-{brand,brand-tint,fg,fg-soft,fg-faint,line,surface,surface-raised,surface-inset}`, `--q-font-{display,mono}`, `--q-radius-{control,panel}`, `--q-shadow-{panel,float}` |

## Use

Once installed, `quiver:app` picks both up from `src/layouts/`. A page picks the menu with:

```js
export const meta = { layout: 'menu', title: 'Team', nav: { label: 'Team', order: 2 } }
```

and pages without `meta.layout` get the default card. Configure the menu in `app.config.js`:

```js
// src/app.config.js
export default {
  app: { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg', footer: 'v1.2' },
  currentUser: { name: 'Ada', email: 'ada@example.com', avatar: '/ada.svg', signOut: () => auth.signOut() },
}
```

Add your own layouts beside them, one file each ([layouts](/guide/layouts#adding-a-layout)). In a [manual setup](/guide/manual-setup), import the two default exports and pass `createApp({ layouts: { default: DefaultLayout, menu: MenuLayout } })`.

The menu layout shows the sidebar brand and nav links, and a header with the current path, the [theme switcher](./theme-switcher) controls and a user menu. It reads all of it from context:

| Key | Shape | Without it |
|---|---|---|
| `'app'` | `{ name, tagline?, logo?, footer? }`; `logo` is base-relative | `Quiver` as text, no footer |
| `'nav'` | `[{ to, label }]`, from each page's `meta.nav` (or a `nav` key in `app.config.js`) | no links |
| `'currentUser'` | `{ name, email, avatar, signOut? }` | a guest; Sign out calls `go('/login')` |

Classes: `q-basic`, `q-basic__card`, `q-menu`, `q-menu__{sidebar,brand,logo,name,tagline,nav,nav-link,footer,body,header,path,actions,content}`, `q-user-menu`, `q-user-menu__*`, with the hooks `q-panel`, `q-sidebar`, `q-header` and `q-accent`. The active nav link has `aria-current="page"`; the open user menu is `<details open>`.

## Sign-out

The default Sign out only navigates to `/login`: it ends nothing, because the recipe knows nothing about your sessions. A real app gives `currentUser` a `signOut`, and it must:

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
