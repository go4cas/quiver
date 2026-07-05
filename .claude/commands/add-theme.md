Add a new visual theme to this Quiver app: $ARGUMENTS

The argument is a theme identifier and optional description (e.g. `ocean — cool blues, soft shadows`, `terminal — green-on-black hacker aesthetic`).

Follow this process:

## Step 1 — Token override blocks in `src/style.css`

Study the existing theme blocks (`[data-theme="mono"]`, `[data-theme="glass"]`, etc.) to see which custom properties a theme overrides. Add a light and a dark block for the new theme:

```css
/* <Label> — light */
[data-theme="<id>"] {
  --color-surface: ...;
  --color-brand: ...;
  /* override the same token set the existing themes do */
}

/* <Label> — dark */
[data-theme="<id>"][data-mode="dark"] {
  ...
}
```

Only override semantic tokens — never introduce new hard-coded colors in components.

## Step 2 — Tailwind variant (optional)

If the theme needs per-element utility overrides in markup, register a variant alongside the existing ones near the top of `src/style.css`:

```css
@variant theme-<id> (&:where([data-theme=<id>], [data-theme=<id>] *));
```

## Step 3 — Register in the ThemeSelector

Add an entry to the `THEMES` array in `src/components/ThemeSelector.js`:

```js
{ id: '<id>', label: '<Label>', bg: 'bg-[#<swatch-hex>]' },
```

The `bg` value is the swatch color shown in the selector — pick the theme's brand color.

## Step 4 — Test

Extend `tests/e2e/theme.test.js` with a case matching the existing ones: selecting the new theme applies `data-theme="<id>"`. Iterate with the targeted run, then finish with the full gate:

```
npm run test:e2e -- --grep "theme"                  # while iterating
npm run typecheck && npm test && npm run test:e2e   # full gate before done
```

## Step 5 — Verify visually

Run `npm run dev`, switch to the new theme via the selector, and check both light and dark mode on the dashboard and team pages before reporting done.
