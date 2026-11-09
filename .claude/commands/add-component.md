Create a new Quiver component named: $ARGUMENTS

The argument is a PascalCase component name (e.g. `PostCard`, `StatusBadge`). If it is not PascalCase, convert it.

Follow these steps exactly:

1. Create `src/components/<Name>.js`:

```js
import { html } from '@arrow-js/core'

export function <Name>({ /* props */ }) {
  return html`
    <div>
      <!-- component content -->
    </div>
  `
}
```

   - Derive sensible props from the component name
   - Apply all Arrow.js rules:
     - Wrap reactive props in `() =>` only if the prop value can change after render; static props (strings, numbers passed once) do not need `() =>`
     - No `<!-- -->` HTML comments inside the template literal — use JS comments above it instead
     - Use `aria-disabled` + CSS for disabled states, never `.disabled="${...}"`
   - Style it in a sibling `src/components/<Name>.css` and add an `@import` for it to `src/style.css` (before `effects.css`). Start the file with `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` and put the rules in `@layer quiver.components { … }`
   - Use only `--q-*` tokens for colours, radii, shadows and fonts (`var(--q-color-surface-raised)`, `var(--q-radius-panel)`, …); spacing and sizes are `rem` literals. Never hard-code colours
   - Wrap selectors in `:where(.<name>)`, express variants and state as attributes (`data-tone`, `aria-pressed`), not modifier classes, and put hover inside `@media (hover: hover)`
   - Add the hook class `q-panel` to card or panel elements and `q-accent` to brand-coloured text so theme effects apply. Match the look of existing components in `src/components/`
   - Annotate the component's props with JSDoc, e.g. `/** @param {{ title: string }} props */` — strict `checkJs` is enforced and untyped props fail `bun run typecheck`

2. Verify — run and fix any failures:
```
bun run typecheck && bun run test && bun run test:e2e
```

3. Report:
   - The file created
   - A one-line usage example: `import { <Name> } from '../components/<Name>.js'` (import directly — there is no barrel file)
   - Any props the component accepts
