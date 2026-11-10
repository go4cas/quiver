# Migrating from 2.x

Quiver 2.x was a starter template: you scaffolded it with `degit go4cas/quiver my-app` and owned everything, framework included, under `src/framework/`. Quiver 3 splits that into a package you install and code you copy:

| 2.x | 3.0 |
|---|---|
| `src/framework/` (router, context, meta, `createApp`) | the `@go4cas/quiver` package |
| `src/state/routerState.js`, `src/composables/useRoute.js`, `useRouter.js` | `useRoute()`, `useRouter()` from `@go4cas/quiver`; router state is private |
| `src/composables/useFetch.js` | `useFetch` from the `arrow-use` package |
| `src/composables/useForm.js`, `useToast.js`, `src/state/toastState.js`, `src/utils/hmrState.js` | the `useForm`, `toasts` and `hmrState` recipes, copied to `src/quiver/` |
| `src/components/Link.js`, `ToastContainer.js`, `ThemeSelector.js`, `ThemeToggle.js`, `LoadingCard.js`, `ErrorCard.js` | the `link`, `toasts`, `theme-switcher` and `views` recipes (`LoadingView`, `ErrorView`) |
| `src/layouts/BasicLayout.js`, `MenuLayout.js` | the `layouts` recipe |
| `src/state/uiState.js` | `themeState` in the `theme-switcher` recipe |
| Tailwind CSS with `@theme` tokens | plain CSS on the `--q-*` token contract (the `theme` recipe) |
| `/add-*` commands in `.claude/commands/` | the Quiver Claude Code plugin |
| `bunx degit go4cas/quiver my-app` | `bunx degit go4cas/quiver/starter my-app` |

The 2.x template stays available at `bunx degit go4cas/quiver#v2.1.0 my-app`.

## Two ways to migrate

**Start fresh and move your code in.** For an app that is mostly pages, stores and components, this is usually quicker: scaffold the 3.0 starter, then copy over `src/pages/`, `src/state/` (minus the 2.x built-ins), `src/components/` (minus the ones that became recipes) and your tests, and fix imports as below.

**Upgrade in place.** The steps below, in order. Run `bun run typecheck` after each: most breakages show up as unresolved imports.

## 1. Install the packages

```bash
bun add @go4cas/quiver arrow-use
```

Delete `src/framework/`, `src/state/routerState.js`, `src/composables/useRoute.js`, `src/composables/useRouter.js` and `src/composables/useFetch.js`.

## 2. Copy in the recipes

