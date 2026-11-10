# useStorage

A value kept in `localStorage` (or `sessionStorage`), reactive, and synced with other tabs.

```js
import { useStorage } from 'arrow-use'
```

```ts
useStorage<T>(key: string, initial: T, options?: UseStorageOptions<T>): UseStorageReturn<T>
```

## Example

```js
// src/state/prefs.js: one instance per key, shared by the whole app
import { useStorage } from 'arrow-use'

export const density = useStorage('density', /** @type {'comfortable' | 'compact'} */ ('comfortable'))
```

```js
import { density } from '../state/prefs.js'

html`
  <main data-density="${() => density.value()}">
    <button @click="${() => density.set(density.value() === 'compact' ? 'comfortable' : 'compact')}">
      Toggle density
    </button>
  </main>
`
```

Plain strings instead of JSON, in `sessionStorage`:

```js
const tab = useStorage('last-tab', 'overview', {
  storage: 'session',
  serializer: { read: (raw) => raw, write: (value) => value },
})
```

## Options

| Option | Type | Default | |
|---|---|---|---|
| `storage` | `'local' \| 'session'` | `'local'` | which Web Storage area |
| `serializer` | `{ read(raw: string): T, write(value: T): string }` | `JSON.parse` / `JSON.stringify` | how values become strings |

## Returns

| Member | Type | |
|---|---|---|
| `value()` | `T` | the stored value, or `initial` while the key is unset or unreadable |
| `set(value)` | `(value: T) => void` | stores a value |
| `remove()` | `() => void` | removes the key; `value()` goes back to `initial` |
| `stop()` | `() => void` | stops following other tabs; idempotent |

## Behaviour

- **`initial` is not written.** Until `set()` is called, the key stays unset and `value()` returns `initial`, so changing the default later reaches everyone who never chose.
- **Other tabs.** A write in another tab (or `localStorage.clear()` there) updates `value()` here, through the browser's `storage` event.
- **Same tab: one instance per key.** The `storage` event never fires in the tab that wrote, so two `useStorage` calls for one key in one tab don't see each other's writes. Create one instance in a module and import it, as above.
- **Storage that fails.** When storage is missing or throws (a server, private mode, blocked storage, a full quota), the value lives in memory: `set()` and `value()` still work for this page. A stored string the serializer can't read gives `initial`.
- **Plain values.** `value()` returns the value itself, not a reactive proxy. Store a new value with `set()` rather than mutating the old one.
