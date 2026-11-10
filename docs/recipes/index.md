# Recipes

Recipes are the opinionated parts of Quiver: theme tokens, toasts, a theme switcher, layouts, loading and error views, `Link`, `useForm` and `hmrState`. They are not imported from a package. You copy them into your app, usually to `src/quiver/<name>/`, and from then on they are your code: change the markup, the CSS, the defaults.

They ship as plain files inside `@go4cas/quiver`, so the copy you make matches the core version you installed:

```
node_modules/@go4cas/quiver/recipes/
  index.json      the registry: each recipe's files, CSS order, dependencies, aliases
  README.md       how to install one
  <name>/         the files, plus a README
```

| Recipe | What it is | Command | Needs |
|---|---|---|---|
| [`theme`](./theme) | the `--q-*` token contract, the reset, optional per-theme effects and fonts | `/add-theme` | – |
| [`link`](./link) | `Link`: an anchor with `url()` and `aria-current` | `/add-component Link` | `@go4cas/quiver` |
| [`toasts`](./toasts) | `useToast()`, `toastState`, `ToastContainer` | `/add-component toast` | `theme` |
| [`theme-switcher`](./theme-switcher) | `themeState`, `ThemeSelector`, `ThemeToggle` | `/add-component ThemeToggle` | `theme`, `arrow-use` |
| [`useForm`](./useForm) | form state, validation and submit | `/add-composable useForm` | – |
| [`hmrState`](./hmrState) | component state that survives Vite hot reloads | `/add-composable hmrState` | – |
| [`layouts`](./layouts) | `BasicLayout`, `MenuLayout` and the `layouts` map | `/add-layout menu` | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver` |
| [`views`](./views) | `LoadingView`, `ErrorView` for `createApp()` | `/add-component views` | `theme`, `@go4cas/quiver` |

`toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so they work in a plain Arrow app without Quiver's router too. The starter has all eight in `src/quiver/`.

## Installing a recipe

The `/add-*` commands of the [Claude Code plugin](/guide/ai#the-claude-code-plugin) do this for you. By hand:

1. **Find it** in `node_modules/@go4cas/quiver/recipes/index.json`, by key or alias (`toast` → `toasts`, `ThemeToggle` → `theme-switcher`, `menu` → `layouts`).
2. **Collect what it needs**: follow `requires`, recursively, and skip recipes you already have.
3. **Copy** the paths in each recipe's `files` from `recipes/<name>/` to `src/quiver/<name>/` (a path ending in `/` is a folder). Not `tests/`, not the README. Keep the folder names: recipes import each other as `../<name>/<file>.js`.
4. **Install** the `packages` it lists that you don't have yet (`arrow-use` for the theme switcher; `@go4cas/quiver` for `link`, `layouts` and `views`).
5. **Load the CSS** from your CSS entry, in the order of each recipe's `css`, with the layer statement first. Recipe JS never imports CSS, so it runs with or without a bundler:

   ```css
   @layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
   @import "./quiver/theme/tokens.css";
   @import "./quiver/theme/base.css";       /* skip if you have your own reset */
   @import "./quiver/toasts/toasts.css";    /* one line per component recipe */
   @import "./quiver/theme/effects.css";    /* optional per-theme effects */
   @import "./app.css";                      /* your own CSS stays last */
   ```

   Without a bundler, use `<link rel="stylesheet">` tags in the same order.
6. **Wire it up** as the recipe's page shows (mount `ToastContainer()` once, pass `layouts` to `createApp()`, …).
7. **Check**: run your typecheck and tests.

## Updating a recipe

A recipe in your app doesn't change when you upgrade `@go4cas/quiver`. To pick up a newer version, diff your copy against `node_modules/@go4cas/quiver/recipes/<name>/` and merge what you want. The [CHANGELOG](https://github.com/go4cas/quiver/blob/main/CHANGELOG.md) says which recipes changed in each release.

## Writing CSS like a recipe

Recipe CSS is plain CSS in the `quiver.components` layer, every selector in `:where()`, state in attributes, values from `--q-*` tokens, and `q-`-prefixed class names. The [components guide](/guide/components#styling-a-component) has the rules; follow them in your own components and they'll theme the same way.
