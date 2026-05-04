Write tests for: $ARGUMENTS

The argument is a file path (e.g. `src/pages/users/index.js`, `src/composables/useForm.js`, `src/framework/router.js`).

Follow this process:

## Step 1 — Determine test type

| Source location | Test type | Output location |
|---|---|---|
| `src/framework/*.js` | Unit (Vitest) | `tests/framework/<name>.test.js` |
| `src/composables/*.js` | Unit (Vitest) | `tests/composables/<name>.test.js` |
| `src/pages/**/*.js` | E2E (Playwright) | `tests/e2e/<name>.test.js` |
| `src/components/*.js` | E2E (Playwright) | `tests/e2e/<name>.test.js` |
| `src/state/*.js` | Unit (Vitest) | `tests/composables/<name>.test.js` |

If an existing test file for this source already exists, extend it rather than creating a new one.

## Step 2 — Write unit tests (Vitest)

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { functionUnderTest } from '../../src/path/to/file.js'

describe('functionUnderTest', () => {
  it('does the expected thing', () => {
    expect(functionUnderTest(input)).toBe(expectedOutput)
  })

  it('handles edge case', () => {
    expect(functionUnderTest(edgeInput)).toBe(edgeOutput)
  })
})
```

- Test pure function behaviour and edge cases
- Use `beforeEach` to reset any shared state between tests
- Do not mock framework internals unless unavoidable

## Step 3 — Write E2E tests (Playwright)

```js
import { test, expect } from '@playwright/test'

test.describe('FeatureName', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('happy path', async ({ page }) => {
    await page.getByRole('link', { name: 'Nav link' }).click()
    await expect(page).toHaveURL(/\/expected-path/)
    await expect(page).toHaveTitle('Expected Title')
    await expect(page.getByRole('heading', { name: 'Heading' })).toBeVisible()
  })
})
```

- Prefer role-based selectors: `getByRole`, `getByLabel`, `getByText`
- Use `getByTestId` for elements with no semantic role; add `data-testid` attributes to the source if needed
- Cover: happy path, key edge cases, error states where applicable
- Do not test implementation details — test what the user sees and can do

## Step 4 — Run and fix

Run the tests and fix any failures before reporting done:
```
npm test -- --run                        # unit tests
npm run test:e2e -- --grep "TestName"   # specific E2E test
```
