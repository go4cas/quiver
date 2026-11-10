Create a new Quiver layout named: $ARGUMENTS

In the Quiver repository the app lives in `starter/`: the `src/` and `tests/` paths below are relative to it.

The argument is a layout name in any case (e.g. `sidebar`, `BlankLayout`, `full-width`). Normalise to PascalCase with a `Layout` suffix — `<Name>` below means this full suffixed name (e.g. `SidebarLayout`). The registration key is the lowercase base name without the suffix (e.g. `sidebar`).

Follow these steps exactly:

1. Create `src/layouts/<Name>.js`:

```js
import { html } from '@arrow-js/core'

export function <Name>(content) {
  return html`
    <div class="<name>-layout">
      ${content}
    </div>
  `
}
```

   - The layout receives the rendered page as its `content` argument — render it as `${content}` (no `() =>` needed; content is already an Arrow template, not a reactive value)
   - Style it in a sibling `src/layouts/<Name>.css`, imported from `src/style.css` (before `effects.css`), in `@layer quiver.components` with `:where()` selectors and `--q-*` tokens only. Add `q-sidebar` / `q-header` / `q-panel` hook classes where the layout has a sidebar, sticky header or panels. Match the look of existing layouts in `src/layouts/`
   - If the layout needs global DI data (e.g. app name, current user), inject it using `inject` from `@go4cas/quiver`:
     ```js
     import { inject } from '@go4cas/quiver'
     const app = inject('app', { name: 'Quiver', tagline: '' })
     ```
   - Apply Arrow.js rules: wrap reactive values in `() =>`, no `<!-- -->` HTML comments inside template literals
   - Annotate the exported layout function with JSDoc `@param`/`@returns` — strict `checkJs` is enforced and untyped params fail `bun run typecheck`

2. Register in `src/layouts/index.js`:
```js
import { <Name> } from './<Name>.js'
// add to the layouts object:
<key>: <Name>,
```

3. Verify — run and fix any failures:
```
bun run typecheck && bun run test && bun run test:e2e
```

4. Report:
   - The file created
   - The key to use in `meta.layout` (e.g. `export const meta = { layout: '<key>' }`)
   - Any DI keys the layout reads and where to `provide()` them in `src/main.js`
