# Feature Workflow

A walkthrough of adding a section to an app built on the starter. The example adds **Tickets**: a list page, a store, a card component, a nav link and an e2e test. With the Claude Code plugin, `/add-feature tickets — list and add support tickets` plans the same steps for you.

## 1. Add the page

The file path is the route; nothing to register.

```js
// src/pages/tickets/index.js → /tickets
import { html } from '@arrow-js/core'

export const meta = { layout: 'menu', title: 'Tickets', nav: { label: 'Tickets', order: 5 } }

export default function TicketsPage() {
  return html`
    <section>
      <h1>Tickets</h1>
    </section>
  `
}
```

In dev, the new file reloads the browser with the new route. `meta.layout` picks the menu layout, `meta.title` sets `document.title`, and `meta.nav` adds a sidebar link ([app structure](./app-config#menu-links-from-pages)).

## 2. Add a store

```js
// src/state/ticketState.js
import { reactive } from '@arrow-js/core'

/** @typedef {{ id: string, title: string, done: boolean }} Ticket */

export const ticketState = reactive({
  /** @type {Ticket[]} */
  tickets: [],
  /** @param {string} title */
  add(title) {
    this.tickets.push({ id: crypto.randomUUID(), title, done: false })
  },
  /** @param {string} id */
  close(id) {
    const ticket = this.tickets.find((t) => t.id === id)
    if (ticket) ticket.done = true
  },
})
```

## 3. Add a component

```js
// src/components/TicketCard.js
import { component, html } from '@arrow-js/core'
import { ticketState } from '../state/ticketState.js'

/** @typedef {import('../state/ticketState.js').Ticket} Ticket */

export const TicketCard = component(/** @param {Ticket} ticket */ (ticket) => html`
  <article class="ticket-card q-panel" data-done="${() => String(ticket.done)}">
    <h2 class="ticket-card__title">${() => ticket.title}</h2>
    <button type="button" aria-disabled="${() => String(ticket.done)}"
      @click="${() => ticketState.close(ticket.id)}">Close</button>
  </article>
`)
```

```css
/* src/components/TicketCard.css, then @import it in src/style.css before effects.css */
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.ticket-card) {
    padding: 1rem;
    border: 1px solid var(--q-color-line);
    border-radius: var(--q-radius-panel);
    background-color: var(--q-color-surface-raised);
    &[data-done="true"] { color: var(--q-color-fg-faint); }
  }
}
```

## 4. Use them in the page

```js
// src/pages/tickets/index.js
import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'
import { useToast } from '../../components/Toasts.js'
import { TicketCard } from '../../components/TicketCard.js'
import { ticketState } from '../../state/ticketState.js'

export const meta = { layout: 'menu', title: 'Tickets' }

export default function TicketsPage() {
  const toast = useToast()
  useMeta({ title: () => `Tickets (${ticketState.tickets.filter((t) => !t.done).length})` })

  return html`
    <section>
      <h1>Tickets</h1>
      <button type="button" @click="${() => {
        ticketState.add('Fix login bug')
        toast.success('Ticket added.')
      }}">Add ticket</button>
      ${() => ticketState.tickets.map((t) => TicketCard(t).key(t.id))}
    </section>
  `
}
```

## 5. Check the nav link

The `meta.nav` from step 1 put **Tickets** in the menu layout's sidebar, after the links with a lower `order`. The active link gets `aria-current="page"`, on `/tickets` and on any path below it. To put links in an order of your own, or to add one that isn't a page, set `nav` in `src/app.config.js` instead.

## 6. Test it

```js
// tests/e2e/tickets.test.js
import { test, expect } from '@playwright/test'

test('adds a ticket', async ({ page }) => {
  await page.goto('tickets')
  await expect(page).toHaveTitle('Tickets (0)')
  await page.getByRole('button', { name: 'Add ticket' }).click()
  await expect(page.getByRole('heading', { name: 'Fix login bug' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Ticket added.')
})
```

Use relative URLs (`'tickets'`, not `'/tickets'`): every test also runs with the app under `/sub/app/`. Then run everything:

```bash
bun run typecheck && bun run test && bun run test:e2e
```
