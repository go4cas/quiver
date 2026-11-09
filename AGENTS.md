# Quiver — AI agent context

This file is the single source of truth for AI assistants working in this repo. `CLAUDE.md` imports it for Claude Code; Codex and other AGENTS.md-aware tools read it directly. Edit conventions here, not in `CLAUDE.md`.

Quiver is an Arrow.js starter template with file-based routing, layouts, reactive state, composables, and a full testing setup. Stack: Arrow.js · Vite · plain CSS on a `--q-*` token contract · Vitest · Playwright. The router is built on the Navigation API (modern browsers only).

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
├── styles/          # Theme: tokens.css (contract), base.css (reset), effects.css, fonts/
├── app.css          # Starter page styles (plus Counter.css, UserCard.css beside their components)
├── style.css        # CSS entry: layer order + @imports — add each new stylesheet here
└── main.js          # App entry point — provide() global DI keys here

tests/
├── framework/       # Unit tests for framework utilities (Vitest)
├── composables/     # Unit tests for composables (Vitest)
├── repo/            # Repo-wide checks (Vitest)
├── e2e/             # End-to-end tests (Playwright)
└── visual/          # Screenshot parity, every page × 5 themes × 2 modes (Playwright)
```

---

## Commands

```
bun run dev           # Start Vite dev server
bun run test              # Run unit tests once
bun run test:watch    # Run unit tests in watch mode
bun run test:e2e      # Run E2E tests (Playwright)
bun run test:visual   # Screenshot parity — only matches inside the pinned Playwright image (tests/visual/README.md)
bun run typecheck     # Type-check src/ via JSDoc (tsc --noEmit, checkJs)
bun run build         # Production build
bun run docs:dev      # Start docs site locally
bun run docs:build    # Build docs site
```

Always run `bun run typecheck && bun run test && bun run test:e2e` before completing a task.

## Types

The codebase is plain JavaScript typed via JSDoc, checked by `tsc` under `checkJs` + `strict` (see `jsconfig.json`). CI enforces a clean `bun run typecheck`. When adding code:

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

3. **`.disabled` is not the DOM disabled property.** Writing `.disabled="${() => bool}"` sets a literal attribute named `.disabled` — the button remains clickable. Use `aria-disabled="true/false"` and style `[aria-disabled="true"]` in CSS (`opacity: 0.5; cursor: not-allowed`) instead.

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
import { reactive } from '@arrow-js/core'

export const myState = reactive({
  items: [],
  /** @param {{ name: string }} item */
  addItem(item) { this.items.push({ ...item, id: crypto.randomUUID() }) },
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

Style a component in a sibling `MyCard.css` and add an `@import` for it to `src/style.css` (before `effects.css`). JS never imports CSS:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.my-card) {
    padding: 1.25rem;
    border: 1px solid var(--q-color-line);
    border-radius: var(--q-radius-panel);
    background-color: var(--q-color-surface-raised);
    &[data-tone="error"] { color: var(--q-color-error); }
    @media (hover: hover) { &:hover { box-shadow: var(--q-shadow-float); } }
  }
}
```

- Every selector inside `:where()`; variants and state as attributes (`data-tone`, `aria-current`, `aria-pressed`), never modifier classes
- Colours, radii, shadows, fonts only from `--q-*` tokens; spacing and sizes as `rem` literals; transforms via `translate`/`scale` properties, not `transform`
- No `transition` on `button`, `a` or `input` (`base.css` owns it)
- Recipe-style classes (layouts, toasts, theme controls, views) use the `q-` prefix; starter app classes don't
- Add hook classes so theme effects apply: `q-panel` on cards/panels, `q-accent` on brand-coloured text, `q-sidebar`/`q-header` on layout chrome

For local component state that should survive Vite hot reloads in dev, use `hmrState(key, initialState)` from `src/utils/hmrState.js`. The key must be unique per component instance on the page (derive it from a prop, e.g. `` `counter-${props.label}` ``) — duplicate keys silently link state between instances in dev mode.

### Composables

Call these inside a page or component function, never at module scope:

- `useRoute()` → `{ path(), params(), status(), meta() }` — reactive route accessors
- `useRouter()` → `{ go(path), back(), forward() }` — navigation
- `useForm(values, { validate, onSubmit })` → `{ form, handleSubmit, field(name) }` — form state; `validate` may be sync or async, return `{}` when valid or `{ fieldName: 'message' }` on errors; a thrown `onSubmit` error is caught and written to `form.message`
- `useFetch(url, options)` → `{ data(), loading(), error(), status(), refetch(), reset() }` — HTTP with reactive state; options: `{ immediate = true, transform, ...fetchOptions }`; refetch aborts the previous in-flight request. **Use this for API calls — do not hand-roll fetch + loading/error state.**
- `useToast()` → `{ success(msg, opts), error(msg, opts), warning(msg, opts), info(msg, opts), dismiss(id) }` — **use this for user notifications — do not build ad-hoc banners.** Options per call: `{ duration, dismissible }`

### Toasts

