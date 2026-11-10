---
description: Add a Quiver recipe component (toast, theme switcher, views, Link) or scaffold a new Arrow.js component
argument-hint: <recipe name or ComponentName>
---
Add a component to this app: $ARGUMENTS

## Where things are

- **The app** is the folder with the app's `package.json`. In the Quiver repository itself the app is `starter/`; work there.
- **Recipes** are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/` at the root). `index.json` lists them; `README.md` there explains how to install one.

## Step 1: is it a recipe?

Read `recipes/index.json` and compare the argument, case-insensitively, with each recipe key and its `aliases` (for example `toast`, `ToastContainer` and `useToast` all mean `toasts`; `ThemeToggle` means `theme-switcher`; `ErrorView` means `views`).

**If it matches**, install that recipe and stop there (don't also scaffold a component):

1. Read `recipes/README.md` ("Installing a recipe") and the recipe's own `README.md`, and follow them: copy the recipe and everything in its `requires` (recursively) into `src/quiver/<name>/`, copying only the paths in each recipe's `files` and skipping recipes already present; add missing `packages` to the app's dependencies; load each `css` file in the documented layer order (the app's CSS entry, or `<link>` tags in `index.html` when the app has no bundler); then wire it up as the recipe README's **Use** section says.
2. Copy the files as they are. They import each other as `../<name>/<file>.js`, so keep the folder names.
3. For the `theme` dependency: `tokens.css` is always loaded; load `base.css` unless the app already has its own reset; `effects.css` only alongside the theme switcher. If `<html>` has no `data-theme`/`data-mode` attributes and the app has no theme switcher, add `data-theme="default" data-mode="light"` to it so the tokens resolve.
4. Recipes with no Quiver import (`toasts`, `useForm`, `hmrState`) work in a plain Arrow app without Quiver's router: don't add `@go4cas/quiver` to such an app for them.

**If nothing matches**, scaffold a new component (Step 2).

## Step 2: scaffold a new component

The name is PascalCase (`PostCard`, `StatusBadge`); convert it if needed.

1. Create `src/components/<Name>.js`:

```js
import { html } from '@arrow-js/core'

/** @param {{ title: string }} props */
export function <Name>({ title }) {
  return html`
    <div class="<kebab-name>">
      <h2 class="<kebab-name>__title">${title}</h2>
    </div>
  `
}
```

   - Derive sensible props from the name and annotate them with JSDoc (strict `checkJs` fails on untyped props).
   - Arrow.js rules: wrap values that can change in `() =>` (`${() => state.count}`); no `<!-- -->` comments inside a template literal (put comments above it); use `aria-disabled` plus CSS for disabled states, never `.disabled="${…}"`; give components rendered in a loop a `.key(id)`.
   - Use `Link` from the link recipe (or a plain `<a href="${url(path)}">`) for navigation, never an `@click` that calls `go()`.

2. Style it in a sibling `src/components/<Name>.css`, and add an `@import` for it to the app's CSS entry (before the theme's `effects.css`, if the app loads it):

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.<kebab-name>) {
    padding: 1.25rem;
    border: 1px solid var(--q-color-line);
    border-radius: var(--q-radius-panel);
    background-color: var(--q-color-surface-raised);
    &[data-tone="error"] { color: var(--q-color-error); }
    @media (hover: hover) { &:hover { box-shadow: var(--q-shadow-float); } }
  }
}
```

   - Colours, radii, shadows and fonts only from `--q-*` tokens; spacing and sizes as `rem` literals; `translate`/`scale` properties, not `transform`; no `transition` on `button`, `a` or `input`.
   - Every selector inside `:where()`; variants and state as attributes (`data-tone`, `aria-pressed`, `aria-current`), never modifier classes; hover inside `@media (hover: hover)`.
   - Add the hook class `q-panel` to cards and panels and `q-accent` to brand-coloured text, so theme effects reach them.
   - If the app doesn't use the theme recipe (no `--q-*` tokens), follow the app's own styling conventions instead.

## Step 3: verify and report

Run the app's checks and fix failures. In the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`. Elsewhere, the app's own `typecheck`/`test` scripts if it has them.

Report the files created or copied, the lines added to the CSS entry or `index.html`, and a one-line usage example (`import { <Name> } from '../components/<Name>.js'`; there is no barrel file).
