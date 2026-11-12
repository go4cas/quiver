# Quiver recipes

Recipes are UI pieces and small helpers that you copy into your app and then own: a theme (tokens and reset), toasts, a theme switcher, layouts, loading and error views, `Link`, `useForm` and `hmrState`. They are not imported from a package, so you (or an agent) can edit them freely. They ship as plain files inside the `@go4cas/quiver` tarball, so the copy always matches the core version you installed:

```
node_modules/@go4cas/quiver/recipes/
  index.json          the registry: every recipe, its files, what it needs
  README.md           this file
  <name>/             one folder per recipe: JS, CSS, README.md
```

In the Quiver repository itself, the same files are at the root, in `recipes/`.

The `/add-*` commands of the Quiver Claude Code plugin copy them for you (`/add-component toast`, `/add-layout menu`, `/add-theme ocean`, `/add-composable useForm`). Without the plugin, follow the steps below by hand.

| Recipe | What it is | Needs |
|---|---|---|
| [`theme`](theme/README.md) | `tokens.css` (the `--q-*` contract), `base.css` (reset), optional `effects.css` and fonts | – |
| [`link`](link/README.md) | `Link`: an anchor with `url()` and `aria-current="page"` | `@go4cas/quiver` |
| [`toasts`](toasts/README.md) | `useToast()`, `toastState`, `ToastContainer` | `theme` |
| [`theme-switcher`](theme-switcher/README.md) | `themeState`, `ThemeSelector`, `ThemeToggle` | `theme`, `arrow-use` |
| [`useForm`](useForm/README.md) | form state, validation, submit | – |
| [`hmrState`](hmrState/README.md) | state that survives Vite hot reloads | – |
| [`layouts`](layouts/README.md) | `layouts/default.js` (a centred card), `layouts/menu.js` (sidebar + header) | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver` |
| [`views`](views/README.md) | `views/loading.js`, `views/error.js` | `theme`, `@go4cas/quiver` |

`toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so they also work in a plain Arrow app without Quiver's router.

## Installing a recipe

1. **Find the recipe.** Look the name up in `index.json`, case-insensitively, against each key and its `aliases` (`toast` → `toasts`, `ThemeToggle` → `theme-switcher`, `menu` → `layouts`).
2. **Collect what it needs.** Follow `requires` recursively. Skip recipes the app already has.
3. **Copy by role.** A recipe's `files` maps each file in `recipes/<name>/` to its place under the app's `src/`: `components/`, `composables/`, `layouts/`, `views/` or `styles/` (a path ending in `/` is a folder). Copy each one there, and nothing else: not `tests/`, and not the README, which stays here for reference. Skip a recipe whose files the app already has.
   **Then fix imports between recipes.** In this folder a recipe imports another as `../<recipe>/<file>.js`. Rewrite each to the path of that file's new place, relative to the importing file: in `src/layouts/menu.js`, `'../link/link.js'` becomes `'../components/link.js'`.
4. **Install packages** listed in `packages` that the app doesn't depend on yet (`@arrow-js/core` always; `arrow-use` for the theme switcher; `@go4cas/quiver` for `link`, `layouts`, `views`).
5. **Load the CSS.** Recipe JS never imports CSS (it must work without a bundler). Add each file in `css` to the app's CSS entry, in this order, with the layer statement first:

   ```css
   @layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
   @import "./styles/tokens.css";
   @import "./styles/base.css";          /* skip if the app has its own reset */
   @import "./components/toasts.css";       /* one line per component recipe */
   @import "./styles/effects.css";       /* optional: per-theme effects */
   @import "./app.css";                         /* the app's own CSS stays last */
   ```

   An app without a CSS entry (no bundler) uses `<link rel="stylesheet">` tags in the same order instead. `effects.css` matters only with the theme switcher. For `theme`, `tokens.css` is required; `base.css` is the reset, so leave it out when the app already has one.
6. **Wire it up.** Follow the recipe README's **Use** section (for example, mount `ToastContainer()` once).
7. **Check.** Run the app's typecheck and tests.

The rest of each recipe README says what it does, which `--q-*` tokens it reads, and what to edit.
