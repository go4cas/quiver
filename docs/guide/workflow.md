# Feature Workflow

A step-by-step walkthrough for adding a new section to the app. The example builds a Tickets feature from scratch.

## 1. Create the page

Add a file under `src/pages/`. The file path determines the route automatically — no registration needed.

```js
// src/pages/tickets/index.js
import { html } from '@arrow-js/core'

export const meta = {
  layout: 'menu',
  title: 'Tickets',
}

function TicketsPage() {
  return html`
    <section>
      <h1>Tickets</h1>
    </section>
  `
}

export default TicketsPage
```

`export const meta` sets the layout and the document title. The router applies both automatically on navigation.

## 2. Add state (if needed)

Create a store in `src/state/` using `createStore()`.

```js
// src/state/ticketState.js
import { createStore } from '../framework/index.js'

export const ticketState = createStore((reactive) =>
  reactive({
    tickets: [],
    addTicket(ticket) {
      this.tickets.push({ id: crypto.randomUUID(), ...ticket })
    },
    removeTicket(id) {
      this.tickets = this.tickets.filter((t) => t.id !== id)
    },
  })
)
```

Import and use it directly in any page or component:

```js
import { ticketState } from '../state/ticketState.js'

// Read
ticketState.tickets.length

// Mutate
ticketState.addTicket({ title: 'Fix login bug' })
```

## 3. Add components (if needed)

Create a component in `src/components/` and export it from the barrel file so it's available consistently.

```js
// src/components/TicketCard.js
import { component, html } from '@arrow-js/core'

export const TicketCard = component((ticket) => html`
  <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="font-semibold text-slate-900">${() => ticket.title}</h3>
    <p class="mt-1 text-sm text-slate-500">${() => ticket.status}</p>
  </article>
`)
```

Use it in the page — import directly from the component file:

```js
import { TicketCard } from '../components/TicketCard.js'

// Inside a reactive expression, use .key() for stable list identity
${() => ticketState.tickets.map((t) => TicketCard(t).key(t.id))}
```

## 4. Add a nav link

Open `src/layouts/MenuLayout.js` and add a `Link` to the sidebar nav:

```js
${Link({ to: '/tickets', children: 'Tickets', class: navClass })}
```

The `Link` component applies `aria-current="page"` automatically when the route is active.

## 5. Write an E2E test

Add a test file in `tests/e2e/` to cover the new feature's golden path.

```js
// tests/e2e/tickets.test.js
import { test, expect } from '@playwright/test'

test('tickets page loads with correct title', async ({ page }) => {
  await page.goto('/tickets')
  await expect(page).toHaveTitle('Tickets')
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
})

test('adding a ticket shows it in the list', async ({ page }) => {
  await page.goto('/tickets')
  await page.getByRole('button', { name: 'Add ticket' }).click()
  await expect(page.getByText('Fix login bug')).toBeVisible()
})
```

Run with `npm run test:e2e`.

---

## Adding local state to a component

For state that belongs to a single component instance (not shared globally), create a `reactive()` object inside the `component()` factory:

```js
import { component, html, onCleanup, watch } from '@arrow-js/core'
import { hmrState } from '../utils/hmrState.js'

export const TicketCounter = component((props) => {
  // hmrState preserves state across Vite hot-reloads in dev.
  // Falls back to a plain reactive() in production builds.
  const state = hmrState(`ticket-counter-${props.label}`, { count: 0 })

  // watch() runs immediately and re-runs whenever accessed state changes.
  // The second tuple element is a stop function.
  const [, stopWatch] = watch(() => {
    if (state.count > 0) console.log(`count: ${state.count}`)
  })

  // onCleanup fires when the component unmounts (e.g. route navigation).
  onCleanup(stopWatch)

  return html`
    <button @click="${() => state.count++}">
      ${() => props.label}: ${() => state.count}
    </button>
  `
})
```

**`hmrState(key, initialState)`** — wraps `reactive()` so the state object survives Vite hot-module reloads. In production, `import.meta.hot` is `undefined` and it simply returns `reactive(initialState)`. Use a unique key per component instance (e.g. include `props.label` or a route param).

**`watch(fn)`** — runs `fn` immediately, then re-runs it whenever any reactive value accessed inside `fn` changes. Returns `[currentValue, stopFn]`. Always call `stopFn` via `onCleanup` to prevent watcher leaks after the component unmounts.

**`onCleanup(fn)`** — registers a teardown callback that runs when the `component()` instance is removed from the DOM.
