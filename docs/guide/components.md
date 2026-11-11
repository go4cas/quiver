# Components

Components are plain Arrow.js. Quiver adds nothing to them: a component is a function that returns an `html` template, or a `component()` when it needs local state or cleanup. In the starter they live in `src/components/`, one file each, imported directly (there is no barrel file).

## Plain function or `component()`

```js
import { component, html } from '@arrow-js/core'

// A plain function: re-runs and patches in place. Fine for static markup.
export function Badge({ label }) {
  return html`<span class="badge">${label}</span>`
}

// component(): a stable instance per call site, local state, onCleanup().
export const Counter = component((props) => { /* … */ })
```

| Plain function | `component()` |
|---|---|
| returns a template | returns a factory; calling it gives an instance |
| patches in place | keeps its DOM node across re-renders |
| no lifecycle | `onCleanup()` runs on unmount |
| no local state | can hold `reactive()` state |

## Anatomy

The starter's `UserCard` reads props, writes to a global store and navigates:

```js
// src/components/UserCard.js
import { component, html } from '@arrow-js/core'
import { go } from '@go4cas/quiver'
import { userState } from '../state/userState.js'

export const UserCard = component((user) => html`
  <article class="card user-card q-panel">
    <img src="${user.avatar}" alt="" class="user-card__avatar" />
    <h3 class="user-card__name">${() => user.name}</h3>
    <span class="user-card__status" data-status="${() => user.status}">${() => user.status}</span>
    <button type="button" @click="${() => go(`/users/${user.id}`)}">View profile</button>
    <button type="button" @click="${() => userState.removeUser(user.id)}">Remove</button>
  </article>
`)
```

- **Props** are the factory's argument, a plain value. A prop that can change must be read inside a `() =>` slot; read bare, it is captured once.
- **`${() => user.name}`**: every slot that shows changing state is a function, or it renders once and never updates.
- **`data-status`**: state goes in attributes, and the CSS selects on them. No modifier classes.
- **`@click`**: handlers are functions on `@event` attributes. Write lower-case event names; Arrow 1.0.6 never fires camelCase ones.
- **`go()`** navigates from code. For a link, use `<a href="${url(path)}">` instead, so modifier clicks open a new tab.

## Local state and cleanup

```js
// src/components/Counter.js
import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../quiver/hmrState/hmrState.js'

export const Counter = component((props) => {
  const state = hmrState(`counter-${props.label}`, { count: 0 })

  const [, stopWatch] = watch(() => {
    if (state.count > 0 && state.count % 10 === 0) console.log(`milestone: ${state.count}`)
  })
  onCleanup(stopWatch)

  return html`
    <article class="card counter q-panel">
      <p class="counter__value">${() => state.count}</p>
      <button type="button" class="btn" data-variant="primary" @click="${() => state.count++}">Increment</button>
    </article>
  `
})
```

- [`hmrState(key, initial)`](/recipes/hmrState) is `reactive(initial)` that survives Vite hot reloads in dev. The key must be unique per instance on the page.
- `watch(fn)` runs `fn` and re-runs it when what it read changes; it returns `[value, stop]`.
- `onCleanup(stop)` runs when the component unmounts. A component nested inside a page's template may not; the page function itself always gets it ([why](./troubleshooting#cleanup-never-runs)).

## Lists

```js
html`${() => userState.users.map((user) => UserCard(user).key(user.id))}`
```

The outer `() =>` makes the list reactive; `.key()` lets Arrow keep each instance's DOM and state across changes. Use a stable id, never the index. In a keyed item, a slot that is sometimes a template must always be one: write ``` ${() => (cond ? html`<b>done</b>` : html``)} ```, not `: ''` ([why](./troubleshooting#a-list-stops-rendering-after-an-item-is-removed)).

## Styling a component

Each component has a CSS file beside it, imported from `src/style.css` (before `effects.css`). JS never imports CSS, so the same code runs with or without a bundler.

```css
/* src/components/Badge.css */
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.badge) {
    padding: 0.25rem 0.5rem;
    border-radius: var(--q-radius-control);
    background-color: var(--q-color-surface-inset);
    color: var(--q-color-fg-soft);

    &[data-tone="error"] {
      border: 1px solid color-mix(in oklab, var(--q-color-error) 30%, transparent);
      background-color: var(--q-color-error-tint);
      color: var(--q-color-error);
    }
    @media (hover: hover) { &:hover { color: var(--q-color-fg); } }
  }
}
```

```css
/* src/style.css */
@import "./components/Badge.css";
@import "./quiver/theme/effects.css";
```

- Every selector inside `:where()` (zero specificity), so one app class can override it.
- Variants and state as attributes (`data-tone`, `aria-current`, `aria-pressed`), not modifier classes.
- Colours, radii, shadows and fonts from `--q-*` tokens; spacing and sizes as `rem` literals; `translate` and `scale` properties instead of `transform`.
- No `transition` on `button`, `a` or `input`: the theme's `base.css` owns those.
- Add hook classes so theme effects reach your markup: `q-panel` on cards, `q-accent` on brand-coloured text.

The full token list and the theme rules are in [Theming](./theming).

## Arrow.js rules

These break silently, so they are worth knowing before you write a component:

1. Slots that show changing state are functions: `${() => user.name}`.
2. No HTML comments inside `html` templates; Arrow uses comments as slot markers (`Invalid HTML position`).
3. `.disabled="${…}"` sets an attribute literally named `.disabled`. Use `aria-disabled="${() => String(busy)}"` and style `[aria-disabled="true"]`.
4. `.key(id)` on components in a list.
5. A slot that is sometimes a template is always a template (``` html`` ```, not `''`).

[Troubleshooting](./troubleshooting) shows each failure and its fix.