Install what your app used, with the Claude Code plugin (`/add-layout menu` brings `theme`, `link`, `toasts` and `theme-switcher`; then `/add-component views`, `/add-composable useForm`, `/add-composable hmrState`) or by hand ([installing a recipe](/recipes/#installing-a-recipe)). Then delete the 2.x copies: `src/components/{Link,ToastContainer,ThemeSelector,ThemeToggle,LoadingCard,ErrorCard}.js`, `src/composables/{useForm,useToast}.js`, `src/state/{toastState,uiState}.js`, `src/utils/hmrState.js` and `src/layouts/{BasicLayout,MenuLayout}.js`.

If you changed any of those files, carry your changes over to the recipe copies in `src/quiver/`.

## 3. Rewrite `main.js` and the Vite config

2.x:

```js
import { provide, createApp } from './framework/index.js'
import { initRouter } from './framework/router.js'

provide('app', { name: 'Acme', tagline: 'Internal tools' })
await initRouter()
createApp()
```

3.0:

```js
import './style.css'
import { provide, initRouter, createApp } from '@go4cas/quiver'
import routes, { notFound } from 'quiver:routes'
import './quiver/theme-switcher/theme-switcher.js'   // applies the stored theme early
import { layouts } from './layouts/index.js'
import { LoadingView, ErrorView } from './quiver/views/views.js'

provide('app', { name: 'Acme', tagline: 'Internal tools', logo: '/logo.svg' })
provide('nav', [{ to: '/', label: 'Dashboard' }, { to: '/users', label: 'Team' }])

await initRouter({ routes, notFound, base: import.meta.env.BASE_URL })
createApp({ target: '#app', layouts, defaultLayout: 'basic', loading: LoadingView, error: ErrorView })
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import quiver from '@go4cas/quiver/vite'

export default defineConfig({ plugins: [quiver()] })
```

- `initRouter()` takes a route manifest. The Vite plugin builds it from `src/pages/` with the same file rules as 2.x, served as `quiver:routes`. Add `"@go4cas/quiver/client"` to `compilerOptions.types` in `jsconfig.json`.
- `createApp()` takes the mount target, the layouts and the loading and error views, instead of importing them from the app. It renders straight into `target` with no wrapper `<div>`, and replaces whatever the target held.
- The sidebar links of `MenuLayout` come from `provide('nav', …)` now, instead of being hard-coded in the layout.
- `src/layouts/index.js` becomes `export const layouts = { ...recipeLayouts, /* yours */ }` ([Layouts](./layouts#adding-a-layout)).

## 4. Fix imports

| 2.x import | 3.0 import |
|---|---|
| `from '../framework/index.js'`, `'../framework/router.js'` | `from '@go4cas/quiver'` |
| `import { routerState } from '../state/routerState.js'` | `const route = useRoute()`: `route.path()`, `route.params()`, `route.status()`, `route.meta()` |
| `from '../composables/useRoute.js'`, `useRouter.js` | `from '@go4cas/quiver'` |
| `from '../composables/useFetch.js'` | `from 'arrow-use'` |
| `from '../composables/useToast.js'`, `'../state/toastState.js'` | `from '../quiver/toasts/toasts.js'` |
| `from '../composables/useForm.js'` | `from '../quiver/useForm/useForm.js'` |
| `from '../utils/hmrState.js'` | `from '../quiver/hmrState/hmrState.js'` |
| `from '../components/Link.js'` | `from '../quiver/link/link.js'` |
| `uiState.theme = 'glass'`, `uiState.mode = 'dark'` | `themeState.setTheme('glass')`, `themeState.setMode('dark')`; read with `themeState.theme()`, `themeState.mode()` |
| `LoadingCard`, `ErrorCard` | `LoadingView`, `ErrorView` from `../quiver/views/views.js` |

## 5. Replace Tailwind classes

3.0 has no Tailwind. Markup uses plain classes, styled in a CSS file beside each component on the `--q-*` tokens ([Components](./components#styling-a-component), [Theming](./theming)). Token names map directly: `bg-surface-raised` → `background-color: var(--q-color-surface-raised)`, `rounded-panel` → `border-radius: var(--q-radius-panel)`, `shadow-panel` → `box-shadow: var(--q-shadow-panel)`.

To keep Tailwind instead, add it back yourself and expose the tokens to it ([Using Tailwind](./tailwind)). The recipes stay plain CSS either way.

## 6. Check behaviour changes

Most apps need nothing here, but these changed:

- **`go()` and redirects keep the query and hash.** 2.x dropped them. A guard that returns `'/login?next=/admin'` now lands there with the query.
- **Cancelling a navigation keeps the URL.** A guard returning `false` puts back the previous URL with its query and hash, without reloading the page.
- **Reloads are real reloads.** The router no longer intercepts `location.reload()`, `navigation.reload()`, the browser's reload button or Vite's full reload: they load the document again. Only the error view's `retry()` re-runs the route in place.
- **Errors reach the error view.** Guard, load and render errors all render the `error` view, which receives `{ message, error, retry }`; report them with `onError()`. 2.x's error card ignored retry.
- **Unknown layouts render bare.** A page whose `meta.layout` isn't registered renders without a layout and logs a warning, instead of falling back to the default layout.
- **Startup mistakes throw**: `createApp()` before `await initRouter()`, a second `initRouter()` or `createApp()` without `destroy()`, a missing target, `go()` before `initRouter()`.
- **`useFetch().data()` returns plain JSON**, not a reactive proxy of it. Mutating that object no longer re-renders: call `refetch()`, or copy the data into your own `reactive()`.
- **Theme mode follows the system** until the user picks one, and nothing is written to `localStorage` until then. The stored `ui-theme` and `ui-mode` values from 2.x are read as before.
- **Toasts leave when their exit animation ends**, not after a fixed 200 ms, and `dismiss()` returns a promise.
- **Form POSTs and downloads** are left to the browser.
- **`Link` has no click handler**: it is a plain `<a href>`, so Cmd/Ctrl/middle-click open a new tab. Remove any `@click="${() => go(…)}"` from your own links for the same reason.
- **Files starting with `_` or `.` in `src/pages/` are no longer routes**, and a nested `not-found.js` or two files for one route are a build error instead of being silently dropped.

## 7. Know the cleanup caveat

This is unchanged from 2.x, but now documented: Arrow 1.0.6 runs `onCleanup` only for a component that is itself the value a slot drops. Components inside a layout's template (every page with a layout, and their children) never get `onCleanup`, on navigation or on `destroy()`. Stop watchers, timers and listeners there yourself ([troubleshooting](./troubleshooting#cleanup-never-runs)).

## New in 3.0

Things you can adopt once you've migrated:

- [Base paths](./routing#base-path): `initRouter({ base })` and `url()` to serve the app under a sub-path
- [`afterEach` and `onError`](./routing#hooks) for analytics and error reporting
- [`destroy()`](/api/core#destroy) to tear the app down and start it again
- [`useStorage`, `useMediaQuery`, `useEventListener`](/arrow-use/) from `arrow-use`
- [Bun and no-build setups](./getting-started#add-quiver-to-an-app) with the same pages
- [`.d.ts` types](/api/) for TypeScript and JSDoc consumers
