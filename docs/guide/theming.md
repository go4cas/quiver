# Theming

Quiver ships with five distinct visual themes, written in plain CSS against a token contract,, each supporting light and dark mode independently. Theme and mode are stored in `uiState` and persisted to `localStorage`.

---

## How it works

Two orthogonal attributes live on `<html>`:

```html
<html data-theme="default" data-mode="dark">
```

- `data-theme` — visual identity: `default` · `mono` · `glass` · `retro` · `brutalist`
- `data-mode` — brightness: `light` · `dark`

Token blocks select `[data-mode="dark"]` and `[data-theme="…"]`, so changing the mode switches the dark token set without affecting the theme.

An inline script in `index.html` reads both values from `localStorage` before any CSS or JavaScript loads, preventing a flash of the wrong theme on page load.

---

## The five themes

### Default

Orange brand, slate neutrals. The original Quiver look. No visual change from before the theming system was added.

### Monochrome

Zero hue. Pure white/black surfaces, near-black/white text, black/white brand. Tight letter-spacing on headings, sharp radii, minimal shadows. Inspired by shadcn/ui.

### Liquid Glass

Apple-inspired frosted glass. `backdrop-filter: blur(20px) saturate(160%)` on panels and cards with a translucent surface colour. Soft violet brand, large radii, diffuse shadows. Requires a background behind cards to be visible — the page background gradient provides this.

### Retro / Y2K

1980s arcade aesthetic. VT323 monospace font, hot-pink brand, neon text-shadows on headings, neon box-shadows on panels. A full-screen scanline overlay (`html::after`) adds the CRT monitor effect. Dark variant deepens to near-black with electric-pink neon.

### Neo Brutalism

High-contrast editorial. Space Grotesk 900-weight headings in all-caps. Solid `3px` borders on panels, yellow brand, offset drop-shadow (`4px 4px 0`). Buttons snap on press (`translate(2px, 2px)` with shrunk shadow). Zero border-radius throughout.

---

## Changing theme or mode

Mutate `uiState.theme` or `uiState.mode` directly:

```js
import { uiState } from '../state/uiState.js'

uiState.theme = 'glass'    // switch visual identity
uiState.mode  = 'dark'     // switch brightness
```

The `watch()` in `uiState.js` syncs both values to `data-theme`/`data-mode` on `<html>` and writes them to `localStorage` automatically.

The built-in UI provides:
- **`ThemeSelector`** — five swatch buttons in the `MenuLayout` header; sets `uiState.theme`
- **`ThemeToggle`** — pill toggle in the `MenuLayout` header; flips `uiState.mode`

---

## The token contract

Every colour, radius, shadow and font stack a component uses is a `--q-*` custom property. The contract (27 tokens) lives in `src/styles/tokens.css`: the defaults on `:root`, then one override block per theme and mode. Component CSS reads only these tokens, so a component styled with them works in all five themes, light and dark.

### Colour tokens

| Token | Role |
|---|---|
| `--q-color-surface` | Page background |
| `--q-color-surface-raised` | Cards, sidebars, header |
| `--q-color-surface-inset` | Input backgrounds, chips, code blocks |
| `--q-color-fg` | Headings and body copy |
| `--q-color-fg-soft` | Secondary labels |
| `--q-color-fg-faint` | Placeholder, disabled, metadata |
| `--q-color-line` | Default dividers and borders |
| `--q-color-line-strong` | Emphasis borders |
| `--q-color-brand` · `--q-color-brand-hover` | Primary action colour and its hover |
| `--q-color-brand-tint` | Tinted badge backgrounds |
| `--q-color-on-brand` | Text on a brand background |
| `--q-color-success` · `-error` · `-warning` · `-info` | Status text and borders |
| `--q-color-success-tint` · `-error-tint` · `-warning-tint` · `-info-tint` | Status backgrounds (toasts, alerts, badges) |

For a soft status border, mix the colour with transparent: `border-color: color-mix(in oklab, var(--q-color-error) 30%, transparent)`.

### Shape, shadow and font tokens

