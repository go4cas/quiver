Create a new Quiver composable named: $ARGUMENTS

The argument is a composable name in any form (e.g. `useTheme`, `theme`, `pagination`). Normalise to camelCase with a `use` prefix (e.g. `useTheme`, `usePagination`).

Follow these steps exactly:

1. Create `src/composables/<name>.js`:

```js
import { routerState } from '../state/routerState.js'  // only if route access needed
// import other state/framework dependencies as needed

export function <name>() {
  // encapsulate logic here

  return {
    // return reactive accessors as arrow functions
    value: () => someState.value,

    // return actions as plain functions
    doSomething() { /* mutate state */ },
  }
}
```

   Rules:
   - **Must be called inside a page or component function** — never at module scope. State initialised at module scope resets on re-render. Document this constraint with a one-line comment above the export if it's not obvious from the name.
   - Return reactive state values as getter functions (`() => state.value`), not raw values, so callers stay reactive
   - Return actions as plain functions (no `() =>` wrapper needed)
   - If the composable sets up watchers or side effects, clean them up with `onCleanup` from `@arrow-js/core` to prevent leaks across navigations
   - Apply Arrow.js rules: no `<!-- -->` comments inside any template literals used internally

2. Create a unit test at `tests/composables/<name>.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { <name> } from '../../src/composables/<name>.js'

describe('<name>', () => {
  it('returns expected initial state', () => {
    const result = <name>()
    expect(result.value()).toBe(expectedInitialValue)
  })

  it('action updates state', () => {
    const result = <name>()
    result.doSomething()
    expect(result.value()).toBe(expectedNewValue)
  })
})
```

3. Run the tests and fix any failures: `npm test -- --run`

4. Report:
   - The file created and its test file
   - The exported function name
   - A one-line usage example inside a page function
   - Any state modules or framework APIs it depends on
