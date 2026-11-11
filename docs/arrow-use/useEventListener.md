# useEventListener

Adds an event listener and removes it again on `stop()`, or when the surrounding `component()` unmounts.

```js
import { useEventListener } from 'arrow-use'
```

```ts
useEventListener(
  target: ListenerTarget,
  type: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions,
): UseEventListenerReturn
```

## Example

```js
import { component, html, reactive } from '@arrow-js/core'
import { useEventListener } from 'arrow-use'

export const Shortcuts = component(() => {
  const state = reactive({ open: false })

  useEventListener(() => window, 'keydown', (event) => {
    const e = /** @type {KeyboardEvent} */ (event)
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      state.open = true
    }
    if (e.key === 'Escape') state.open = false
  })

  return html`${() => (state.open ? html`<div role="dialog">Search…</div>` : html``)}`
})
```

Passive scroll tracking, stopped by hand:

```js
const scroll = useEventListener(() => window, 'scroll', onScroll, { passive: true })
// later
scroll.stop()
```

## Parameters

| Parameter | Type | |
|---|---|---|
| `target` | `EventTarget`, a function returning one, `null` or `undefined` | an element, `window`, `document`, any `EventTarget` |
| `type` | `string` | the event type, e.g. `'keydown'` |
| `handler` | `(event: Event) => void` | the listener |
| `options` | `AddEventListenerOptions` | passed to `addEventListener` (`capture`, `passive`, `once`, `signal`); default `{}` |

## Returns

| Member | Type | |
|---|---|---|
| `stop()` | `() => void` | removes the listener; idempotent |

## Behaviour

- **A function target is called once**, when `useEventListener` is called. Arrow has no element refs to watch, so the function is not re-read later. `() => window` is the safe way to name `window` in code that may run outside a browser: if the function throws or returns nothing, no listener is added.
- **No target, no listener**, and `stop()` does nothing.
- The same `options` are passed to `removeEventListener`, so a `capture` listener is removed correctly.
- Called in a Quiver 3.1+ page or layout function, the listener is removed when the page is left. Inside a `component()` nested in another template, unmount cleanup doesn't run in Arrow 1.0.6; call `stop()` yourself ([why](/guide/troubleshooting#cleanup-never-runs)).
