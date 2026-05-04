Create a new Quiver layout named: $ARGUMENTS

The argument is a layout name in any case (e.g. `sidebar`, `BlankLayout`, `full-width`). Normalise to PascalCase with a `Layout` suffix (e.g. `SidebarLayout`). The registration key is the lowercase base name without the suffix (e.g. `sidebar`).

Follow these steps exactly:

1. Create `src/layouts/<Name>.js`:

```js
import { html } from '@arrow-js/core'

export function <Name>Layout(content) {
  return html`
    <div class="min-h-screen">
      ${content}
    </div>
  `
}
```

   - The layout receives the rendered page as its `content` argument — render it as `${content}` (no `() =>` needed; content is already an Arrow template, not a reactive value)
   - Use Tailwind CSS utility classes; match the visual style of existing layouts in `src/layouts/`
   - If the layout needs global DI data (e.g. app name, current user), inject it using `inject` from `../framework/index.js`:
     ```js
     import { inject } from '../framework/index.js'
     const app = inject('app', { name: 'Quiver', tagline: '' })
     ```
   - Apply Arrow.js rules: wrap reactive values in `() =>`, no `<!-- -->` HTML comments inside template literals

2. Register in `src/layouts/index.js`:
```js
import { <Name>Layout } from './<Name>Layout.js'
// add to the layouts object:
<key>: <Name>Layout,
```

3. Report:
   - The file created
   - The key to use in `meta.layout` (e.g. `export const meta = { layout: '<key>' }`)
   - Any DI keys the layout reads and where to `provide()` them in `src/main.js`
