# Quiver — Claude Code context

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
npm test              # Run unit tests (Vitest)
npm run test:e2e      # Run E2E tests (Playwright)
npm run build         # Production build
npm run docs:dev      # Start docs site locally
npm run docs:build    # Build docs site
```

---

## Arrow.js rules — read these carefully

These are non-obvious and break silently if ignored.

### 1. Reactive slots must be arrow functions

Every `${}` interpolation that references changing state must be wrapped in `() =>`:

```js
// Correct — reactive, updates when user.name changes
html`<p>${() => user.name}</p>`

// Wrong — renders once, never updates
html`<p>${user.name}</p>`
```

Static values (strings, numbers that never change) do not need `() =>`.

### 2. Never use HTML comments inside templates

Arrow.js uses HTML comment nodes internally as slot markers. Adding `<!-- -->` inside `` html`...` `` collides with these markers and throws `Invalid HTML position`:

```js
// Throws — do not do this
html`
  <!-- user info -->
  <p>${() => user.name}</p>
`

// Fine — put comments outside the template literal
// user info
html`<p>${() => user.name}</p>`
```

### 3. `.disabled` is not a DOM property in Arrow.js

`.disabled="${...}"` sets a literal HTML attribute named `.disabled`, NOT the DOM `disabled` property. The button remains fully clickable:

```js
// Wrong — sets attribute ".disabled", button still fires click events
html`<button .disabled="${() => form.submitting}">Submit</button>`

// Correct — use aria-disabled + CSS classes
html`
  <button
    aria-disabled="${() => form.submitting ? 'true' : 'false'}"
    class="${() => form.submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}"
  >Submit</button>
`
```

### 4. Use `.key()` on components in loops

Without `.key()`, Arrow re-creates DOM nodes on every state change. Pass a stable unique value:

```js
html`${() => users.map(user => UserCard({ user }).key(user.id))}`
```

---

## Conventions

### Pages

Every `.js` file in `src/pages/` becomes a route automatically. Structure:

```js
import { html } from '@arrow-js/core'
import { useMeta } from '../framework/index.js'

export const meta = { layout: 'menu', title: 'My Page' }

function MyPage() {
  useMeta({ title: 'My Page' })
  return html`<div>...</div>`
}

export default MyPage
```

- `index.js` → `/` | `users/index.js` → `/users` | `users/[id].js` → `/users/:id`
- `not-found.js` handles 404
- Never pass params as arguments to the page function — use `useRoute()` inside it
- `meta.layout` defaults to `'basic'` if omitted

### State modules

Use `createStore(reactive)` from `src/framework/index.js`. Create at module scope, export as a singleton:

```js
import { createStore } from '../framework/index.js'

export const postState = createStore((reactive) => {
  const state = reactive({ posts: [] })
  return {
    get posts() { return state.posts },
    addPost(post) { state.posts.push({ ...post, id: crypto.randomUUID() }) },
    removePost(id) { state.posts = state.posts.filter(p => p.id !== id) },
  }
})
```

### Components

A component is a function that receives props and returns an Arrow template. Register in `src/components/index.js`:

```js
import { html } from '@arrow-js/core'

export function PostCard({ title, body }) {
  return html`
    <div class="card">
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
  `
}
```

Apply the Arrow.js rules above: reactive slots, no HTML comments, `aria-disabled` not `.disabled`.

### Composables

- `useRoute()` — returns `{ path(), params(), status(), meta() }` — reactive route accessors
- `useRouter()` — returns `{ go(path), back(), forward() }` — navigation
- `useForm(values, { validate, onSubmit })` — form state; must be called inside a page function, not at module scope

### Layouts

Set `meta.layout` to `'menu'` (sidebar + header) or `'basic'` (centred card). Register new layouts in `src/layouts/index.js`.

### Dependency injection

`provide(key, value)` in `main.js` before `createApp()`. `inject(key, fallback)` anywhere. Built-in keys:
- `'app'` — `{ name, tagline }` — used by `MenuLayout` sidebar
- `'currentUser'` — `{ name, email, avatar }` — used by `MenuLayout` header

---

## Testing

- Unit tests: `tests/framework/` and `tests/composables/` — Vitest, test pure function behaviour
- E2E tests: `tests/e2e/` — Playwright (Chromium), test real user flows in the browser
- Use role-based Playwright selectors: `getByRole`, `getByLabel`, `getByTestId`
- Add `data-testid` attributes to elements that have no semantic role
- Run both before any commit: `npm test -- --run && npm run test:e2e`

---

## What belongs in this repo

**Welcome:** bug fixes in `src/framework/`, improved test coverage, documentation corrections, tooling fixes.

**Not here:** app-specific pages, components, or state modules; backend or auth systems; swapping Arrow.js for another library. Those belong in a fork.
