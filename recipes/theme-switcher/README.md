# theme-switcher

`themeState`, `ThemeSelector` (a swatch per theme) and `ThemeToggle` (light/dark). It sets `data-theme` and `data-mode` on `<html>`, which the [theme](../theme/README.md) recipe selects on.

The choice is kept in `localStorage` (`ui-theme`, `ui-mode`, plain strings) through **one** shared `useStorage` instance per key from `arrow-use`, so every selector and toggle on the page stays in sync. Until the user picks a mode, the mode follows the system setting live (`useMediaQuery('(prefers-color-scheme: dark)')`).

## Install

Copy `theme-switcher.js` and `theme-switcher.css` to `src/components/`, plus the `theme` recipe (with `effects.css` for the per-theme effects). Needs `arrow-use`.

## Use

```js
import { ThemeSelector, ThemeToggle, themeState } from '../components/theme-switcher.js'

html`<header>${ThemeSelector()} ${ThemeToggle()}</header>`

themeState.theme()          // 'default'
themeState.mode()           // 'light' | 'dark'
themeState.setTheme('retro')
themeState.toggleMode()
```

Importing the module applies the stored theme to `<html>` straight away, so import it early (from `main.js`). To avoid a flash of the default theme before any JS module runs, also set the attributes from a small inline `<script>` in `index.html`'s `<head>` that reads `ui-theme` and `ui-mode` from `localStorage` (the starter's `index.html` has one). To add a theme, add `{ id, label, swatch, swatchDark? }` to `THEMES`, next to its token blocks in `tokens.css`; `/add-theme` does both.

## Styling

Classes `q-theme-select`, `q-theme-select__swatch` (state `aria-pressed`, colour from the inline `--swatch` / `--swatch-dark`), `q-mode-toggle`, `q-mode-toggle__thumb`. Tokens: `--q-color-{brand,fg,line,surface-inset,surface-raised}`.
