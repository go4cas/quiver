# theme

The design tokens and reset every other recipe styles itself with.

- `tokens.css`: the `--q-*` token contract (27 tokens: colours, radii, shadows, font stacks) and the five built-in themes (`default`, `mono`, `glass`, `retro`, `brutalist`), each in light and dark, selected by `data-theme` and `data-mode` on `<html>`.
- `base.css`: the reset (box sizing, `border: 0 solid`, form controls, focus ring, the shared `button`/`a`/`input` transition).
- `effects.css` (optional): per-theme effects that can't be tokens (glass blur, retro glow and scanlines, brutalist borders and press), plus `@font-face` for the theme fonts in `fonts/` (OFL, licences beside them).

Everything sits in the `quiver.tokens`, `quiver.base` and `quiver.effects` cascade layers, so any unlayered app CSS wins, and overriding a token on `:root` works whatever the load order.

## Install

`/add-theme` (or `/add-component theme`) copies `tokens.css`, `base.css`, `effects.css` and `fonts/` to `src/quiver/theme/`. Load them in this order (see "Installing a recipe" in the recipes README, `node_modules/@go4cas/quiver/recipes/README.md`):

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
@import "./quiver/theme/tokens.css";
@import "./quiver/theme/base.css";
/* component recipes here */
@import "./quiver/theme/effects.css";
```

Apps with their own reset skip `base.css`; recipes still render, but spacing and button chrome then follow the app's reset. Apps that use cascade layers of their own declare the order once, with `quiver` before their component and utility layers, e.g. `@layer theme, base, quiver, components, utilities;`.

## Use

Set the theme on `<html>`: `<html data-theme="default" data-mode="light">`. The [theme switcher](../theme-switcher/README.md) does this from a persisted user choice. Use tokens in your own CSS (`color: var(--q-color-fg-soft)`), never hard-coded colours, or theme switching breaks.

To add a theme, add a `[data-theme="<id>"]` block and a `[data-theme="<id>"][data-mode="dark"]` block to `tokens.css` overriding any subset of tokens, optional rules to `effects.css`, and one line to `THEMES` in the theme switcher. `/add-theme <name>` does all three.

Effects select only the hook classes `q-panel`, `q-sidebar`, `q-header` and `q-accent` (plus `<html>`, `h1`–`h3`, `button` and `:focus-visible`). Put `q-panel` on your cards and `q-accent` on brand-coloured text so the effects reach them.

Browser floor: native CSS nesting needs Chrome/Edge 112, Safari 16.5, Firefox 117.
