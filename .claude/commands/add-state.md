Create a new Quiver state module for: $ARGUMENTS

The argument is either a module name (e.g. `postState`, `cartState`) or a plain noun (e.g. `post`, `cart`). Normalise to camelCase with a `State` suffix (e.g. `postState`).

Follow these steps exactly:

1. Create `src/state/<name>.js` using the `createStore` pattern:

```js
import { createStore } from '../framework/index.js'

export const <name> = createStore((reactive) => {
  const state = reactive({
    items: [],
  })

  return {
    get items() { return state.items },

    add(item) {
      state.items.push({ ...item, id: crypto.randomUUID() })
    },

    remove(id) {
      state.items = state.items.filter(i => i.id !== id)
    },

    update(id, changes) {
      const idx = state.items.findIndex(i => i.id === id)
      if (idx !== -1) Object.assign(state.items[idx], changes)
    },
  }
})
```

   - Rename `items` to a domain-appropriate plural noun derived from the argument (e.g. `posts`, `cartItems`)
   - Keep methods generic but rename them to match the domain where it makes the intent clearer (e.g. `addPost`, `removePost`)
   - Add `status: 'idle'` to state if async operations are likely

2. Apply all Arrow.js rules — state returned from `createStore` is already reactive; no extra wrapping needed.

3. Report:
   - The file created
   - The exported name to import in pages: `import { <name> } from '../state/<name>.js'`
   - A one-line usage example showing how to read state and call an action in a page template
