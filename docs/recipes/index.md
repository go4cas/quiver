# Recipes

Recipes are the opinionated parts of Quiver: theme tokens, toasts, a theme switcher, layouts, loading and error views, `Link`, `useForm` and `hmrState`. They are not imported from a package. You copy them into your app, each file into the folder for its role (`components/`, `composables/`, `layouts/`, `views/`, `styles/`), and from then on they are your code: change the markup, the CSS, the defaults.

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
| [`link`](./link) | `Link`: an anchor with `url()`, `aria-current` and `data-active` | `/add-component Link` | `@go4cas/quiver` |
| [`toasts`](./toasts) | `useToast()`, `toastState`, `ToastContainer` | `/add-component toast` | `theme` |
| [`theme-switcher`](./theme-switcher) | `themeState`, `ThemeSelector`, `ThemeToggle` | `/add-component ThemeToggle` | `theme`, `arrow-use` |
| [`useForm`](./useForm) | form state, validation and submit | `/add-composable useForm` | – |
| [`hmrState`](./hmrState) | component state that survives Vite hot reloads | `/add-composable hmrState` | – |
| [`layouts`](./layouts) | the default layout (a centred card) and the menu layout | `/add-layout menu` | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver` |
| [`views`](./views) | the loading and error views | `/add-component views` | `theme`, `@go4cas/quiver` |

`toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so they work in a plain Arrow app without Quiver's router too. The starter has all eight installed.

## Installing a recipe

The `/add-*` commands of the [Claude Code plugin](/guide/ai#the-claude-code-plugin) do this for you. By hand:

1. **Find it** in `node_modules/@go4cas/quiver/recipes/index.json`, by key or alias (`toast` → `toasts`, `ThemeToggle` → `theme-switcher`, `menu` → `layouts`).
2. **Collect what it needs**: follow `requires`, recursively. Keep every recipe in the set, even one you seem to have: step 3 decides file by file.
3. **Copy** each entry in the recipe's `files` whose destination doesn't exist yet: the key is the file in `recipes/<name>/`, the value is where it goes under `src/` (a path ending in `/` is a folder). For example, `Toasts.js` goes to `src/components/Toasts.js` and the layouts recipe's `menu.js` to `src/layouts/menu.js`. Don't copy `tests/` or the README, and never overwrite a file that is there (see [Existing files](#existing-files)).
4. **Fix imports between recipes.** In the repository a recipe imports another as `../<recipe>/<file>.js`. Point each one at where that file is now: `src/layouts/menu.js` imports `'../link/Link.js'`, which becomes `'../components/Link.js'`.
5. **Install** the `packages` each recipe in the set lists that you don't have yet (`arrow-use` for the theme switcher; `@go4cas/quiver` for `link`, `layouts` and `views`).
6. **Load the CSS** from your CSS entry, in the order of each recipe's `css` (at the places `files` gave them), with the layer statement first, adding only the lines you don't have. Recipe JS never imports CSS, so it runs with or without a bundler:

   ```css
   @layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
   @import "./styles/tokens.css";
   @import "./styles/base.css";       /* skip if you have your own reset */
   @import "./components/Toasts.css";    /* one line per component recipe */
   @import "./styles/effects.css";    /* optional per-theme effects */
   @import "./app.css";                      /* your own CSS stays last */
   ```

   Without a bundler, use `<link rel="stylesheet">` tags in the same order.
7. **Wire it up** as the recipe's page shows (mount `ToastContainer()` once, pick the menu layout with `meta.layout`, …). Layouts and views need no wiring: `quiver:app` finds them in their folders.
8. **Check**: run your typecheck and tests.

### Existing files

Everything under your `src/` is yours, including recipe files you copied earlier and edited, and files of your own that share a recipe file's name (a custom `layouts/default.js`). So no single file says a recipe is installed: look at every destination in its `files`.

| The destinations | Do this |
|---|---|
| none exist | Copy every file. |
| all exist | The recipe is installed: copy nothing, but still add its missing packages and CSS lines. |
| some exist | Copy only the missing files and keep the rest, so a custom `default.js` stays while `menu.js` and `layouts.css` are added. |

Replace an existing file only on purpose, after diffing it against the recipe's copy. When a copied file imports one you kept (`layouts/menu.js` imports `components/Link.js`), check the kept file still exports what the import uses. The `/add-*` commands follow the same rules and report which files they copied and which they kept.

## Updating a recipe

A recipe in your app doesn't change when you upgrade `@go4cas/quiver`. To pick up a newer version, diff your copy against `node_modules/@go4cas/quiver/recipes/<name>/` (the imports between recipes differ, as in step 4) and merge what you want. The [CHANGELOG](https://github.com/go4cas/quiver/blob/main/CHANGELOG.md) says which recipes changed in each release.

## Writing CSS like a recipe

Recipe CSS is plain CSS in the `quiver.components` layer, every selector in `:where()`, state in attributes, values from `--q-*` tokens, and `q-`-prefixed class names. The [components guide](/guide/components#styling-a-component) has the rules; follow them in your own components and they'll theme the same way.
