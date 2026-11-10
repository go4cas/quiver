# Using Tailwind

Quiver doesn't use Tailwind, and nothing in it needs Tailwind. If your app does, the two fit together: the recipes keep their plain CSS, and Tailwind's utilities can read the same `--q-*` tokens, so they follow the theme and mode too. This page assumes Tailwind CSS v4 with `@tailwindcss/vite`.

## Layer order

Tailwind v4 puts its CSS in the cascade layers `theme`, `base`, `components` and `utilities`. Quiver's recipes use `quiver.tokens`, `quiver.base`, `quiver.components` and `quiver.effects`. Layer order is the order layers are first declared, so declare all of them once, at the very top of your CSS entry, with `quiver` between Tailwind's base and its components:

```css
/* src/style.css */
@layer theme, base, quiver, components, utilities;

@import "tailwindcss";

@import "./quiver/theme/tokens.css";
@import "./quiver/toasts/toasts.css";
@import "./quiver/theme/effects.css";
```

Utilities then beat recipe CSS, so `class="q-toast p-6"` gets Tailwind's padding, and recipe CSS beats Tailwind's preflight.

**One reset.** Tailwind's preflight and the theme recipe's `base.css` do the same job. Keep preflight and leave `base.css` out, as above; recipes still render, with spacing and button chrome from preflight.

## Tokens as utilities

Map the tokens into Tailwind's theme with `@theme inline`, so each utility refers to the `var(--q-…)` itself and changes when `data-theme` or `data-mode` changes:

```css
@theme inline {
  --color-surface: var(--q-color-surface);
  --color-surface-raised: var(--q-color-surface-raised);
  --color-surface-inset: var(--q-color-surface-inset);
  --color-fg: var(--q-color-fg);
  --color-fg-soft: var(--q-color-fg-soft);
  --color-fg-faint: var(--q-color-fg-faint);
  --color-line: var(--q-color-line);
  --color-line-strong: var(--q-color-line-strong);
  --color-brand: var(--q-color-brand);
  --color-brand-hover: var(--q-color-brand-hover);
  --color-brand-tint: var(--q-color-brand-tint);
  --color-on-brand: var(--q-color-on-brand);
  --color-success: var(--q-color-success);
  --color-success-tint: var(--q-color-success-tint);
  --color-error: var(--q-color-error);
  --color-error-tint: var(--q-color-error-tint);
  --color-warning: var(--q-color-warning);
  --color-warning-tint: var(--q-color-warning-tint);
  --color-info: var(--q-color-info);
  --color-info-tint: var(--q-color-info-tint);

  --radius-control: var(--q-radius-control);
  --radius-panel: var(--q-radius-panel);
  --shadow-panel: var(--q-shadow-panel);
  --shadow-float: var(--q-shadow-float);
  --font-body: var(--q-font-body);
  --font-display: var(--q-font-display);
  --font-mono: var(--q-font-mono);
}
```

```js
html`
  <article class="rounded-panel bg-surface-raised p-5 shadow-panel q-panel">
    <h2 class="font-display text-fg">Revenue</h2>
    <p class="text-fg-soft">Up <span class="text-success">12%</span></p>
  </article>
`
```

Keep the hook classes (`q-panel`, `q-accent`, …) next to the utilities, so the theme effects still apply.

## Theme and mode variants

To style for a theme or the dark mode from markup, point variants at the attributes:

```css
@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));
@custom-variant theme-glass (&:where([data-theme="glass"], [data-theme="glass"] *));
@custom-variant theme-brutalist (&:where([data-theme="brutalist"], [data-theme="brutalist"] *));
```

```html
<div class="shadow-panel dark:shadow-none theme-brutalist:border-2">…</div>
```

Most of the time you won't need them: the tokens already change per theme and mode.

## Recipes stay plain CSS

Don't rewrite recipe markup with utilities. Recipes are shared with plain-CSS apps, `/add-*` copies them as they are, and their classes (`q-toast`, `q-menu__nav-link`, …) are what apps and tests select on. Style around them, or override a recipe class from unlayered CSS or the `utilities` layer.
