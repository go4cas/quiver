Create a new Quiver state module for: $ARGUMENTS

The argument is either a module name (e.g. `postState`, `cartState`) or a plain noun (e.g. `post`, `cart`). Normalise to camelCase with a `State` suffix (e.g. `postState`).

Follow these steps exactly:

1. Create `src/state/<name>.js` as a module-scope `reactive()` singleton:

```js
import { reactive } from '@arrow-js/core'

export const <name> = reactive({
  items: [],

  add(item) {
    this.items.push({ ...item, id: crypto.randomUUID() })
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id)
  },

  update(id, changes) {
    const item = this.items.find(i => i.id === id)
    if (item) Object.assign(item, changes)
  },
})
```

   - Rename `items` to a domain-appropriate plural noun derived from the argument (e.g. `posts`, `cartItems`)
   - Keep methods generic but rename them to match the domain where it makes the intent clearer (e.g. `addPost`, `removePost`)
   - Add `status: 'idle'` to state if async operations are likely

2. Apply all Arrow.js rules — the exported object is already reactive; no extra wrapping needed.
   - Annotate every method's parameters with JSDoc (e.g. `/** @param {string} id */`) and add a `@typedef` for the item shape — strict `checkJs` is enforced and untyped params fail `npm run typecheck`. See `src/state/userState.js` for the pattern.

3. Verify — run and fix any failures:
```
npm run typecheck && npm test && npm run test:e2e
```

4. Report:
   - The file created
   - The exported name to import in pages: `import { <name> } from '../state/<name>.js'`
   - A one-line usage example showing how to read state and call an action in a page template
