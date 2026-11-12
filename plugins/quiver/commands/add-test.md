---
description: Write unit (Vitest) or end-to-end (Playwright) tests for a file in a Quiver app
argument-hint: <file path, e.g. src/pages/users/index.js>
---
Write tests for: $ARGUMENTS

The app is the folder with the app's `package.json`; in the Quiver repository itself it is `starter/` (and core is `packages/quiver/`, composables `packages/arrow-use/`, recipes `recipes/`).

## Step 1: pick the kind of test

| Source | Test | Where |
|---|---|---|
| `src/state/*.js`, `src/composables/*.js`, pure helpers | Unit (Vitest) | `tests/unit/<name>.test.js` |
| `src/pages/**/*.js`, `src/components/*.js`, `src/layouts/*.js` | E2E (Playwright) | `tests/e2e/<name>.test.js` |
| `src/components/…`, `src/composables/…`, `src/layouts/…`, `src/views/…` from a recipe | Unit or E2E as above; in the Quiver repository, recipe unit tests live in `recipes/<recipe>/tests/` | |
| `packages/quiver/src/*.js` (Quiver repository only) | Unit | `packages/quiver/tests/<name>.test.js` |

Extend an existing test file for the same source rather than adding a second one.

## Step 2: unit tests

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { cartState } from '../../src/state/cartState.js'

describe('cartState', () => {
  beforeEach(() => { cartState.items = [] })

  it('adds an item with an id', () => {
    cartState.add({ name: 'Pen' })
    expect(cartState.items[0]).toMatchObject({ name: 'Pen' })
    expect(cartState.items[0].id).toBeTypeOf('string')
  })
})
```

Test behaviour and edge cases; reset shared state in `beforeEach`. Arrow renders on a microtask: after changing state, `await nextTick()` (from `@arrow-js/core`) before reading the DOM. With fake timers, fake only the timers (`vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })`), or Arrow never flushes.

## Step 3: e2e tests

```js
import { test, expect } from '@playwright/test'

test('opens a profile from the team page', async ({ page }) => {
  await page.goto('users')
  await page.getByRole('button', { name: 'View profile' }).first().click()
  await expect(page).toHaveTitle(/Alice/)
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
})
```

- Prefer `getByRole`, `getByLabel`, `getByText`; add `data-testid` only where nothing semantic fits.
- In the Quiver repository navigate with relative URLs (`goto('users')`, `goto('./')`, `toHaveURL('users')`), never a leading `/`: every test also runs with the app under `/sub/app/`.
- Wait on what the user sees (`toBeVisible`, `toHaveCount(0)`), never on fixed delays.

## Step 4: run

Iterate on the one test, then run the full checks (in the Quiver repository: `bun run typecheck && bun run test && bun run test:e2e`) and fix failures before reporting.
