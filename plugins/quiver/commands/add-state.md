---
description: Create a global reactive state module (a module-scope singleton)
argument-hint: <name, e.g. cart or postState>
---
Create a state module for: $ARGUMENTS

The app is the folder with the app's `package.json`; in the Quiver repository itself it is `starter/`. Normalise the name to camelCase with a `State` suffix (`post` → `postState`).

1. Create `src/state/<name>.js`:

```js
import { reactive } from '@arrow-js/core'

/** @typedef {{ id: string, title: string }} Post */

export const <name> = reactive({
  posts: /** @type {Post[]} */ ([]),

  /** @param {Omit<Post, 'id'>} post */
  addPost(post) {
    this.posts.push({ ...post, id: crypto.randomUUID() })
  },

  /** @param {string} id */
  removePost(id) {
    this.posts = this.posts.filter((p) => p.id !== id)
  },
})
```

   - Create it at module scope and export the singleton; it is shared app-wide.
   - Name the collection and actions after the domain; add `status: 'idle'` if it will load data.
   - A `@typedef` for the item shape and JSDoc on every action (strict `checkJs`).
   - Persist with `useStorage` from `arrow-use` rather than hand-written `localStorage` calls. Create one instance per key for the whole app: two instances of one key in the same tab don't see each other's writes.

2. Add a unit test in `tests/unit/<name>.test.js` for each action, resetting the state in `beforeEach`.

3. Run the app's checks (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`). Report the file, the import line (`import { <name> } from '../state/<name>.js'`) and a one-line usage example in a template (`${() => <name>.posts.length}`).
