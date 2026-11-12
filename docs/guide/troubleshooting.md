# Troubleshooting

The issues people hit most, roughly in order. Most are Arrow.js rules that fail without an error, so skim this page once before your first feature.

## The UI renders once but never updates

A `${}` slot holds a bare value. Arrow only tracks what a slot's **function** reads.

```js
html`<p>${userState.users.length}</p>`          // read once
html`<p>${() => userState.users.length}</p>`    // follows changes
```

The same goes for props that can change, and for `arrow-use` getters: `${() => posts.data()}`, not `${posts.data()}`.

## `Uncaught Error: Invalid HTML position`

An HTML comment inside an `html` template. Arrow uses comment nodes as slot markers. Put the comment outside the template literal:

```js
// user info
html`<p>${() => user.name}</p>`
```

## A "disabled" button still fires clicks

`.disabled="${…}"` sets an attribute literally named `.disabled`; the button stays enabled. Use `aria-disabled`, style it, and ignore clicks while busy:

```js
html`<button aria-disabled="${() => String(form.submitting)}">Save</button>`
```

```css
:where(.btn)[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
```

## An event handler never fires

In Arrow 1.0.6, an `@event` handler whose name has capitals (`@myEvent`) never fires. Use lower-case or kebab-case event names: `@click`, `@my-event`.

## List items flicker, lose focus or reset

A `.map()` without `.key()`. Arrow re-creates every item on each change unless it can match them by key:

```js
html`${() => users.map((user) => UserCard(user).key(user.id))}`
```

Use a stable id, not the array index.

## A list stops rendering after an item is removed

In a keyed list, an item's slot that is `''` for one item and a template for another breaks Arrow 1.0.6: once an item that rendered `''` is removed, later items fail to render (`InvalidNodeTypeError` in the console). Return an empty template instead:

```js
html`<li>${() => (item.done ? html`<b>done</b>` : html``)}</li>`.key(item.id)
```

## Cleanup never runs

Since 3.1, Quiver renders each page and its layout inside a cleanup scope. `onCleanup` from `@arrow-js/core`, and every `arrow-use` composable, called in the page or layout function is cleaned up when the page leaves the screen: after the next navigation's guards pass, on `retry()`, and on `destroy()`. That holds inside a layout too. A navigation a guard cancels keeps the page and runs nothing.

```js
import { html, onCleanup } from '@arrow-js/core'
import { useFetch } from 'arrow-use'

export default function PostsPage() {
  const posts = useFetch('/api/posts')     // aborted when you leave
  const id = setInterval(refresh, 30_000)
  onCleanup(() => clearInterval(id))      // runs at the same moment
  return html`…`
}
```

One case is still Arrow's (1.0.6): a `component()` rendered inside another template, as in `` html`<div>${Panel()}</div>` ``, is recycled with its parent and never gets `onCleanup`. A component is cleaned up only when it is itself the value a slot drops, as in `${() => (open ? Panel() : html``)}`. So call composables in the page function and pass their values down, or call the `stop()` every `arrow-use` composable returns.

In 3.0, pages inside a layout got no cleanup at all; the 3.0 workaround of stopping requests from an `afterEach` in the page can go.

## `Quiver needs the Navigation API`

Starting the router throws this in browsers without `window.navigation`: before Chrome/Edge 102, Safari 26.2 or Firefox 147. There is no fallback; see [browser support](./routing#browser-support) for how to show your own message.

## `createApp() needs a router`

In a [manual setup](./manual-setup), `createApp({ target })` ran before `await initRouter()` resolved. Keep the order: `provide()` → guards and hooks → `await initRouter()` → `createApp()`, or use `await createApp(app, options)`, which does it for you. The other startup errors (`initRouter() was already called`, `createApp() was already called`) mean the code ran twice, often from hot reload of `main.js`: call `destroy()` first.

## `Current URL "…" is outside base "…"`

The page loaded at a path the base doesn't cover. Check the `base` you pass to `createApp(app, options)` or `initRouter()` (with Vite, `base` in `vite.config.js`) or the page's `<base href>`.

## Links lose the base path, or open the wrong page under a sub-path

A hard-coded `href="/users"` skips the base. Use `url()`:

```js
html`<a href="${url('/users')}">Team</a>`
html`<img src="${url('/logo.svg')}" alt="" />`
```

Inside the app (`go()`, guards, `useRoute().path()`), keep paths base-relative and don't add the base yourself.

## Cmd/Ctrl-click opens the page in the same tab

The link has an `@click` that calls `go()`. Remove it: a plain `<a href>` is already an in-app navigation, and the browser handles modifier clicks.

## Two component instances share state in dev

Two `hmrState()` calls with the same key. Derive the key from a prop, so each instance has its own: ``hmrState(`counter-${props.label}`, { count: 0 })``. Production is not affected.

## Two `useStorage` calls for one key don't sync

The `storage` event only fires in other tabs, so two instances of one key in the same tab never see each other's writes. Create one `useStorage` per key in a module and import it everywhere ([State](./state#persisted-state)).

## `useForm()` or `useRoute()` state is stale or shared

A composable called at module scope runs once for the life of the app. Call composables inside the page or component function.

## A theme change doesn't reach my component

The component hard-codes a colour, or misses a hook class. Use `--q-*` tokens for every colour, radius, shadow and font, and add `q-panel` to cards so the theme effects apply ([Theming](./theming)).

## `npm run dev` fails with a Node error

Vite 8, Quiver's Vite plugin and the `quiver` CLI need Node 22.12+. The starter's tests (Vitest 5 with jsdom 31) need more: Node 22.22.2+ on the 22 line, 24.15+ on the 24 line, or 26+. Check `node --version`, or use Bun.

## Still stuck?

[Open an issue](https://github.com/go4cas/quiver/issues) with the error and a small snippet.
