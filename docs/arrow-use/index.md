# arrow-use

Composables for [Arrow.js](https://arrow-js.com): small functions that wrap a browser API in reactive getters and clean up after themselves. They need only `@arrow-js/core`, so they work in any Arrow app, with or without Quiver's router.

```bash
bun add arrow-use @arrow-js/core
```

```js
import { component, html } from '@arrow-js/core'
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'

export const Posts = component(() => {
  const posts = useFetch('/api/posts')
  const dense = useStorage('dense', false)
  const wide = useMediaQuery('(min-width: 60rem)')
  useEventListener(() => window, 'keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'r') posts.refetch()
  })

  return html`
    <ul data-dense="${() => dense.value()}" data-wide="${() => wide.matches()}">
      ${() => (posts.data() ?? []).map((p) => html`<li>${p.title}</li>`.key(p.id))}
    </ul>
    <button @click="${() => dense.set(!dense.value())}">Toggle density</button>
  `
})
```

| Composable | For | Returns |
|---|---|---|
| [`useFetch`](./useFetch) | JSON from an API, with loading and error state | `data()`, `loading()`, `error()`, `status()`, `refetch()`, `reset()`, `stop()` |
| [`useStorage`](./useStorage) | a value persisted in `localStorage`/`sessionStorage`, synced across tabs | `value()`, `set()`, `remove()`, `stop()` |
| [`useMediaQuery`](./useMediaQuery) | a CSS media query as a reactive boolean | `matches()`, `stop()` |
| [`useEventListener`](./useEventListener) | an event listener that removes itself | `stop()` |

## Without a bundler

Map both packages to their files in an import map, so `arrow-use` and your app share one copy of Arrow:

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

The package's [example](/examples#arrow-use) is a vanilla Arrow app set up this way.

## Conventions

Every composable here follows these rules, and so should one you write:

1. **Arrow only.** `@arrow-js/core` is the only peer dependency, and only its public exports are used. No Quiver imports.
2. **Getters, not values.** The return value is a plain object of functions. Read state with getters (`data()`, `value()`), so `${() => posts.data()}` stays reactive. Getters return plain values, never `reactive()` proxies.
3. **Always `stop()`.** Every composable returns `stop()`, which releases its listeners and requests. Calling it twice is fine, and the getters keep their last values (a request in flight is aborted, so `loading()` becomes `false`).
4. **Inside or outside a component.** Inside `component()`, cleanup runs when the component unmounts. Anywhere else (module scope, a plain function, a test), nothing throws, and you call `stop()` yourself.
5. **Nothing at import.** Importing the package runs no code; browser APIs are checked when a composable is called, so it imports fine on a server or in tests.
6. **Options last.** `useX(required…, options = {})`, every option optional with a default.
7. **One file per composable.** `src/useX.js` exports `useX`; `src/index.js` re-exports them and their types.
8. **Plain ESM and JSDoc.** No build step: the published files are the source, and `.d.ts` files are generated when the package is packed.

### Cleanup and nested components

Arrow 1.0.6 runs a component's `onCleanup` only when that component is itself what a slot drops, as in `${() => (show ? Panel() : html``)}`. A component inside another template, such as a page inside a layout, isn't cleaned up when its parent goes away. If a composable there holds something that must be released, call `stop()` yourself.

### One `useStorage` per key

Two `useStorage` instances for one key in the same tab don't see each other's writes: the `storage` event only fires in other tabs. For shared state, create one instance in a module and import it ([State](/guide/state#persisted-state)).
