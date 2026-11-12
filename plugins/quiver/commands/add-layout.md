---
description: Add Quiver's layouts recipe (default and menu layouts) or scaffold a new layout in src/layouts/
argument-hint: <menu | layout-name>
---
Add a layout to this app: $ARGUMENTS

## Where things are

- **The app** is the folder with the app's `package.json`. In the Quiver repository itself the app is `starter/`; work there.
- **Recipes** are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/` at the root). `index.json` lists them; `README.md` there explains how to install one.

## Step 1: is it the layouts recipe?

If the argument is `menu`, `basic`, `layouts`, `MenuLayout` or `BasicLayout` (see the `layouts` entry and its `aliases` in `recipes/index.json`) and `src/layouts/menu.js` doesn't exist yet, install the `layouts` recipe:

1. Follow "Installing a recipe" in `recipes/README.md`: install `layouts` and everything it `requires` (`theme`, `link`, `toasts`, `theme-switcher`) by role, copying each path in a recipe's `files` to the place under `src/` it maps to and skipping recipes already present; rewrite the `../<recipe>/<file>.js` imports to the installed places; add `@go4cas/quiver` and `arrow-use` to the dependencies if missing; load the CSS in the documented order.
2. If `src/layouts/default.js` already exists, ask before replacing it, and offer to install only `menu.js` and `layouts.css`.
3. Follow the **Use** section of `recipes/layouts/README.md`. With `createApp(app, options)` and `quiver:app`, the layouts need no registration: add the `app` and `currentUser` keys to `src/app.config.js`, and offer to add `meta.nav: { label, order }` to the pages that belong in the menu. In a manual setup (`main.js` calls `initRouter()`), add `default` and `menu` to the `layouts` passed to `createApp()` and `provide()` the keys there instead.

If the recipe is already installed, say so and stop.

## Step 2: otherwise, scaffold a new layout

The file name is the layout name, in kebab-case (`sidebar`, `wide-card`): letters, digits and `-`. Pages pick it with `meta: { layout: '<name>' }`; `default` is the layout for pages that name none.

1. Create `src/layouts/<name>.js` with a default export. Check first whether `src/components/Toasts.js` exists.

   Without the toasts recipe, the layout is:

```js
import { html } from '@arrow-js/core'

/** @param {any} content  the rendered page */
export default function <Name>Layout(content) {
  return html`
    <div class="<name>-layout">
      <main class="<name>-layout__content">${content}</main>
    </div>
  `
}
```

   With the toasts recipe installed, add both the import and the mount, so `useToast()` works on pages in this layout; never one without the other:

```js
import { html } from '@arrow-js/core'
import { ToastContainer } from '../components/Toasts.js'

/** @param {any} content  the rendered page */
export default function <Name>Layout(content) {
  return html`
    <div class="<name>-layout">
      <main class="<name>-layout__content">${content}</main>
    </div>
    ${ToastContainer()}
  `
}
```

   - The layout gets the rendered page as `content`; render it as `${content}` (no `() =>`).
   - Read app-wide data with `inject(key, fallback)` from `@go4cas/quiver` (`inject('app', { name: 'App' })`); the keys come from `src/app.config.js`.
   - Arrow.js rules: `() =>` around values that change, no `<!-- -->` comments inside template literals.

2. Style it in `src/layouts/<name>.css` (the build ignores non-`.js` files there), imported from the app's CSS entry (before `effects.css`): `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` first, rules in `@layer quiver.components { … }`, `:where()` selectors, `--q-*` tokens only. Add `q-sidebar`, `q-header` and `q-panel` hook classes where the layout has a sidebar, a sticky header or panels.

3. With `quiver:app` there is nothing to register: the file is the layout. In a manual setup (`main.js` passes a `layouts` object to `createApp()`), import the default export there and add it under `'<name>'`.

## Step 3: verify and report

Run the app's checks and fix failures (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`). Report the files created or copied, the name for `export const meta = { layout: '<name>' }`, and any context keys the layout reads.
