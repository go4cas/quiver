# theme

The design tokens and reset every other recipe styles itself with, and the five built-in themes.

| | |
|---|---|
| Command | `/add-theme` (or `/add-component theme`; `/add-theme <id>` also adds a new theme) |
| Installs | `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/effects.css`, `src/styles/fonts/` |
| CSS order | `tokens.css`, `base.css`, … component recipes …, `effects.css` |
| Needs | nothing |

## What's in it

- **`tokens.css`**: the 27 `--q-*` tokens on `:root` (colours, radii, shadows, font stacks), and the `default`, `mono`, `glass`, `retro` and `brutalist` themes in light and dark, selected by `data-theme` and `data-mode` on `<html>`. Layer `quiver.tokens`.
- **`base.css`**: the reset: box sizing, `border: 0 solid`, form controls, the focus ring, and the shared transition on `button`, `a` and `input`. Layer `quiver.base`. Leave it out if your app has its own reset.
- **`effects.css`** (optional): what tokens can't express, per theme: glass blur, retro glow and scanlines, brutalist borders and button press, heading type, plus `@font-face` for the theme fonts. Layer `quiver.effects`. It selects only `<html>`, `h1`–`h3`, `button`, `:focus-visible` and the hook classes `q-panel`, `q-sidebar`, `q-header` and `q-accent`.
- **`fonts/`**: Orbitron, Space Grotesk and VT323 (latin woff2) with their OFL licences, used by `effects.css`.

## Use

```html
<html data-theme="default" data-mode="light">
```

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/effects.css";
```

Then use the tokens in your own CSS (`color: var(--q-color-fg-soft)`), and put `q-panel` on cards so the effects reach them. Set the attributes from the [theme switcher](./theme-switcher), or by hand.

Override a token for the whole app from unlayered CSS, whatever the load order:

```css
:root { --q-radius-panel: 0.25rem; }
```

## Tokens

All 27: `--q-color-{brand,brand-hover,brand-tint,on-brand,surface,surface-raised,surface-inset,fg,fg-soft,fg-faint,line,line-strong}`, `--q-color-{success,error,warning,info}` and each with `-tint`, `--q-radius-{control,panel}`, `--q-shadow-{panel,float}`, `--q-font-{body,display,mono}`. What each one is for: [Theming](/guide/theming#the-token-contract). Adding a theme: [Theming](/guide/theming#adding-a-theme).

Browser floor for the CSS (nesting, `color-mix()`): Chrome and Edge 112, Safari 16.5, Firefox 117.
