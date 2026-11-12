# Quiver: guide for AI agents

This file ships inside `@go4cas/quiver` (`node_modules/@go4cas/quiver/AGENTS.md`) for agents working in an app that uses Quiver. Import it from the app's `CLAUDE.md` with `@node_modules/@go4cas/quiver/AGENTS.md`, or point an `AGENTS.md`-aware tool at it. A shorter index is in `llms.txt` beside it.

Quiver is a small router, context and meta layer for [Arrow.js](https://arrow-js.com) apps. The stack around it:

- **`@go4cas/quiver`** (core): file-based routing on the Navigation API, layouts, guards and hooks, `provide`/`inject`, `useMeta`. No styling.
- **`arrow-use`**: Arrow-only composables (`useFetch`, `useStorage`, `useMediaQuery`, `useEventListener`), no Quiver needed.
- **Recipes**: UI and helpers you copy into the app and own, shipped in this package under `recipes/` (see below).
- Plain JavaScript typed with JSDoc, checked by `tsc` with `checkJs` + `strict`. Don't convert files to TypeScript.

## Startup

The order is fixed:

```js
import { provide, beforeEach, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'      // Vite: quiver() from '@go4cas/quiver/vite'

provide('app', { name: 'My app' })                     // 1. context
beforeEach(({ to }) => (to.startsWith('/admin') && !auth.ok ? '/login' : undefined))  // 2. guards, afterEach, onError
await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })  // 3. router
createApp({ target: '#app', layouts, defaultLayout: 'basic', loading, error })   // 4. mount
```

`createApp()` before `initRouter()` resolves throws, as does a second `initRouter()` or `createApp()` before `destroy()`. `destroy()` (or `app.destroy()`) tears everything down so the sequence can run again.

The manifest comes from the `quiver()` Vite plugin (`@go4cas/quiver/vite`), the Bun plugin (`@go4cas/quiver/bun`, for `Bun.build`), or the `quiver routes [--dir src/pages] [--out src/routes.gen.js] [--watch]` CLI for apps without a bundler (keep `--out` outside `--dir`, or name it `_routes.gen.js`). Page names may hold spaces and Unicode (`release notes.js` → `/release notes`); a `%` or `\` in a name is a scan error. With `@go4cas/quiver` installed, run it as `bunx quiver routes` or `npx quiver routes`; without a local install, name the scoped package (`bunx --bun --package @go4cas/quiver@3 quiver routes`, `npm exec --package=@go4cas/quiver@3 -- quiver routes`), since a bare `quiver` resolves to an unrelated npm package. Never hand-edit a generated manifest. For types of `quiver:routes`, add `"@go4cas/quiver/client"` to `compilerOptions.types`.

## The 13 exports

| Name | Use |
|---|---|
| `initRouter({ routes, notFound?, base?, middleware? })` | starts routing; resolves once the first route is ready. `middleware: { global?, sections? }` (3.2) adds guards that run after `beforeEach` |
| `createApp({ target, layouts?, defaultLayout?, loading?, error? })` | mounts the outlet into `target`. `createApp(app, { target, base?, … })` (3.2) takes the `quiver:app` manifest, provides its config and nav, starts the router and mounts; it returns a promise |
| `destroy()` | tears down router, guards, hooks, context, meta watchers and the mounted target; runs the page's cleanups and restores the host page's title and description |
| `go(path)` | navigates; returns a promise that settles when the navigation finishes |
| `url(path)` | adds the base to a base-relative path, for `href` and `src` |
| `beforeEach(fn)` | guard `({ from, to })`: return `false` to cancel (the page on screen stays, history unchanged), a base-relative path to redirect (an absolute URL or a path outside the base is a guard error), anything else to proceed; returns an unregister function |
| `afterEach(fn)` | `({ from, to, status })` after each committed navigation |
| `onError(fn)` | `({ error, from, to, phase })` for `'guard'`, `'load'` and `'render'` errors |
| `useRoute()` | `{ path(), params(), status(), meta() }`, reactive |
| `useRouter()` | `{ go, back, forward }` |
| `useMeta({ title, … })` | sets document meta; values may be functions (reactive). A page without it gets the host page's title and description back |
| `provide(key, value)` / `inject(key, fallback)` | app-global context; last `provide` wins |

Every path the app sees or passes is **base-relative**: manifest keys, `go()`, guard `from`/`to` and redirects, hook paths, `useRoute().path()`. Only `url()` adds the base. Guards also run on the first load with `from: null`; there, `false` redirects to `/`.

## Pages

`src/pages/path.js` is the route `/path`; `src/pages/users/[id].js` is `/users/:id`; `src/pages/not-found.js` (only at the root) handles 404. Files and folders starting with `_` or `.` are not routes.

```js
import { html } from '@arrow-js/core'
import { useMeta, useRoute } from '@go4cas/quiver'

export const meta = { layout: 'menu', title: 'User' }

function UserPage() {
  const route = useRoute()
  useMeta({ title: () => `User ${route.params().id}` })
  return html`<h1>${() => route.params().id}</h1>`
}

export default UserPage
```

`meta.layout` names a layout passed to `createApp({ layouts })`; pages without it get `defaultLayout`. An unknown name renders the page bare with a `console.warn`.

Navigation: a plain `<a href="${url('/users')}">` or the `Link` recipe. Never add an `@click` that calls `go()` to a link: the Navigation API already intercepts the click, and the handler breaks Cmd/Ctrl/middle-click. Use `go()` for programmatic navigation (after a form submits).

## Arrow.js rules

These are easy to get wrong and fail silently:

1. **Values that change must be functions:** `` html`<p>${() => user.name}</p>` ``. `${user.name}` renders once.
2. **No HTML comments inside `` html`…` ``**: Arrow uses comment nodes as slot markers. Comment above the template.
3. **`.disabled="${…}"` is not the DOM property**: it sets a literal attribute named `.disabled`. Use `aria-disabled="${() => String(busy)}"` and style `[aria-disabled="true"]`.
4. **`.key(id)` on templates and components rendered in a loop**: `` ${() => items.map((i) => Card(i).key(i.id))} ``.
5. **A slot that is sometimes a template is always a template.** In a keyed list, a slot that is `''` for one item and a template for another breaks later renders in Arrow 1.0.6. Return an empty template, from a function slot:
   ```js
   html`<li>${() => (item.done ? html`<b>done</b>` : html``)}</li>`.key(item.id)
   ```
6. Quiver renders each page and its layout inside a cleanup scope, so `onCleanup` (from `@arrow-js/core`) and `arrow-use` composables called in the page or layout function are cleaned up when the page is left, on `retry()` and on `destroy()`, inside a layout too. A `component()` nested inside the page's template is not (Arrow 1.0.6): call composables in the page function and pass values down, or call their `stop()` yourself.
7. Arrow flushes DOM updates on a microtask: in tests, `await nextTick()` after changing state.

## State and composables

- **Global state:** a module-scope `reactive({ … })` singleton in `src/state/`, with JSDoc on every action.
- **Composables** are called inside a page or component function, never at module scope. They return zero-argument getters and plain action functions.
- Use `useFetch(url, { immediate, transform, ...fetchOptions })` from `arrow-use` for HTTP (`{ data(), loading(), error(), status(), refetch(), reset(), stop() }`); don't hand-roll fetch plus loading and error state.
- Use `useStorage(key, initial, { storage, serializer })`, `useMediaQuery(query)` and `useEventListener(target, type, handler)` from `arrow-use` instead of wiring `localStorage`, `matchMedia` or `addEventListener` by hand. Keep **one** `useStorage` instance per key for the whole app (a module-level singleton): two instances of one key in the same tab don't see each other's writes.

## Recipes

Recipes ship in this package under `recipes/`: `index.json` is the registry, `README.md` explains how to install one, and each `recipes/<name>/README.md` says how to use it. Install a recipe by copying the paths in its `files` to the app's `src/quiver/<name>/`, plus the recipes in its `requires`, then loading its CSS and wiring it as its README says. The `/add-*` commands of the Quiver Claude Code plugin do this (`/add-component toast`).

| Recipe | Gives | Needs |
|---|---|---|
| `theme` | `tokens.css` (the `--q-*` contract), `base.css` (reset), optional `effects.css` | – |
| `toasts` | `useToast()`, `toastState`, `ToastContainer` | `theme` |
| `theme-switcher` | `themeState`, `ThemeSelector`, `ThemeToggle` (persisted, follows the system mode) | `theme`, `arrow-use` |
| `layouts` | `BasicLayout`, `MenuLayout`, the `layouts` map; read `provide('app' / 'nav' / 'currentUser')`; a real `currentUser.signOut` ends the server session and clears user state (README "Sign-out") | `theme`, `link`, `toasts`, `theme-switcher` |
| `views` | `LoadingView`, `ErrorView` (with `retry`) for `createApp()` | `theme` |
| `link` | `Link({ to, children, class })` with `aria-current="page"`; `to` is a path or an `http(s):`/`mailto:`/`tel:` URL, anything else gets no `href` | – |
| `useForm` | `useForm(values, { validate, onSubmit })` → `{ form, handleSubmit, field(name) }` | – |
| `hmrState` | `hmrState(key, initial)`: state kept across Vite hot reloads | – |

Once copied, a recipe is app code: edit it. Use `useToast()` for notifications rather than ad-hoc banners, and `useForm` for forms.

## CSS

Recipe JS never imports CSS. The app's CSS entry imports, in order:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
@import "./quiver/theme/tokens.css";
@import "./quiver/theme/base.css";
@import "./quiver/toasts/toasts.css";        /* each component recipe */
@import "./quiver/theme/effects.css";
@import "./app.css";                          /* the app's own CSS last */
```

- Colours, radii, shadows and fonts come only from `--q-*` tokens (`var(--q-color-surface-raised)`, `var(--q-radius-panel)`); spacing and sizes are `rem` literals. Never hard-code colours, or theme switching breaks.
- Selectors go inside `:where()`; variants and state are attributes (`data-tone`, `aria-current`, `aria-pressed`), never modifier classes; hover sits inside `@media (hover: hover)`; transforms use the `translate`/`scale` properties.
- No `transition` on `button`, `a` or `input` (`base.css` owns it).
- Add `q-panel` to cards, `q-accent` to brand-coloured text, `q-sidebar`/`q-header` to layout chrome, so theme effects reach them.
- `<html>` carries `data-theme` (`default`, `mono`, `glass`, `retro`, `brutalist`, or your own) and `data-mode` (`light`, `dark`). A new theme is a light and a dark token block in `tokens.css` plus a `THEMES` entry in the theme switcher (`/add-theme`).

## Testing

- Unit tests with Vitest (jsdom) for state, composables and helpers.
- End-to-end tests with Playwright for pages: `getByRole`, `getByLabel`, `getByTestId`; wait on what the user sees, never on fixed delays.
- Apps served under a sub-path: navigate with relative URLs in tests (`page.goto('users')`), never a leading `/`.

## Limits

Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+); recipe CSS uses native nesting (Chrome/Edge 112+). There is no SSR, no plugin system, and one Quiver app per page.

Full docs, with an API reference for every export and the 2.x migration guide: <https://go4cas.github.io/quiver/>.
