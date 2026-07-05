# Quiver — AI agent context

This file is the single source of truth for AI assistants working in this repo. `CLAUDE.md` imports it for Claude Code; Codex and other AGENTS.md-aware tools read it directly. Edit conventions here, not in `CLAUDE.md`.

Quiver is an Arrow.js starter template with file-based routing, layouts, reactive state, composables, and a full testing setup. Stack: Arrow.js · Vite · Tailwind CSS v4 · Vitest · Playwright. The router is built on the Navigation API (modern browsers only).

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
├── utils/           # Pure helper functions (hmrState)
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
npm test              # Run unit tests once
npm run test:watch    # Run unit tests in watch mode
npm run test:e2e      # Run E2E tests (Playwright)
npm run typecheck     # Type-check src/ via JSDoc (tsc --noEmit, checkJs)
npm run build         # Production build
npm run docs:dev      # Start docs site locally
npm run docs:build    # Build docs site
```

Always run `npm run typecheck && npm test && npm run test:e2e` before completing a task.

## Types

The codebase is plain JavaScript typed via JSDoc, checked by `tsc` under `checkJs` + `strict` (see `jsconfig.json`). CI enforces a clean `npm run typecheck`. When adding code:

- Annotate exported functions with `@param`/`@returns`; use `@typedef` for shared shapes and `@template` for generics
- Reuse existing typedefs via import syntax: `/** @typedef {import('../state/userState.js').User} User */`
- Prefer a JSDoc cast `/** @type {X} */ (expr)` over restructuring code to satisfy the checker
- Do not convert files to TypeScript — the plain-JS + JSDoc setup is deliberate

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
- `useMeta` also accepts functions for reactive values: `` useMeta({ title: () => `Team (${userState.users.length})` }) `` — the router stops these watchers automatically on every navigation (see `src/pages/users/[id].js` for a working example)

### Navigation guards

`beforeEach(fn)` from `src/framework/router.js` registers a guard and returns an unregister function. The guard receives `{ from, to }`; return `false` to cancel, a path string to redirect, anything else to proceed. Guards also run on the initial page load with `from: null` — on first load, `false` redirects to `/` (there is no previous page to stay on).

```js
import { beforeEach } from './framework/router.js'

beforeEach(({ from, to }) => {
  if (to.startsWith('/admin') && !authState.loggedIn) return '/login'
})
```

Register guards in `main.js` before `initRouter()`.

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

Import components directly from their files (e.g. `import { MyCard } from '../components/MyCard.js'`) — there is no barrel file. Apply all Arrow.js rules above.

For local component state that should survive Vite hot reloads in dev, use `hmrState(key, initialState)` from `src/utils/hmrState.js`. The key must be unique per component instance on the page (derive it from a prop, e.g. `` `counter-${props.label}` ``) — duplicate keys silently link state between instances in dev mode.

### Composables

Call these inside a page or component function, never at module scope:

- `useRoute()` → `{ path(), params(), status(), meta() }` — reactive route accessors
- `useRouter()` → `{ go(path), back(), forward() }` — navigation
- `useForm(values, { validate, onSubmit })` → `{ form, handleSubmit, field(name) }` — form state; `validate` may be sync or async, return `{}` when valid or `{ fieldName: 'message' }` on errors; a thrown `onSubmit` error is caught and written to `form.message`
- `useFetch(url, options)` → `{ data(), loading(), error(), status(), refetch(), reset() }` — HTTP with reactive state; options: `{ immediate = true, transform, delay, ...fetchOptions }`; refetch aborts the previous in-flight request. **Use this for API calls — do not hand-roll fetch + loading/error state.**
- `useToast()` → `{ success(msg, opts), error(msg, opts), warning(msg, opts), info(msg, opts), dismiss(id) }` — **use this for user notifications — do not build ad-hoc banners.** Options per call: `{ duration, dismissible }`

### Toasts

`ToastContainer` is already mounted by the built-in layouts — calling `useToast()` from any page or component just works. Global defaults via `toastState.configure({ position, duration, dismissible })`; positions: `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`.

### Layouts

`meta.layout: 'menu'` (sidebar + header) or `'basic'` (centred card). Register new layouts in `src/layouts/index.js`.

### Theming

Two orthogonal attributes on `<html>`: `data-theme` (`default` · `mono` · `glass` · `retro` · `brutalist`) and `data-mode` (`light` · `dark`), both driven by `uiState` and persisted to localStorage. Components use semantic tokens (`bg-surface`, `text-fg`, `border-line`, `bg-brand`, `rounded-panel`, `shadow-panel`) — never hard-code colors, or theme switching breaks. Per-theme utility overrides via variants: `theme-glass:backdrop-blur-md`, `theme-brutalist:border-2`, etc.

To add a theme: token override blocks (light + dark) in `src/style.css`, an optional `@variant theme-<id>` line, and an entry in the `THEMES` array in `src/components/ThemeSelector.js`. See the Theming guide or the `/add-theme` command.

### Dependency injection

`provide(key, value)` in `main.js` before `createApp()`; `inject(key, fallback)` anywhere. The context is app-global — last `provide` for a key wins. Built-in keys:
- `'app'` — `{ name, tagline }` — used by `MenuLayout` sidebar
- `'currentUser'` — `{ name, email, avatar }` — used by `MenuLayout` header

---

## Testing

- Unit: Vitest in `tests/framework/` and `tests/composables/` — test pure functions with `describe`/`it`
- E2E: Playwright in `tests/e2e/` — test real browser flows; use `getByRole`, `getByLabel`, `getByTestId`
- Both suites must pass before a task is complete

---

## Scope

Fix bugs in `src/framework/`, improve tests, correct docs. Do not add app-specific features, backend/auth, or swap Arrow.js — those belong in a fork.
