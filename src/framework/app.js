import { html } from '@arrow-js/core'
import { render } from '@arrow-js/framework'
import { routerState } from '../state/routerState.js'
import { layouts } from '../layouts/index.js'
import { LoadingCard } from '../components/LoadingCard.js'
import { ErrorCard } from '../components/ErrorCard.js'

function RouteOutlet() {
  if (routerState.status === 'loading' || routerState.status === 'idle') return LoadingCard()
  if (routerState.status === 'error') return ErrorCard(routerState.error)

  const Page = routerState.page

  if (typeof Page !== 'function') {
    return ErrorCard('No page function was registered for this route.')
  }

  const Layout = layouts[routerState.layout] || layouts.basic

  return Layout(Page()).key(routerState.path)
}

/**
 * Mount the app: install plugins, then render the route outlet into the root element.
 * @param {{ root?: string, plugins?: Array<{ install?: () => void }> }} [options]
 * @returns {Promise<void>}
 */
export async function createApp({ root = '#app', plugins = [] } = {}) {
  for (const plugin of plugins) plugin.install?.()

  const rootEl = document.querySelector(root)

  if (!rootEl) throw new Error(`Missing root element: ${root}`)

  await render(rootEl, html`<div class="min-h-screen">${() => RouteOutlet()}</div>`)
}
