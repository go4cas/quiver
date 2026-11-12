---
description: Add a visual theme (token blocks, optional effects, a theme switcher entry), installing Quiver's theme recipes if needed
argument-hint: <id> [— description]
---
Add a visual theme to this app: $ARGUMENTS

## Where things are

- **The app** is the folder with the app's `package.json`. In the Quiver repository itself the app is `starter/`; work there.
- **Recipes** are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/` at the root). `index.json` lists them; `README.md` there explains how to install one.

The argument is a theme id and an optional description (`ocean — cool blues, soft shadows`). With no id, or with `theme` itself, just install the `theme` recipe (Step 1) and stop.

## Step 1: make sure the recipes are there

The theme lives in the `theme` recipe (`src/styles/tokens.css`, `effects.css`) and is picked with the `theme-switcher` recipe (`src/components/ThemeSwitcher.js`). If either folder is missing, install it as "Installing a recipe" in `recipes/README.md` describes (copy the files, load the CSS in order, `theme-switcher` needs `arrow-use`), then mount `ThemeSelector()` and `ThemeToggle()` somewhere visible (the `layouts` recipe's `MenuLayout` already does).

## Step 2: token blocks in `src/styles/tokens.css`

Study the existing theme blocks (`[data-theme="mono"]`, `[data-theme="glass"]`, …) and add a light and a dark block for the new theme inside `@layer quiver.tokens { … }`:

```css
/* <Label>, light */
[data-theme="<id>"] {
  --q-color-surface: …;
  --q-color-brand: …;
  /* override the same token set the existing themes do */
}

/* <Label>, dark */
[data-theme="<id>"][data-mode="dark"] {
  …
}
```

Only set the `--q-*` contract tokens; never hard-code colours in components. Set `--q-color-on-brand` if white text is hard to read on the brand colour.

## Step 3: effects (optional)

If the theme needs what a token can't express (blur, glow, heading type, thicker borders), add a `[data-theme="<id>"]` block inside `@layer quiver.effects { … }` in `src/styles/effects.css`. Select only the hook classes (`:where(.q-panel)`, `.q-sidebar`, `.q-header`, `.q-accent`), `h1`–`h3`, `button` and `:focus-visible`, never component classes. Self-hosted fonts go in `src/styles/fonts/` with an `@font-face` at the top of the file.

## Step 4: register it in the switcher

Add one entry to `THEMES` in `src/components/ThemeSwitcher.js`:

```js
{ id: '<id>', label: '<Label>', swatch: '#<brand-hex>' },   // add swatchDark if the brand flips in dark mode
```

## Step 5: test and verify

If the app has a theme e2e test (the starter: `tests/e2e/theme.test.js`), add a case: selecting the new theme sets `data-theme="<id>"` on `<html>`. Run the app's checks (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`), then run the app and check light and dark mode.

In the Quiver repository, also add the id to `THEMES` in `starter/tests/visual/parity.test.js` and re-capture the screenshot baseline on CI (`starter/tests/visual/README.md`). Recipe files in the starter are copies: edit `recipes/` and run `bun run recipes:sync`.
