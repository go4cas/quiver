# arrow-use

Composables for [Arrow.js](https://arrow-js.com): small functions that wrap a browser API in reactive getters and clean up after themselves. They need only `@arrow-js/core`, so they work in any Arrow app, with or without [Quiver](https://github.com/go4cas/quiver). Docs: <https://go4cas.github.io/quiver/arrow-use/>.

```js
import { html, component } from '@arrow-js/core'
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'

const Posts = component(() => {
  const posts = useFetch('/api/posts')
  const dense = useStorage('dense', false)
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  useEventListener(() => window, 'keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'r') posts.refetch()
  })

  return html`
    <p>${() => (posts.loading() ? 'Loading…' : posts.error() ?? '')}</p>
    <ul data-dense="${() => dense.value()}" data-dark="${() => dark.matches()}">
      ${() => (posts.data() ?? []).map((p) => html`<li>${p.title}</li>`.key(p.id))}
    </ul>
    <button @click="${() => dense.set(!dense.value())}">Toggle density</button>
  `
})
```

## Composables

| Composable | Returns | Without a browser |
|---|---|---|
| `useFetch(url, { immediate = true, transform, ...fetchOptions })` | `data()`, `loading()`, `error()`, `status()`, `refetch()`, `reset()`, `stop()` | no request; `data()` is `null`, `loading()` is `false` |
| `useStorage(key, initial, { storage = 'local', serializer = JSON })` | `value()`, `set(value)`, `remove()`, `stop()` | `value()` is `initial`; `set()` keeps the value in memory |
| `useMediaQuery(query)` | `matches()`, `stop()` | `matches()` is `false` |
| `useEventListener(target, type, handler, options = {})` | `stop()` | no listener; `stop()` does nothing |

- **`useFetch`** fetches JSON. `refetch()` aborts the request in flight, and a superseded response never writes its result. A `signal` in the options can abort it too. Errors become `error()` messages (`'HTTP 404'`, `'Failed to fetch'`), never exceptions. `reset()` aborts and clears every value; `stop()` aborts and makes later `refetch()` calls do nothing.
- **`useStorage`** keeps a value in `localStorage` (or `sessionStorage` with `storage: 'session'`) as JSON, or with your own `serializer: { read, write }`. It follows writes from other tabs through the `storage` event. When storage is missing or throws (private mode, blocked storage, a full quota), the value lives in memory instead. It doesn't write `initial`, and two `useStorage` calls for one key in the same tab don't sync with each other.
- **`useMediaQuery`** tracks a CSS media query, such as `'(min-width: 40rem)'`.
- **`useEventListener`** adds a listener and removes it on `stop()` or unmount. `target` is an element, `window`, any `EventTarget`, or a function returning one. A function is called once, at call time, so `() => window` is safe outside a browser.

Types: each composable's options and return shapes are exported as types too, e.g. `/** @type {import('arrow-use').UseFetchReturn} */`.

## Conventions

Every composable here follows the same rules, and so should one you add:

1. **Arrow only.** `@arrow-js/core` is the only peer dependency, and only its public exports are used. No Quiver imports: anything that needs a router belongs in the app or in Quiver.
2. **Getters, not values.** The return value is a plain object of functions. State is read with getters (`data()`, `value()`), so `${() => posts.data()}` stays reactive. No `reactive()` object is exposed, and getters return plain values, not reactive proxies.
3. **Always `stop()`.** Every composable returns `stop()`, which releases its listeners and requests. Calling it twice is fine, and the getters keep their last values afterwards (a request in flight is aborted, so `useFetch().loading()` becomes `false`).
4. **Inside or outside a component.** Called inside `component()`, cleanup runs when the component unmounts. Called anywhere else (module scope, a plain function, a test), nothing throws, and you call `stop()` yourself.
5. **Nothing at import.** Importing the package runs no code. Browser APIs are checked when the composable is called, so the package can be imported on a server or in tests.
6. **Options last.** `useX(required…, options = {})`, every option optional with a default.
7. **One file per composable.** `src/useX.js` exports `useX`; `src/index.js` re-exports them, plus their typedefs.
8. **Plain ESM and JSDoc.** No build step. The published files are the source, and `.d.ts` files are generated from the JSDoc when the package is packed.

### Cleanup and nested components

Arrow runs a component's `onCleanup` only when that component is itself what a slot drops, as in `${() => show ? Panel() : ''}`. A component rendered inside another template, such as a page inside a layout, isn't cleaned up when its parent goes away (Arrow 1.0.6). If a composable there holds something that must be released, call `stop()` yourself.

## Example

[`example/`](example/) is a vanilla Arrow app (no bundler, no Quiver) that uses all four composables through an import map. Run it from this folder with `bun example/serve.js` (a local server on `127.0.0.1` that serves only the example and the files its import map needs), then open <http://127.0.0.1:3000/>. `bun run test:e2e` runs its Playwright smoke test.

With no bundler, map both packages to their files, so `arrow-use` and your app share one copy of Arrow:

```html
<script type="importmap">
  {
    "imports": {
      "@arrow-js/core": "https://cdn.jsdelivr.net/npm/@arrow-js/core@1/dist/index.mjs",
      "arrow-use": "https://cdn.jsdelivr.net/npm/arrow-use@0.1/src/index.js"
    }
  }
</script>
```

MIT licensed.
