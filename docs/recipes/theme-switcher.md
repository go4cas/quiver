# theme-switcher

`themeState` (the chosen theme and light/dark mode, persisted), `ThemeSelector` (one swatch per theme) and `ThemeToggle` (light/dark). It sets `data-theme` and `data-mode` on `<html>`, which the [theme](./theme) recipe selects on.

| | |
|---|---|
| Command | `/add-component ThemeToggle` (aliases: `ThemeSelector`, `theme-switcher`, `dark-mode`, `mode-toggle`, …) |
| Copies | `theme-switcher.js`, `theme-switcher.css` → `src/quiver/theme-switcher/` |
| CSS order | after `tokens.css` and `base.css`, before `effects.css` |
| Needs | `theme`, `arrow-use` |
| Tokens | `--q-color-{brand,fg,line,surface-inset,surface-raised}` |

## Use

```js
// main.js: import early, so the stored theme is applied before anything renders
import './quiver/theme-switcher/theme-switcher.js'
```

```js
import { ThemeSelector, ThemeToggle, themeState } from '../quiver/theme-switcher/theme-switcher.js'

html`<header>${ThemeSelector()} ${ThemeToggle()}</header>`

themeState.theme()           // 'default'
themeState.mode()            // 'light' | 'dark'
themeState.setTheme('retro')
themeState.setMode('dark')
themeState.toggleMode()
```

To avoid a flash of the default theme before any module runs, set the attributes from a small inline script in `index.html`'s `<head>`:

```html
<script>
  var t = 'default', m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  try { t = localStorage.getItem('ui-theme') || t; m = localStorage.getItem('ui-mode') || m } catch (e) {}
  document.documentElement.dataset.theme = t
  document.documentElement.dataset.mode = m
</script>
```

## Behaviour

- The choice is stored in `localStorage` under `ui-theme` and `ui-mode`, as plain strings, through one shared [`useStorage`](/arrow-use/useStorage) per key, so every selector and toggle stays in sync, and so do other tabs.
- Until the user picks a mode, the mode follows the system setting live ([`useMediaQuery`](/arrow-use/useMediaQuery)), and nothing is written to storage.
- To add a theme, add `{ id, label, swatch, swatchDark? }` to `THEMES`, next to its token blocks in `tokens.css`. `/add-theme` does both.

Classes: `q-theme-select`, `q-theme-select__swatch` (`aria-pressed`, colour from the inline `--swatch` / `--swatch-dark`), `q-mode-toggle`, `q-mode-toggle__thumb`.
