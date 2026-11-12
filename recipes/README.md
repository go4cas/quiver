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
| [`link`](link/README.md) | `Link`: an anchor with `url()`, `aria-current="page"` on the current page and `data-active` on its section | `@go4cas/quiver` |
| [`toasts`](toasts/README.md) | `useToast()`, `toastState`, `ToastContainer` | `theme` |
| [`theme-switcher`](theme-switcher/README.md) | `themeState`, `ThemeSelector`, `ThemeToggle` | `theme`, `arrow-use` |
| [`useForm`](useForm/README.md) | form state, validation, submit | – |
| [`hmrState`](hmrState/README.md) | state that survives Vite hot reloads | – |
| [`layouts`](layouts/README.md) | `layouts/default.js` (a centred card), `layouts/menu.js` (sidebar + header) | `theme`, `link`, `toasts`, `theme-switcher`, `@go4cas/quiver` |
| [`views`](views/README.md) | `views/loading.js`, `views/error.js` | `theme`, `@go4cas/quiver` |

`toasts`, `useForm` and `hmrState` import only `@arrow-js/core`, so they also work in a plain Arrow app without Quiver's router.

## Installing a recipe

1. **Find the recipe.** Look the name up in `index.json`, case-insensitively, against each key and its `aliases` (`toast` → `toasts`, `ThemeToggle` → `theme-switcher`, `menu` → `layouts`).
2. **Collect what it needs.** Follow `requires` recursively. Keep every recipe in the set, even ones the app seems to have: step 3 decides file by file what to copy.
3. **Copy by role.** A recipe's `files` maps each file in `recipes/<name>/` to its place under the app's `src/`: `components/`, `composables/`, `layouts/`, `views/` or `styles/` (a path ending in `/` is a folder). Copy each one there, and nothing else: not `tests/`, and not the README, which stays here for reference. Never overwrite a file that is already there: see [Existing files](#existing-files) below.
   **Then fix imports between recipes.** In this folder a recipe imports another as `../<recipe>/<file>.js`. Rewrite each to the path of that file's new place, relative to the importing file: in `src/layouts/menu.js`, `'../link/Link.js'` becomes `'../components/Link.js'`.
4. **Install packages** listed in `packages` that the app doesn't depend on yet, for every recipe in the set, whether its files were copied now or were there already (`@arrow-js/core` always; `arrow-use` for the theme switcher; `@go4cas/quiver` for `link`, `layouts`, `views`).
5. **Load the CSS.** Recipe JS never imports CSS (it must work without a bundler). Add each file in `css` to the app's CSS entry, in this order, with the layer statement first; add only the lines that are missing, for every recipe in the set:

   ```css
   @layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
   @import "./styles/tokens.css";
   @import "./styles/base.css";          /* skip if the app has its own reset */
   @import "./components/Toasts.css";       /* one line per component recipe */
   @import "./styles/effects.css";       /* optional: per-theme effects */
   @import "./app.css";                         /* the app's own CSS stays last */
   ```

   An app without a CSS entry (no bundler) uses `<link rel="stylesheet">` tags in the same order instead. `effects.css` matters only with the theme switcher. For `theme`, `tokens.css` is required; `base.css` is the reset, so leave it out when the app already has one.
6. **Wire it up.** Follow the recipe README's **Use** section (for example, mount `ToastContainer()` once).
7. **Check.** Run the app's typecheck and tests, then report which files were copied and which existing files were kept.

### Existing files

The app owns every file under its `src/`, including recipe files it copied earlier and may have edited, and app files that happen to share a recipe file's name (a custom `layouts/default.js`, `views/error.js` or `components/Link.js`). So the destinations in `index.json`, not one marker file, decide what is installed (audit R32-11, N222). For each recipe in the set, look at every destination in its `files` (for a folder such as `styles/fonts/`, at each file inside it):

| The destinations | The recipe is | Do this |
|---|---|---|
| none exist | not installed | Copy every file. |
| all exist | installed | Copy nothing. Still do steps 4 and 5 for it, which add only what is missing. |
| some exist | partly installed | Copy only the missing files. Keep the existing ones as they are. |

- **Never replace an existing file on your own.** Keep it, and list it in the report. Replace it only when the app's owner asks for that file to be replaced, after showing them how it differs from the recipe's copy.
- **A kept file may not be the recipe's.** When a copied file imports a kept one (`layouts/menu.js` imports `components/Link.js`), check that the kept file still exports the names the import uses (`Link`). If it doesn't, leave both files as they are and report the mismatch, so the owner decides.
- **The same rules hold for the `/add-*` commands**, which follow this procedure.

The rest of each recipe README says what it does, which `--q-*` tokens it reads, and what to edit.
