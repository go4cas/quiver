import { html, reactive } from '@arrow-js/core'
import { routerState, resetRouterState } from './state.js'
import { clearMeta } from './meta.js'
import { clearContext } from './context.js'
import { setBase } from './base.js'
import {
  bumpEpoch, fireHooks, isRouterReady, reportRenderError, resetRouter, retry,
  stopRouter, takeInitialReport, takeRenderErrors,
} from './router.js'

/** @typedef {import('./types.js').CreateAppOptions} CreateAppOptions */
/** @typedef {import('./types.js').App} App */
/** @typedef {import('./types.js').LoadingView} LoadingView */
/** @typedef {import('./types.js').ErrorView} ErrorView */
/** @typedef {import('./types.js').Renderable} Renderable */

/** @type {LoadingView} */
const BareLoading = () => html`<p>Loading…</p>`
/** @type {ErrorView} */
const BareError = ({ message }) => html`<p role="alert">${message}</p>`

/** @type {{ target: Element, mount: { mounted: boolean } } | null} the mounted app, if any */
let current = null

/** @param {unknown} error @returns {string} */
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/**
 * Mount the route outlet into `target`. Call it after `await initRouter()`.
 * @param {CreateAppOptions} options
 * @returns {App}
 */
export function createApp(options) {
  if (!isRouterReady()) {
    throw new Error('createApp() needs a router. Call in this order: provide(), beforeEach()/afterEach()/onError(), await initRouter(), createApp().')
  }
  if (current) throw new Error('createApp() was already called. Call destroy() first.')

  const { target, layouts = {}, loading = BareLoading, error = BareError } = options
  const explicitDefault = options.defaultLayout !== undefined
  const defaultLayout = options.defaultLayout ?? 'default'

  /** @type {Element | null} */
  let el
  if (typeof target === 'string') {
    el = document.querySelector(target)
    if (!el) throw new Error(`createApp(): target "${target}" not found.`)
  } else if (typeof Element !== 'undefined' && target instanceof Element) {
    el = target
  } else {
    throw new TypeError('createApp(): target must be an Element or a selector string.')
  }

  /** @type {Set<string>} unknown layout names already warned about */
  const warned = new Set()

  /** @param {unknown} err */
  const errorView = (err) => error({ message: messageOf(err), error: err, retry })

  /** @returns {Renderable} */
  function Outlet() {
    const state = routerState
    if (state.status === 'idle' || state.status === 'loading') return loading()
    if (state.status === 'error') return errorView(state.error?.())

    const Page = state.page
    if (!Page) return error({ message: `No route matches "${state.path}".`, error: null, retry })

    const name = state.layout || defaultLayout
    const Layout = layouts[name]
    if (!Layout && (state.layout || explicitDefault) && !warned.has(name)) {
      warned.add(name)
      console.warn(`[quiver] unknown layout "${name}"`)
    }

    /** @type {Renderable} */
    let view
    try {
      view = Layout ? Layout(Page()) : Page()
    } catch (err) {
      // Synchronous render error (C-48): show the error view now; the
      // pipeline (or createApp, for the first mount) fires onError.
      reportRenderError(err)
      return errorView(err)
    }
    const keyed = /** @type {{ key?: (k: string) => Renderable }} */ (view)
    return typeof keyed?.key === 'function' ? keyed.key(state.path) : view
  }

  // A fresh reactive flag per mount (C-50): destroy() sets it to false so Arrow
  // drops the outlet's chunk and runs component onCleanup callbacks.
  const mount = reactive({ mounted: true })
  el.replaceChildren()
  html`${() => (mount.mounted ? Outlet() : '')}`(el)
  current = { target: el, mount }

  // Hooks for the initial navigation fire after the first mount (C-44).
  const report = takeInitialReport()
  const renderErrors = takeRenderErrors()
  if (report) {
    const errors = [...report.errors, ...renderErrors.map((e) => ({ error: e, phase: /** @type {const} */ ('render') }))]
    fireHooks(null, report.to, errors)
  }

  return { destroy }
}

/**
 * Tear down router, hooks, context, meta and the mounted app (D25). Idempotent;
 * works when only initRouter() ran. initRouter() + createApp() work again after it.
 * `document.title` is not restored.
 * @returns {void}
 */
export function destroy() {
  bumpEpoch()               // 1. drop in-flight loads and hooks
  stopRouter()              // 2–3. navigate listener, guards, afterEach, onError
  clearMeta()               // 4. useMeta watchers
  clearContext()            // 5. provide/inject
  if (current) {            // 6. unmount the outlet
    current.mount.mounted = false
    current.target.replaceChildren()
    current = null
  }
  resetRouterState()        // 7. fresh router state, base back to '/'
  setBase('/')
  resetRouter()             // 8. router not initialised
}
