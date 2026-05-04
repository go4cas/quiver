# Quiver — GitHub Copilot instructions

Quiver is an Arrow.js starter template. Stack: Arrow.js · Vite · Tailwind CSS v4 · Vitest · Playwright.

## Arrow.js rules

- **Reactive slots must be arrow functions.** Use `${() => value}` for any interpolation that references state. Static values don't need `() =>`.
- **No HTML comments inside templates.** Never write `<!-- -->` inside `` html`...` `` — Arrow.js uses comment nodes as slot markers and this throws `Invalid HTML position`.
- **`.disabled` is not DOM disabled.** `.disabled="${() => bool}"` sets a literal attribute named `.disabled`. Use `aria-disabled="true/false"` + CSS (`opacity-50 cursor-not-allowed`) instead.
- **Use `.key()` in loops.** `` items.map(i => Card(i).key(i.id)) `` — prevents DOM re-creation on state changes.

## Patterns

**Page** (`src/pages/path.js`):
```js
import { html } from '@arrow-js/core'
import { useMeta } from '../framework/index.js'
export const meta = { layout: 'menu', title: 'Title' }
function MyPage() {
  useMeta({ title: 'Title' })
  return html`<div>...</div>`
}
export default MyPage
```

**State module** (`src/state/myState.js`):
```js
import { createStore } from '../framework/index.js'
export const myState = createStore((reactive) => {
  const state = reactive({ items: [] })
  return {
    get items() { return state.items },
    addItem(item) { state.items.push({ ...item, id: crypto.randomUUID() }) },
  }
})
```

**Component** (`src/components/MyCard.js`):
```js
import { html } from '@arrow-js/core'
export function MyCard({ title }) {
  return html`<div>${title}</div>`
}
```
Register in `src/components/index.js`.

## File-based routing

- `src/pages/index.js` → `/`
- `src/pages/users/index.js` → `/users`
- `src/pages/users/[id].js` → `/users/:id` (read with `useRoute().params()`)
- `src/pages/not-found.js` → 404 handler

## Composables

- `useRoute()` → `{ path(), params(), status(), meta() }`
- `useRouter()` → `{ go(path), back(), forward() }`
- `useForm(values, { validate, onSubmit })` — call inside page function, not module scope

## Testing

- Unit: Vitest in `tests/framework/` and `tests/composables/`
- E2E: Playwright in `tests/e2e/` — use `getByRole`, `getByLabel`, `data-testid`
- Run: `npm test -- --run && npm run test:e2e`
