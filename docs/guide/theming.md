# Theming

Quiver ships with five distinct visual themes, each supporting light and dark mode independently. Theme and mode are stored in `uiState` and persisted to `localStorage`.

---

## How it works

Two orthogonal attributes live on `<html>`:

```html
<html data-theme="default" data-mode="dark">
```

- `data-theme` — visual identity: `default` · `mono` · `glass` · `retro` · `brutalist`
- `data-mode` — brightness: `light` · `dark`

Tailwind's `@variant dark` targets `[data-mode=dark]`, so changing the mode switches the dark token set without affecting the theme.

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

## Semantic design tokens

All components use semantic CSS custom properties instead of palette utilities. Tokens are defined in `src/style.css` under `@theme` and overridden per theme and mode.

### Color tokens

| Token | Utility class | Role |
|---|---|---|
| `--color-surface` | `bg-surface` | Page background |
| `--color-surface-raised` | `bg-surface-raised` | Cards, sidebars, header |
| `--color-surface-inset` | `bg-surface-inset` | Input backgrounds, code blocks |
| `--color-fg` | `text-fg` | Headings and body copy |
| `--color-fg-soft` | `text-fg-soft` | Secondary labels |
| `--color-fg-faint` | `text-fg-faint` | Placeholder, disabled, metadata |
| `--color-line` | `border-line` | Default dividers |
| `--color-line-strong` | `border-line-strong` | Emphasis borders |
| `--color-brand` | `text-brand` / `bg-brand` | Primary action colour |
| `--color-brand-tint` | `bg-brand-tint` | Tinted badge backgrounds |

### Shape and shadow tokens

| Token | Utility | Role |
|---|---|---|
| `--radius-control` | `rounded-control` | Buttons, inputs, badges |
| `--radius-panel` | `rounded-panel` | Cards, modals, panels |
| `--shadow-panel` | `shadow-panel` | Card elevation |
| `--shadow-float` | `shadow-float` | Popover / dropdown elevation |

### Font tokens

| Token | Role |
|---|---|
| `--font-display` | Headings; varies by theme |
| `--font-ui` | Body / UI text |
| `--font-mono` | Code and metadata |

---

## Per-theme variant classes

Tailwind variants are registered for each non-default theme:

```
theme-glass:   [data-theme="glass"] &
theme-retro:   [data-theme="retro"] &
theme-mono:    [data-theme="mono"] &
theme-brutalist: [data-theme="brutalist"] &
```

Use these to apply theme-specific overrides directly in markup:

```js
html`
  <div class="rounded-panel border border-line bg-surface-raised shadow-panel
              theme-glass:backdrop-blur-md theme-brutalist:border-2">
    ...
  </div>
`
```

---

## Adding a new theme

1. Choose an identifier, e.g. `'ocean'`.
2. Add a token override block in `src/style.css`:

   ```css
   /* Ocean — light */
   [data-theme="ocean"] {
     --color-surface: oklch(97% 0.02 220);
     --color-brand: oklch(55% 0.18 220);
     /* …remaining tokens */
   }

   /* Ocean — dark */
   [data-theme="ocean"][data-mode="dark"] {
     --color-surface: oklch(15% 0.03 220);
     --color-brand: oklch(65% 0.18 220);
   }
   ```

   This matches the pattern the built-in themes use in `src/style.css`.

3. Register a Tailwind variant if you need per-theme utility overrides:

   ```css
   @variant theme-ocean (&:where([data-theme=ocean] *));
   ```

4. Add the theme to the `THEMES` array in `src/components/ThemeSelector.js`:

   ```js
   { id: 'ocean', label: 'Ocean', bg: 'bg-[#0ea5e9]' },
   ```

5. Add an entry point in the anti-flash script in `index.html` if the new identifier needs special handling (usually not required).
