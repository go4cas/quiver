import { html } from '@arrow-js/core'
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

// Mount the route outlet into #app. Run any setup code before calling this.
export function createApp() {
  const rootEl = document.querySelector('#app')

  if (!rootEl) throw new Error('Missing root element: #app')

  html`<div class="min-h-screen">${() => RouteOutlet()}</div>`(rootEl)
}
