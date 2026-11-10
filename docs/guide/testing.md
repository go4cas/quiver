# Testing

The project has two test suites that serve different purposes and run independently.

---

## Unit tests

**Tool:** Vitest  
**Command:** `bun run test` (one-shot) · `bun run test:watch` (watch mode)  
**Location:** `tests/unit/`

Unit tests cover pure utility functions and composables. They run in a jsdom environment and complete in under a second.

```
tests/unit/
├── routes.test.js    # the route manifest from the quiver() Vite plugin
├── useFetch.test.js  # fetching, errors, transform, abort, reset
├── useForm.test.js   # validation, field accessors, submission lifecycle
└── useToast.test.js  # toast lifecycle and configuration
```

The router, context and meta tests live with the core package in the repository (`packages/quiver/tests/`).

### Adding unit tests

Add a file under `tests/unit/` for any pure function or composable you write.

```js
// tests/unit/useMyThing.test.js
import { describe, it, expect } from 'vitest'
import { useMyThing } from '../../src/composables/useMyThing.js'

describe('useMyThing', () => {
  it('returns the expected value', () => {
    expect(useMyThing('input')).toBe('expected output')
  })
})
```

### What cannot be unit-tested

Arrow.js components and pages return `ArrowTemplate` objects — not plain values you can assert against. Testing rendering output requires a browser. Use E2E tests for anything that involves the DOM, routing, or reactive state updates.

---

## End-to-end tests

**Tool:** Playwright (Chromium)  
**Command:** `bun run test:e2e`  
**Location:** `tests/e2e/`

E2E tests run against a real browser. Playwright starts the Vite dev server automatically before the tests and shuts it down after. If a dev server is already running locally, it will be reused.

```
tests/e2e/
├── navigation.test.js  # Routing, page titles, active nav links, sign out
├── users.test.js       # Users list, add/remove, user detail page
├── login.test.js       # Login form, validation, loading state, redirect
├── not-found.test.js   # 404 page content and back navigation
├── theme.test.js       # Light/dark toggle, theme selection (5 themes), persistence
└── dashboard.test.js   # Metric card counts, cross-route reactivity
```

### Adding E2E tests

Add a file under `tests/e2e/` — one file per feature area works well.

```js
// tests/e2e/tickets.test.js
import { test, expect } from '@playwright/test'

test('tickets page loads with correct title', async ({ page }) => {
  await page.goto('/tickets')
  await expect(page).toHaveTitle('Tickets')
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
})
```

### Locator tips

Prefer semantic locators over CSS selectors — they are more resilient to markup changes:

```js
// Good — finds by role and accessible name
page.getByRole('button', { name: 'Add member' })
page.getByRole('heading', { name: 'Team' })

// Good — finds a label's input
page.getByLabel('Email')

// Good — finds a card containing specific text, then a button within it
page.locator('article').filter({ hasText: 'Alice Nkosi' }).getByRole('button', { name: 'View profile' })

// Good — targets a specific element by test id when no semantic selector fits
page.locator('[data-testid="user-menu"] summary')

// Avoid — brittle, breaks on class changes
page.locator('.btn-primary')

// Avoid — breaks if placeholder copy changes
page.getByPlaceholder('alice@example.com')
```

---

## Running both suites

```bash
bun run test          # unit tests only
bun run test:e2e  # E2E tests only
```

There is no combined command by default — they use different runners and have different startup costs. Run them separately in CI as two distinct steps.
