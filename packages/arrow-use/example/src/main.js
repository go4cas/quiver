import { html, component, reactive } from '@arrow-js/core'
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'

/** @typedef {{ id: number, name: string }} Item */

// A plain Arrow app: no Quiver, no bundler. Every composable is called inside
// the component, so its listeners and requests are released if it unmounts.
const App = component(() => {
  const items = useFetch('data.json', { transform: (/** @type {Item[]} */ list) => list.map((i) => i.name) })
  const clicks = useStorage('arrow-use-example:clicks', 0)
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  const keys = reactive({ last: 'none' })
  useEventListener(() => window, 'keydown', (event) => {
    keys.last = /** @type {KeyboardEvent} */ (event).key
  })

  return html`
    <h1>arrow-use example</h1>

    <section aria-labelledby="fetch">
      <h2 id="fetch">useFetch</h2>
      <p>${() => (items.loading() ? 'Loading…' : items.error() ?? `Status ${items.status()}`)}</p>
      <ul>${() => (/** @type {string[] | null} */ (items.data()) ?? []).map((name) => html`<li>${name}</li>`.key(name))}</ul>
      <button @click="${() => items.refetch()}">Reload</button>
    </section>

    <section aria-labelledby="storage">
      <h2 id="storage">useStorage</h2>
      <p data-testid="clicks">Clicks: ${() => clicks.value()}</p>
      <button @click="${() => clicks.set(clicks.value() + 1)}">Add one</button>
      <button @click="${() => clicks.remove()}">Reset</button>
    </section>

    <section aria-labelledby="media">
      <h2 id="media">useMediaQuery</h2>
      <p data-testid="scheme">Colour scheme: ${() => (dark.matches() ? 'dark' : 'light')}</p>
    </section>

    <section aria-labelledby="events">
      <h2 id="events">useEventListener</h2>
      <p data-testid="key">Last key: ${() => keys.last}</p>
    </section>
  `
})

html`${App()}`(/** @type {HTMLElement} */ (document.getElementById('app')))
