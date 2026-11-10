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
| [`layouts`](layouts/README.md) | `BasicLayout`, `MenuLayout`, the `layouts` map | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver` |
| [`views`](views/README.md) | `LoadingView`, `ErrorView` for `createApp()` | `theme`, `@go4cas/quiver` |

`toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so they also work in a plain Arrow app without Quiver's router.

## Installing a recipe

1. **Find the recipe.** Look the name up in `index.json`, case-insensitively, against each key and its `aliases` (`toast` → `toasts`, `ThemeToggle` → `theme-switcher`, `menu` → `layouts`).
2. **Collect what it needs.** Follow `requires` recursively. Skip recipes the app already has (their folder exists in the destination).
3. **Copy.** For each recipe, copy the paths in its `files` (a path ending in `/` is a folder) from `recipes/<name>/` to `<dest>/<name>/`, where `<dest>` is `src/quiver/` unless the app already keeps recipes elsewhere. Nothing else: not `tests/`, and not the README, which stays here for reference. Keep the folder names: recipes import each other as `../<name>/<file>.js`.
4. **Install packages** listed in `packages` that the app doesn't depend on yet (`@arrow-js/core` always; `arrow-use` for the theme switcher; `@go4cas/quiver` for `link`, `layouts`, `views`).
5. **Load the CSS.** Recipe JS never imports CSS (it must work without a bundler). Add each file in `css` to the app's CSS entry, in this order, with the layer statement first:

   ```css
   @layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
   @import "./quiver/theme/tokens.css";
   @import "./quiver/theme/base.css";          /* skip if the app has its own reset */
   @import "./quiver/toasts/toasts.css";       /* one line per component recipe */
   @import "./quiver/theme/effects.css";       /* optional: per-theme effects */
   @import "./app.css";                         /* the app's own CSS stays last */
   ```

   An app without a CSS entry (no bundler) uses `<link rel="stylesheet">` tags in the same order instead. `effects.css` matters only with the theme switcher. For `theme`, `tokens.css` is required; `base.css` is the reset, so leave it out when the app already has one.
6. **Wire it up.** Follow the recipe README's **Use** section (for example, mount `ToastContainer()` once).
7. **Check.** Run the app's typecheck and tests.

The rest of each recipe README says what it does, which `--q-*` tokens it reads, and what to edit.
