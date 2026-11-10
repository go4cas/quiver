import { html } from '@arrow-js/core'
import { routerState } from './state.js'

/**
 * @typedef {(content: unknown) => import('@arrow-js/core').ArrowTemplate} Layout
 * @typedef {() => unknown} LoadingView
 * @typedef {(props: { message: string }) => unknown} ErrorView
 * @typedef {Object} CreateAppOptions
 * @property {Element | string} target           element, or a selector for document.querySelector
 * @property {Record<string, Layout>} [layouts]   layouts by name, chosen by a page's meta.layout
 * @property {string} [defaultLayout]             layout for pages without meta.layout (default 'default')
 * @property {LoadingView} [loading]              shown while a route loads
 * @property {ErrorView} [error]                  shown when a route fails
 */

/** @type {LoadingView} */
const BareLoading = () => html`<p>Loading…</p>`
/** @type {ErrorView} */
const BareError = ({ message }) => html`<p role="alert">${message}</p>`

/**
 * Mount the route outlet into `target`. Call it after `await initRouter()`.
 * @param {CreateAppOptions} options
 */
export function createApp({ target, layouts = {}, defaultLayout = 'default', loading = BareLoading, error = BareError }) {
  const rootEl = typeof target === 'string' ? document.querySelector(target) : target

  if (!rootEl) throw new Error(`Missing root element: ${String(target)}`)

  function RouteOutlet() {
    if (routerState.status === 'loading' || routerState.status === 'idle') return loading()
    if (routerState.status === 'error') return error({ message: routerState.error })

    const Page = routerState.page

    if (typeof Page !== 'function') {
      return error({ message: 'No page function was registered for this route.' })
    }

    const Layout = layouts[routerState.layout] || layouts[defaultLayout]

    return Layout ? Layout(Page()).key(routerState.path) : Page()
  }

  html`<div>${() => RouteOutlet()}</div>`(/** @type {HTMLElement} */ (rootEl))
}
