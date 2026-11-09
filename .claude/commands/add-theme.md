Add a new visual theme to this Quiver app: $ARGUMENTS

The argument is a theme identifier and optional description (e.g. `ocean — cool blues, soft shadows`, `terminal — green-on-black hacker aesthetic`).

Follow this process:

## Step 1 — Token override blocks in `src/styles/tokens.css`

Study the existing theme blocks (`[data-theme="mono"]`, `[data-theme="glass"]`, etc.) to see which `--q-*` tokens a theme overrides. Add a light and a dark block for the new theme inside `@layer quiver.tokens { … }`:

```css
/* <Label> — light */
[data-theme="<id>"] {
  --q-color-surface: ...;
  --q-color-brand: ...;
  /* override the same token set the existing themes do */
}

/* <Label> — dark */
[data-theme="<id>"][data-mode="dark"] {
  ...
}
```

Only override semantic tokens — never introduce new hard-coded colors in components.

Set `--q-color-on-brand` too if white text is hard to read on the theme's brand colour.

## Step 2 — Theme effects (optional)

If the theme needs effects a token can't express (blur, glow, heading type, thicker borders), add a `[data-theme="<id>"]` block inside `@layer quiver.effects { … }` in `src/styles/effects.css`. Select only the hook classes (`:where(.q-panel)`, `.q-sidebar`, `.q-header`, `.q-accent`), `h1`–`h3`, `button` and `:focus-visible`, never component classes. Self-hosted fonts go beside it in `src/styles/fonts/` with an `@font-face` at the top of the file.

## Step 3 — Register in the ThemeSelector

Add an entry to the `THEMES` array in `src/components/ThemeSelector.js`:

```js
{ id: '<id>', label: '<Label>', swatch: '#<swatch-hex>' },   // add swatchDark if the brand flips in dark mode
```

The `swatch` value is the colour shown in the selector — pick the theme's brand colour.

## Step 4 — Test

Extend `tests/e2e/theme.test.js` with a case matching the existing ones: selecting the new theme applies `data-theme="<id>"`. Iterate with the targeted run, then finish with the full gate:

```
bun run test:e2e -- --grep "theme"                  # while iterating
bun run typecheck && bun run test && bun run test:e2e   # full gate before done
```

## Step 5 — Verify visually

Run `bun run dev`, switch to the new theme via the selector, and check both light and dark mode on the dashboard and team pages before reporting done.

To cover it in the visual-parity suite, add the id to `THEMES` in `tests/visual/parity.test.js` and re-capture the baseline in CI (see `tests/visual/README.md`).
