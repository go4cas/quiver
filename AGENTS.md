# Quiver — Codex context

Quiver is an Arrow.js starter template with file-based routing, layouts, reactive state, composables, and a full testing setup. Stack: Arrow.js · Vite · Tailwind CSS v4 · Vitest · Playwright.

---

## Folder structure

```
src/
├── framework/       # Router, DI, store, app bootstrap — edit with care
├── pages/           # File-based routes — add your pages here
├── layouts/         # Page wrapper layouts — add layouts here
├── components/      # Reusable UI components — add components here
├── state/           # Global reactive state modules — add stores here
├── composables/     # Reusable logic functions — add composables here
├── utils/           # Pure helper functions
└── main.js          # App entry point — provide() global DI keys here

tests/
├── framework/       # Unit tests for framework utilities (Vitest)
├── composables/     # Unit tests for composables (Vitest)
└── e2e/             # End-to-end tests (Playwright)
```

---

## Commands

```
npm run dev           # Start Vite dev server
npm test -- --run     # Run unit tests once
npm run test:e2e      # Run E2E tests (Playwright)
npm run build         # Production build
```

Always run `npm test -- --run && npm run test:e2e` before completing a task.

---

## Arrow.js rules

These are non-obvious constraints. Violating them causes silent bugs or runtime errors.

1. **Reactive slots must be arrow functions.** Any `${}` interpolation referencing state that can change must be `() =>`:
   - Correct: `` html`<p>${() => user.name}</p>` ``
   - Wrong: `` html`<p>${user.name}</p>` `` (renders once, never updates)

2. **No HTML comments inside templates.** Arrow.js uses HTML comment nodes as internal slot markers. Adding `<!-- -->` inside `` html`...` `` throws `Invalid HTML position`. Put comments outside the template literal.

3. **`.disabled` is not the DOM disabled property.** Writing `.disabled="${() => bool}"` sets a literal attribute named `.disabled` — the button remains clickable. Use `aria-disabled="true/false"` plus CSS (`opacity-50 cursor-not-allowed`) instead.

4. **Use `.key()` on components in loops.** Without `.key(uniqueId)`, Arrow re-creates DOM nodes on every state change:
   - Correct: `` html`${() => items.map(i => Card({ i }).key(i.id))}` ``

---

## Conventions

### Pages

File `src/pages/path.js` → route `/path`. Structure:

```js
import { html } from '@arrow-js/core'
import { useMeta } from '../framework/index.js'

export const meta = { layout: 'menu', title: 'Page Title' }

function MyPage() {
  useMeta({ title: 'Page Title' })
  return html`<div>...</div>`
}

export default MyPage
```

- `[param].js` → dynamic segment; read params with `useRoute().params()` inside the function
- `not-found.js` handles 404

### State modules

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

Create at module scope; export as a singleton.

### Components

```js
import { html } from '@arrow-js/core'

export function MyCard({ title }) {
  return html`<div class="card"><h2>${title}</h2></div>`
}
```

Register in `src/components/index.js`. Apply all Arrow.js rules above.

### Composables

- `useRoute()` → `{ path(), params(), status(), meta() }`
- `useRouter()` → `{ go(path), back(), forward() }`
- `useForm(values, { validate, onSubmit })` — call inside page function only

### Layouts

`meta.layout: 'menu'` (sidebar + header) or `'basic'` (centred card). Register new layouts in `src/layouts/index.js`.

---

## Testing

- Unit: Vitest in `tests/framework/` and `tests/composables/` — test pure functions with `describe`/`it`
- E2E: Playwright in `tests/e2e/` — test real browser flows; use `getByRole`, `getByLabel`, `getByTestId`
- Both suites must pass before a task is complete

---

## Scope

Fix bugs in `src/framework/`, improve tests, correct docs. Do not add app-specific features, backend/auth, or swap Arrow.js — those belong in a fork.
