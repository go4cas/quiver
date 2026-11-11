---
description: Add Quiver's layouts recipe (menu, basic) or scaffold a new layout and register it
argument-hint: <menu | basic | LayoutName>
---
Add a layout to this app: $ARGUMENTS

## Where things are

- **The app** is the folder with the app's `package.json`. In the Quiver repository itself the app is `starter/`; work there.
- **Recipes** are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/` at the root). `index.json` lists them; `README.md` there explains how to install one.

## Step 1: is it the layouts recipe?

If the argument is `menu`, `basic`, `layouts`, `MenuLayout` or `BasicLayout` (see the `layouts` entry and its `aliases` in `recipes/index.json`) and `src/quiver/layouts/` doesn't exist yet, install the `layouts` recipe:

1. Follow "Installing a recipe" in `recipes/README.md`: copy `layouts` and everything it `requires` (`theme`, `link`, `toasts`, `theme-switcher`) to `src/quiver/<name>/`, copying only the paths in each recipe's `files` and skipping recipes already present; add `@go4cas/quiver` and `arrow-use` to the dependencies if missing; load the CSS in the documented order.
2. Follow the **Use** section of `recipes/layouts/README.md`: pass `layouts` to `createApp()`, and `provide()` the `'app'`, `'nav'` and `'currentUser'` keys in `main.js` before `initRouter()`.

If the recipe is already installed, say so and stop.

## Step 2: otherwise, scaffold a new layout

Normalise the name to PascalCase with a `Layout` suffix (`sidebar` → `SidebarLayout`); the registration key is the lowercase base name (`sidebar`).

1. Create `src/layouts/<Name>.js`. Check first whether `src/quiver/toasts/toasts.js` exists.

   Without the toasts recipe, the layout is:

```js
import { html } from '@arrow-js/core'

/** @param {any} content  the rendered page */
export function <Name>(content) {
  return html`
    <div class="<key>-layout">
      <main class="<key>-layout__content">${content}</main>
    </div>
  `
}
```

   With the toasts recipe installed, add both the import and the mount, so `useToast()` works on pages in this layout; never one without the other:

```js
import { html } from '@arrow-js/core'
import { ToastContainer } from '../quiver/toasts/toasts.js'

/** @param {any} content  the rendered page */
export function <Name>(content) {
  return html`
    <div class="<key>-layout">
      <main class="<key>-layout__content">${content}</main>
    </div>
    ${ToastContainer()}
  `
}
```

   - The layout gets the rendered page as `content`; render it as `${content}` (no `() =>`).
   - Read app-wide data with `inject(key, fallback)` from `@go4cas/quiver` (`inject('app', { name: 'App' })`), never module imports of `main.js`.
   - Arrow.js rules: `() =>` around values that change, no `<!-- -->` comments inside template literals.

2. Style it in `src/layouts/<Name>.css`, imported from the app's CSS entry (before `effects.css`): `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` first, rules in `@layer quiver.components { … }`, `:where()` selectors, `--q-*` tokens only. Add `q-sidebar`, `q-header` and `q-panel` hook classes where the layout has a sidebar, a sticky header or panels.

3. Register it where the app builds the `layouts` object passed to `createApp()` (the starter: `src/layouts/index.js`):

```js
import { <Name> } from './<Name>.js'
export const layouts = { ...recipeLayouts, <key>: <Name> }
```

## Step 3: verify and report

Run the app's checks and fix failures (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`). Report the files created or copied, the key for `export const meta = { layout: '<key>' }`, and any `provide()` keys the layout reads.
