# Theming

Quiver's core renders no CSS. The look comes from the [`theme` recipe](/recipes/theme): a contract of 27 `--q-*` custom properties, a reset, and optional per-theme effects, all plain CSS in cascade layers. Every other recipe, and every component you write, reads only those tokens, so one attribute on `<html>` restyles the whole app.

The starter ships five themes, each in light and dark: **Default** (orange on slate), **Monochrome** (zero hue, sharp radii), **Liquid Glass** (frosted translucent panels), **Retro / Y2K** (neon on dark, scanlines) and **Neo Brutalism** (thick borders, offset shadows, no radius).

## How it works

Two independent attributes live on `<html>`:

```html
<html data-theme="glass" data-mode="dark">
```

- `data-theme`: `default`, `mono`, `glass`, `retro`, `brutalist`, or one you add
- `data-mode`: `light` or `dark`

`tokens.css` sets the defaults on `:root` and overrides a subset in `[data-theme="…"]`, `[data-mode="dark"]` and `[data-theme="…"][data-mode="dark"]` blocks.

## Switching theme and mode

The [`theme-switcher` recipe](/recipes/theme-switcher) holds the choice and writes the attributes:

```js
import { themeState, ThemeSelector, ThemeToggle } from './components/theme-switcher.js'

themeState.setTheme('glass')
themeState.setMode('dark')
themeState.toggleMode()
themeState.theme()     // 'glass'
themeState.mode()      // 'dark'

html`<header>${ThemeSelector()} ${ThemeToggle()}</header>`
```

The choice is stored in `localStorage` (`ui-theme`, `ui-mode`, plain strings) through `arrow-use`'s `useStorage`, so other tabs follow. Until the user picks a mode, the mode follows the system setting live. The starter's `index.html` has a small inline script that sets both attributes from storage before the first paint, so there is no flash of the default theme.

Without the switcher, set the attributes yourself: `<html data-theme="default" data-mode="light">`.

## The token contract

Use these in your CSS. Never hard-code a colour, or theme switching breaks for that component.

### Colours

| Token | Role |
|---|---|
| `--q-color-surface` | page background |
| `--q-color-surface-raised` | cards, sidebar, header |
| `--q-color-surface-inset` | inputs, chips, code |
| `--q-color-fg` | headings and body text |
| `--q-color-fg-soft` | secondary text |
| `--q-color-fg-faint` | placeholders, metadata |
| `--q-color-line` | default borders and dividers |
| `--q-color-line-strong` | emphasis borders |
| `--q-color-brand` | primary actions, accents |
| `--q-color-brand-hover` | hover on brand backgrounds |
| `--q-color-brand-tint` | tinted brand backgrounds (active nav item, badges) |
| `--q-color-on-brand` | text on a brand background |
| `--q-color-success`, `--q-color-error`, `--q-color-warning`, `--q-color-info` | status text and borders |
| `--q-color-success-tint`, `--q-color-error-tint`, `--q-color-warning-tint`, `--q-color-info-tint` | status backgrounds |

A soft status border mixes the colour with transparent: `border-color: color-mix(in oklab, var(--q-color-error) 30%, transparent)`.

### Shape, elevation, type

| Token | Role |
|---|---|
| `--q-radius-control` | buttons, inputs, badges |
| `--q-radius-panel` | cards, panels, dialogs |
| `--q-shadow-panel` | card elevation |
| `--q-shadow-float` | popovers, dropdowns, toasts |
| `--q-font-body` | body and UI text |
| `--q-font-display` | headings (changes per theme) |
| `--q-font-mono` | code and metadata |

Spacing, font sizes and durations are not tokens. Write them as `rem`, `em` and `ms` literals, so a theme that changes the root font size scales everything.

## Stylesheets and cascade layers

The app has one CSS entry (`src/style.css` in the starter). It declares the layer order first, then imports the files:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@import "./styles/tokens.css";     /* the token contract */
@import "./styles/base.css";       /* the reset; skip it if you have one */
@import "./components/toasts.css";    /* one line per recipe or component */
@import "./components/Badge.css";
@import "./styles/effects.css";    /* optional per-theme effects */
@import "./app.css";                     /* the app's own styles */
```

| Layer | Holds |
|---|---|
| `quiver.tokens` | `:root` tokens and the theme and mode overrides |
| `quiver.base` | the reset: box sizing, margins, form controls, focus ring, the shared button/link/input transition |
| `quiver.components` | recipe and component CSS |
| `quiver.effects` | what a token can't express: blur, glow, scanlines, heading type |

Later layers win, so theme effects beat component CSS. CSS outside any layer beats all of them without `!important`, and overriding a token on `:root` in unlayered CSS wins whatever the load order. Layer order is first-declaration order, so if your app has cascade layers of its own, declare the whole order once, before anything else loads, with `quiver` first (with Tailwind v4: `@layer theme, base, quiver, components, utilities;`, see [Using Tailwind](./tailwind)).

Without a bundler, use `<link rel="stylesheet">` tags in the same order, after a `<style>` with the layer statement.

## Theme effects and hook classes

`effects.css` never selects your elements by tag or class. It selects four hook classes, plus `<html>`, `h1`–`h3`, `button` and `:focus-visible`:

| Hook | Put it on | Used for |
|---|---|---|
| `q-panel` | cards, panels, toasts, dropdowns | glass blur and sheen, retro neon border, brutalist border |
| `q-sidebar` | a side navigation | glass blur, brutalist border |
| `q-header` | a sticky header | glass blur |
| `q-accent` | brand-coloured text | retro neon glow |

```html
<article class="ticket-card q-panel">…</article>
```

A tweak for one component in one theme goes in that component's CSS:

```css
[data-theme="brutalist"] :where(.btn)[data-variant="primary"] {
  border-width: 2px;
  border-color: var(--q-color-fg);
}
```

A dark-mode difference that isn't a colour nests `:where([data-mode="dark"]) &`:

```css
:where(.q-mode-toggle__thumb) {
  translate: 0.125rem 0;
  :where([data-mode="dark"]) & { translate: 1.25rem 0; }
}
```

## Adding a theme

`/add-theme ocean — cool blues, soft shadows` does all of this. By hand, in your installed copies:

1. Add a light and a dark block to `styles/tokens.css`, inside `@layer quiver.tokens`, overriding any subset of tokens:

   ```css
   [data-theme="ocean"] {
     --q-color-surface: oklch(97% 0.02 220);
     --q-color-brand: oklch(55% 0.18 220);
   }
   [data-theme="ocean"][data-mode="dark"] {
     --q-color-surface: oklch(15% 0.03 220);
     --q-color-brand: oklch(65% 0.18 220);
   }
   ```

2. Optionally add a `[data-theme="ocean"]` block to `styles/effects.css`, inside `@layer quiver.effects`, selecting only the hook classes.
3. Add `{ id: 'ocean', label: 'Ocean', swatch: '#0ea5e9' }` to `THEMES` in `components/theme-switcher.js` (`swatchDark` is optional).

In the Quiver repository, edit `recipes/` instead and run `bun run recipes:sync`.

## Browser floor

The recipe CSS uses native nesting and `color-mix()`: Chrome and Edge 112, Safari 16.5, Firefox 117. The router's own floor is higher ([browser support](./routing#browser-support)).
