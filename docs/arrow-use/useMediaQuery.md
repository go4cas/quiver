# useMediaQuery

Whether a CSS media query matches, as a reactive boolean that follows changes (a window resize, the system switching to dark mode).

```js
import { useMediaQuery } from 'arrow-use'
```

```ts
useMediaQuery(query: string): UseMediaQueryReturn
```

## Example

```js
import { component, html } from '@arrow-js/core'
import { useMediaQuery } from 'arrow-use'

export const Nav = component(() => {
  const wide = useMediaQuery('(min-width: 48rem)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return html`
    <nav data-layout="${() => (wide.matches() ? 'bar' : 'drawer')}"
         data-motion="${() => (reducedMotion.matches() ? 'off' : 'on')}">…</nav>
  `
})
```

Prefer CSS `@media` for styling. Use this when the logic changes: rendering a different component, choosing a default, starting or skipping an animation in JS.

## Returns

| Member | Type | |
|---|---|---|
| `matches()` | `boolean` | whether the query matches now |
| `stop()` | `() => void` | stops following changes; `matches()` keeps its last value; idempotent |

## Behaviour

- Reads `matchMedia(query)` when called and listens for its `change` event.
- Inside a `component()` that a slot drops, it stops listening on unmount, and called in a Quiver 3.1+ page or layout function, when the page is left. Elsewhere, call `stop()` when done, or keep one instance in a module for the whole app (the [theme switcher](/recipes/theme-switcher) does this for `prefers-color-scheme`).
- Without `matchMedia` (a server, a test without a DOM), `matches()` is `false`.
