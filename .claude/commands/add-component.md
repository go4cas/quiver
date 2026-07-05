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
   - Use Tailwind CSS utility classes for styling; match the visual style of existing components in `src/components/`
   - Annotate the component's props with JSDoc, e.g. `/** @param {{ title: string }} props */` — strict `checkJs` is enforced and untyped props fail `npm run typecheck`

2. Verify — run and fix any failures:
```
npm run typecheck && npm test && npm run test:e2e
```

3. Report:
   - The file created
   - A one-line usage example: `import { <Name> } from '../components/<Name>.js'` (import directly — there is no barrel file)
   - Any props the component accepts
