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

2. Register the component in `src/components/index.js` by adding a named export:
```js
export { <Name> } from './<Name>.js'
```

3. Report:
   - The file created
   - The export added to `index.js`
   - A one-line usage example: `import { <Name> } from '../components/index.js'`
   - Any props the component accepts