`ToastContainer` is already mounted by the built-in layouts — calling `useToast()` from any page or component just works. Toasts render bottom-right; defaults (`duration: 4000`, `dismissible: true`) live in `toastState.add()`.

### Layouts

`meta.layout: 'menu'` (sidebar + header) or `'basic'` (centred card). Register new layouts in `src/layouts/index.js`.

### Theming

Two orthogonal attributes on `<html>`: `data-theme` (`default` · `mono` · `glass` · `retro` · `brutalist`) and `data-mode` (`light` · `dark`), both driven by `uiState` and persisted to localStorage.

- **Tokens** (`src/styles/tokens.css`, `@layer quiver.tokens`): the 27-token contract — `--q-color-{brand,brand-hover,brand-tint,on-brand,surface,surface-raised,surface-inset,fg,fg-soft,fg-faint,line,line-strong}`, status `--q-color-{success,error,warning,info}` each with `-tint`, `--q-radius-{control,panel}`, `--q-shadow-{panel,float}`, `--q-font-{body,display,mono}`. Themes override subsets in `[data-theme]` / `[data-mode]` blocks. Never hard-code colours, or theme switching breaks; soft status borders are `color-mix(in oklab, var(--q-color-error) 30%, transparent)`.
- **Layers**: `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` starts every stylesheet. Later layers win; unlayered app CSS beats all of them.
- **Effects** (`src/styles/effects.css`, `@layer quiver.effects`): per-theme blur, glow, scanlines, heading type and borders. They select only the hook classes `q-panel`, `q-sidebar`, `q-header`, `q-accent`, plus `<html>`, `h1`–`h3`, `button`, `:focus-visible`. A one-component tweak for one theme goes in that component's CSS: `[data-theme="brutalist"] :where(.btn)[data-variant="primary"] { … }`. Dark-mode non-colour differences nest `:where([data-mode="dark"]) &`.

To add a theme: token blocks (light + dark) in `src/styles/tokens.css`, optional effects in `src/styles/effects.css`, and an entry `{ id, label, swatch, swatchDark? }` in the `THEMES` array in `src/components/ThemeSelector.js`. See the Theming guide or the `/add-theme` command.

### Dependency injection

`provide(key, value)` in `main.js` before `createApp()`; `inject(key, fallback)` anywhere. The context is app-global — last `provide` for a key wins. Built-in keys:
- `'app'` — `{ name, tagline }` — used by `MenuLayout` sidebar
- `'currentUser'` — `{ name, email, avatar }` — used by `MenuLayout` header

---

## Testing

- Unit: Vitest in `tests/framework/` and `tests/composables/` — test pure functions with `describe`/`it`
- E2E: Playwright in `tests/e2e/` — test real browser flows; use `getByRole`, `getByLabel`, `getByTestId`
- Repo checks: Vitest in `tests/repo/` (SPEC R7: the old utility framework is gone from the repo)
- Visual: Playwright in `tests/visual/` compares every page state in 5 themes × 2 modes with the baseline in `tests/visual/__screenshots__/` (tolerance `threshold: 0.02`, `maxDiffPixelRatio: 0.0001`; never loosen it). The baseline only matches inside `mcr.microsoft.com/playwright:v<version>-noble`, so CI's `screenshots` job runs it there; re-capture an intended visual change by running the `Tests` workflow by hand with `update-screenshots` on your branch (see `tests/visual/README.md`)
- Unit and E2E must pass before a task is complete; the `screenshots` CI job must pass before merge

---

## Scope

Quiver is being refactored from a starter template into a drop-in library (v3). The plan, requirements and phases are in [`planning/v3/SPEC.md`](planning/v3/SPEC.md), with decisions recorded in [`planning/v3/DECISIONS.md`](planning/v3/DECISIONS.md), the CSS design (tokens, `base.css`, recipe CSS, screenshot parity) in [`planning/v3/DESIGN.md`](planning/v3/DESIGN.md), findings in [`planning/v3/NOTES.md`](planning/v3/NOTES.md), and final signatures, manifest and scanner formats, exports maps, workspace and CI layout in [`planning/v3/TECH-SPEC.md`](planning/v3/TECH-SPEC.md). Build PRs cite the TECH-SPEC rule IDs (`C-…`, `M-…`, `S-…`, `X-…`, `W-…`, `CI-…`, `U-…`) they implement. For v3 work, the spec is the source of truth, and the conventions above describe the 2.x code until each phase updates them.

In scope:

- The phases P0–P8 in the spec, one phase per branch and PR, in dependency order
- Bug fixes in the framework code, test improvements and doc corrections, as before

Out of scope (spec §2 non-goals): swapping Arrow.js, SSR/hydration, a plugin system (core has only `afterEach`/`onError` hooks), a Navigation API fallback, multiple Quiver apps on one page, and app-specific features or backend/auth (those belong in an app).

Stop and ask the maintainer before: public API changes beyond `planning/v3/TECH-SPEC.md`, scope additions, new dependencies, package renames, or anything touching npm, tags, releases or GitHub Pages. Never merge or push to `main`.
