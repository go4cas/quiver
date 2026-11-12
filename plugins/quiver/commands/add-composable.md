---
description: Add a Quiver composable recipe (useForm, hmrState) or scaffold a new composable with a test
argument-hint: <useForm | hmrState | useName>
---
Add a composable to this app: $ARGUMENTS

## Where things are

- **The app** is the folder with the app's `package.json`. In the Quiver repository itself the app is `starter/`; work there.
- **Recipes** are in `node_modules/@go4cas/quiver/recipes/` (in the Quiver repository: `recipes/` at the root). `index.json` lists them; `README.md` there explains how to install one.

## Step 1: does it already exist?

- **A recipe?** Compare the argument, case-insensitively, with the keys and `aliases` in `recipes/index.json` (`useForm`, `form`, `hmrState`, `useToast` → `toasts`, …). If it matches, install that recipe as "Installing a recipe" in `recipes/README.md` describes (copy each path in its `files` to the place under `src/` it maps to, `src/composables/` for `useForm` and `hmrState`), show the **Use** example from its README, and stop.
- **In `arrow-use`?** For HTTP requests use `useFetch`, for persisted values `useStorage`, for media queries `useMediaQuery`, for DOM listeners `useEventListener`, all from `arrow-use`. Add `arrow-use` to the dependencies if missing, show the import, and stop instead of hand-rolling them.
- **In `@go4cas/quiver`?** `useRoute()` and `useRouter()` (and `useMeta()`) come from core.

## Step 2: otherwise, scaffold it

Normalise the name to camelCase with a `use` prefix (`pagination` → `usePagination`).

1. Create `src/composables/<name>.js`:

```js
import { reactive, onCleanup } from '@arrow-js/core'

/**
 * <What it does.> Call it inside a page or component function.
 * @param {number} [initial]
 */
export function <name>(initial = 0) {
  const state = reactive({ value: initial })

  return {
    value: () => state.value,                 // getters, so callers stay reactive
    increment() { state.value++ },            // actions as plain functions
  }
}
```

   - Call it inside a page or component, never at module scope (module scope state is shared by every caller).
   - Return state as zero-argument getters and actions as plain functions.
   - Clean up listeners, timers and watchers: `try { onCleanup(stop) } catch {}` (Arrow's `onCleanup` throws outside a component), and return an idempotent `stop()`.
   - JSDoc `@param`/`@returns` on the export; strict `checkJs` fails on untyped params.

2. Create `tests/unit/<name>.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { <name> } from '../../src/composables/<name>.js'

describe('<name>', () => {
  it('starts from the initial value', () => {
    expect(<name>(2).value()).toBe(2)
  })

  it('updates through its actions', () => {
    const c = <name>()
    c.increment()
    expect(c.value()).toBe(1)
  })
})
```

## Step 3: verify and report

Run the app's checks and fix failures (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`). Report the files, the export, a one-line usage example inside a page function, and what it depends on.
