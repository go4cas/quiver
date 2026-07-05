Create a new Quiver page for the route path: $ARGUMENTS

Follow these steps exactly:

1. Convert the route path to a file path under `src/pages/`:
   - `contact` → `src/pages/contact.js`
   - `users/profile` → `src/pages/users/profile.js`
   - `posts/[id]` → `src/pages/posts/[id].js`
   - Create any missing subdirectories.

2. Create the page file using this exact structure:
```js
import { html } from '@arrow-js/core'
import { useMeta } from '../framework/index.js'

export const meta = { layout: 'menu', title: '<Derived from path>' }

function <PageName>Page() {
  useMeta({ title: '<Derived from path>' })
  return html`
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">${'<Derived from path>'}</h1>
    </div>
  `
}

export default <PageName>Page
```

   - Derive a readable title from the path (e.g. `posts/[id]` → `'Post'`)
   - Use `layout: 'menu'` by default unless the page is a standalone screen (use `'basic'` for login, error, etc.)
   - If the path contains a dynamic segment like `[id]`, add `useRoute` import and show how to read the param:
     ```js
     import { useRoute } from '../composables/useRoute.js'
     // inside the function:
     const route = useRoute()
     ```
   - Adjust the relative import path for `useMeta` based on nesting depth (e.g. `../../framework/index.js` for two levels deep)

3. Apply all Arrow.js rules:
   - Wrap reactive values in `() =>`
   - No `<!-- -->` comments inside template literals
   - Use `aria-disabled` not `.disabled` for disabled states
   - Annotate any helper functions with JSDoc `@param`/`@returns` — strict `checkJs` is enforced and untyped params fail `npm run typecheck`

4. Verify — run and fix any failures:
```
npm run typecheck && npm test && npm run test:e2e
```

5. Report:
   - The file created
   - The URL it maps to (e.g. `/posts/:id`)
   - Any follow-up steps (e.g. add a nav link, create a state module)
