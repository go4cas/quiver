# Testing

The starter comes with three suites, each with its own runner:

| Suite | Tool | Command | Folder |
|---|---|---|---|
| Unit | Vitest (jsdom) | `bun run test`, `bun run test:watch` | `tests/unit/` |
| End-to-end | Playwright (Chromium) | `bun run test:e2e` | `tests/e2e/` |
| Screenshots | Playwright | `bun run test:visual` | `tests/visual/` |

Run `bun run typecheck` with them: the JSDoc types are checked by `tsc`, and a type error is often the first sign of a wrong import.

## Unit tests

`vitest.config.js` adds the `quiver()` Vite plugin, so tests can import `quiver:routes` like the app does. The starter's own test checks the route manifest:

```js
import { describe, it, expect } from 'vitest'
import routes, { notFound } from 'quiver:routes'

describe('route manifest', () => {
  it('has one pattern per page', () => {
    expect(Object.keys(routes)).toEqual(['/', '/login', '/posts', '/toasts', '/users', '/users/:id'])
  })
})
```

Add a test next to what you write: a store in `src/state/`, a composable in `src/composables/`, a helper. `/add-test <file>` writes one and runs it.

```js
// tests/unit/ticketState.test.js
import { describe, it, expect } from 'vitest'
import { ticketState } from '../../src/state/ticketState.js'

describe('ticketState', () => {
  it('adds a ticket with an id', () => {
    ticketState.addTicket({ title: 'Fix login' })
    expect(ticketState.tickets.at(-1)).toMatchObject({ title: 'Fix login', done: false })
    expect(ticketState.tickets.at(-1)?.id).toEqual(expect.any(String))
  })
})
```

### Rendering in jsdom

Arrow templates render into jsdom, so components can be unit-tested too. Arrow flushes DOM updates on a microtask, so `await nextTick()` before you read the DOM:

```js
import { html, nextTick, reactive } from '@arrow-js/core'

it('updates the count', async () => {
  const state = reactive({ n: 0 })
  const el = document.createElement('div')
  html`<p>${() => state.n}</p>`(el)
  state.n++
  await nextTick()
  expect(el.textContent).toBe('1')
})
```

With fake timers, fake only the timers: `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })`. Vitest's default also fakes `queueMicrotask`, and then `nextTick()` never resolves.

### Testing with the router

`initRouter()` needs `window.navigation`, which jsdom doesn't have. Test pages and components on their own, and leave routing to e2e tests, or install a fake Navigation API in a setup file. `destroy()` resets everything between tests:

```js
import { afterEach } from 'vitest'
import { destroy } from '@go4cas/quiver'

afterEach(() => destroy())
```

## End-to-end tests

Playwright starts the dev server, runs every test in Chromium, and reuses a server that's already running. The starter's config has two projects: `root` (the app at `/`, port 5173) and `subpath` (the app under `/sub/app/`, port 5174), and every test runs in both.

```js
// tests/e2e/tickets.test.js
import { test, expect } from '@playwright/test'

test('adding a ticket shows it in the list', async ({ page }) => {
  await page.goto('tickets')
  await page.getByRole('button', { name: 'Add ticket' }).click()
  await expect(page.getByText('Fix login bug')).toBeVisible()
  await expect(page).toHaveURL(/tickets$/)
})
```

- **Relative URLs only**: `page.goto('tickets')`, `page.goto('./')`. Playwright resolves `/tickets` against the origin, which drops `/sub/app/`.
- **Semantic locators**: `getByRole`, `getByLabel`, `getByText`, then `getByTestId` when nothing else fits. Not CSS classes, which the theme can change.
- **One file per feature.**

## Screenshots

`tests/visual/` captures every page state in 5 themes × 2 modes and compares it with the baseline in `tests/visual/__screenshots__/`, within a tight tolerance (`threshold: 0.02`, `maxDiffPixelRatio: 0.0001`). Fonts and anti-aliasing differ between machines, so the baseline only matches inside the pinned Playwright Docker image; `tests/visual/README.md` shows how to run it there and how to re-capture after an intended change. If you don't want this suite, delete `tests/visual/` and the two `visual-*` projects in `playwright.config.js`.

## What's tested where

In the Quiver repository, each package tests itself: the router, context and meta in `packages/quiver/tests/`, the composables against bare Arrow in `packages/arrow-use/tests/`, each recipe in `recipes/<name>/tests/`, and the examples with their own Playwright smoke tests. Your app's suites only need to cover your app.
