# Framework API

Core functions exported from `src/framework/index.js`.

---

## `createApp(options?)`

Initialises the application and mounts it to the DOM.

**Source:** `src/framework/app.js`

```js
import { createApp } from './framework/index.js'

await createApp({ root: '#app' })
```

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `options.root` | `string` | `'#app'` | CSS selector for the root DOM element |
| `options.plugins` | `array` | `[]` | Plugin objects with an optional `install()` method |

**Returns:** `Promise<void>` — resolves after the initial render.

Must be awaited. Call after `initRouter()`.

---

## `createStore(setup)`

Creates a reactive state store. A thin wrapper around Arrow.js `reactive()` that encourages declaring store shape via a setup function.

**Source:** `src/framework/store.js`

```js
import { createStore } from '../framework/index.js'

export const counterState = createStore((reactive) =>
  reactive({
    count: 0,
    increment() { this.count++ },
  })
)
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `setup` | `(reactive) => object` | Receives Arrow.js `reactive` and returns the store object |

**Returns:** The object returned by `setup`.

---

## `provide(key, value)`

Registers a value in the app-level dependency injection context.

**Source:** `src/framework/context.js`

```js
import { provide } from './framework/index.js'

provide('app', { name: 'My App', tagline: 'Powered by Quiver' })
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `key` | `string` | Unique lookup key |
| `value` | `any` | Value to store — can be an object, primitive, or function |

**Returns:** `void`

Call in `src/main.js` before `createApp()`. A key can be overwritten by calling `provide` again with the same key.

---

## `inject(key, fallback?)`

Retrieves a value from the app-level DI context.

**Source:** `src/framework/context.js`

```js
import { inject } from '../framework/index.js'

export function MenuLayout(content) {
  const app = inject('app', { name: 'Quiver', tagline: '' })
  // ...
}
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `key` | `string` | Key to look up |
| `fallback` | `any` | Value returned when the key has not been provided |

**Returns:** The provided value, or `fallback` if the key is not found.

Must be called **inside a function body** — not at module scope — to avoid circular import issues between `framework/index.js` and layout/component files.

---

## `useMeta(options)`

Sets `document.title` and/or the `<meta name="description">` tag. Accepts static strings or reactive arrow functions.

**Source:** `src/framework/meta.js`

```js
import { useMeta } from '../framework/index.js'

function MyPage() {
  useMeta({ title: 'My Page', description: 'Page description.' })
  return html`...`
}
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `options.title` | `string \| () => string` | Document title. A function is re-evaluated reactively via `watch()`. |
| `options.description` | `string \| () => string` | Meta description content. A function is re-evaluated reactively. |

**Returns:** `void`

> **Note:** For static page titles you do not need `useMeta` — declare `export const meta = { title }` in your page module and the router sets `document.title` automatically on every navigation. Use `useMeta` only when the title must be reactive (e.g. derived from route params or state) — see `src/pages/users/[id].js` for a working example.

Reactive `useMeta` watchers are owned by the router: they are stopped automatically on every navigation, so a reactive title never leaks onto the next page.