| Token | Role |
|---|---|
| `--q-radius-control` | Buttons, inputs, badges |
| `--q-radius-panel` | Cards, modals, panels |
| `--q-shadow-panel` | Card elevation |
| `--q-shadow-float` | Popover / dropdown elevation |
| `--q-font-body` | Body / UI text |
| `--q-font-display` | Headings; varies by theme |
| `--q-font-mono` | Code and metadata |

Spacing, type sizes and durations are not tokens: component CSS writes them as `rem`, `em` and `ms` literals, so mono's and retro's root font size still scale everything.

---

## Stylesheets and cascade layers

`src/style.css` is the CSS entry. It declares the layer order once, then imports the files:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
@import "./styles/tokens.css";    /* the token contract */
@import "./styles/base.css";      /* the reset */
@import "./components/ToastContainer.css";   /* one line per component */
@import "./styles/effects.css";   /* per-theme effects (optional) */
@import "./app.css";              /* the app's own styles */
```

| Layer | Holds |
|---|---|
| `quiver.tokens` | `:root` tokens and the `[data-theme]` / `[data-mode]` overrides |
| `quiver.base` | the reset (`box-sizing`, margins, form controls, smoothing) |
| `quiver.components` | component CSS, including the starter's own |
| `quiver.effects` | theme effects that can't be tokens: blur, glow, scanlines, heading type |

Later layers win, so theme effects always beat component CSS. Any CSS outside a layer beats all of them without `!important`, and overriding a `--q-*` token on `:root` in unlayered CSS wins whatever the load order. If your app uses its own cascade layers, declare the order once before anything else loads, with `quiver` before your layers (with Tailwind v4: `@layer theme, base, quiver, components, utilities;`).

Component CSS follows a few rules: every selector is wrapped in `:where()` (zero specificity, so one app class overrides it), state and variants are attributes (`aria-current`, `aria-pressed`, `data-type`, `data-tone`) rather than modifier classes, and hover sits inside `@media (hover: hover)`.

---

## Theme effects and hook classes

`src/styles/effects.css` holds what a token can't express. It never selects app elements by tag or class name; it selects four hook classes, plus `<html>`, `h1`–`h3`, `button` and `:focus-visible`:

| Hook | Put it on | Effects that use it |
|---|---|---|
| `q-panel` | cards, panels, toasts, dropdowns, alerts | glass blur and sheen, retro neon border, brutalist 3px border |
| `q-sidebar` | the menu sidebar | glass blur, brutalist border |
| `q-header` | the sticky header | glass blur |
| `q-accent` | brand-coloured text | retro neon glow |

Add the hook next to the element's own class: `<article class="card q-panel">`.

A tweak to one component in one theme lives in that component's CSS:

```css
[data-theme="brutalist"] :where(.btn)[data-variant="primary"] {
  border-width: 2px;
  border-color: var(--q-color-fg);
}
```

For a dark-mode difference that isn't a colour, nest `:where([data-mode="dark"]) &` inside the block (zero specificity), as `ThemeToggle.css` does for the knob position.

---

## Adding a new theme

1. Choose an identifier, e.g. `'ocean'`.
2. Add token override blocks to `src/styles/tokens.css`, inside `@layer quiver.tokens`:

   ```css
   /* Ocean — light */
   [data-theme="ocean"] {
     --q-color-surface: oklch(97% 0.02 220);
     --q-color-brand: oklch(55% 0.18 220);
     /* …any other tokens */
   }

   /* Ocean — dark */
   [data-theme="ocean"][data-mode="dark"] {
     --q-color-surface: oklch(15% 0.03 220);
     --q-color-brand: oklch(65% 0.18 220);
   }
   ```

3. If the theme needs effects a token can't express, add a `[data-theme="ocean"]` block to `src/styles/effects.css`, inside `@layer quiver.effects`, selecting the hook classes.

4. Add the theme to the `THEMES` array in `src/components/ThemeSelector.js` (`swatchDark` is optional):

   ```js
   { id: 'ocean', label: 'Ocean', swatch: '#0ea5e9' },
   ```

5. Add an entry point in the anti-flash script in `index.html` if the new identifier needs special handling (usually not required).
