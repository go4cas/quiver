import { html, reactive, component } from '@arrow-js/core'
import { routerState, resetRouterState } from './state.js'
import { restoreMetaDefaults } from './meta.js'
import { clearContext, provideUndoable } from './context.js'
import { setBase } from './base.js'
import {
  bumpEpoch, fireHooks, initRouter, isRouterReady, reportRenderError, resetRouter, retry,
  stopRouter, takeInitialReport, takeRenderErrors,
} from './router.js'

/** @typedef {import('./types.js').CreateAppOptions} CreateAppOptions */
/** @typedef {import('./types.js').AppOptions} AppOptions */
/** @typedef {import('./types.js').AppManifest} AppManifest */
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

/**
 * A page that returns a `component()` has its factory run here, inside the page
 * scope, so its onCleanup callbacks belong to the scope (N162). Otherwise the
 * component would sit in a template and Arrow would never clean it up (N64).
 * Reads Arrow 1.0.6's component descriptor (`h` factory, `p` props); a unit test
 * pins it, so an Arrow upgrade that changes the shape fails CI.
 * @param {Renderable} view
 * @returns {Renderable}
 */
function inScope(view) {
  const cmp = /** @type {{ h?: unknown, p?: unknown }} */ (view)
  if (cmp && typeof cmp === 'object' && typeof cmp.h === 'function') {
    return /** @type {(props: unknown, emit: () => void) => Renderable} */ (cmp.h)(cmp.p ?? {}, () => {})
  }
  return view
}

/**
 * A component factory must return a template; wrap anything else in one.
 * @param {Renderable} view
 * @returns {any}
 */
const asTemplate = (view) => (typeof view === 'function' ? view : html`${view}`)

/** @param {unknown} error @returns {string} */
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

const ALREADY_MOUNTED = 'createApp() was already called. Call destroy() first.'

/**
 * @param {Element | string} target
 * @returns {Element}
 */
function resolveTarget(target) {
  if (typeof target === 'string') {
    const el = document.querySelector(target)
    if (!el) throw new Error(`createApp(): target "${target}" not found.`)
    return el
  }
  if (typeof Element !== 'undefined' && target instanceof Element) return target
  throw new TypeError('createApp(): target must be an Element or a selector string.')
}

/**
 * Mount the app.
 *
 * With one argument (the manual form), mount the route outlet into `target`;
 * call it after `await initRouter()`. With two (C-73), take the `quiver:app`
 * manifest: provide its `config` keys and `nav`, start the router with its
 * routes and middleware, then mount, resolving to the `App`.
 * @overload
 * @param {CreateAppOptions} options
 * @returns {App}
 */
/**
 * @overload
 * @param {AppManifest} app the `quiver:app` module's default export
 * @param {AppOptions} options
 * @returns {Promise<App>}
 */
/**
 * @param {CreateAppOptions | AppManifest} appOrOptions
 * @param {AppOptions} [options]
 * @returns {App | Promise<App>}
 */
export function createApp(appOrOptions, options) {
  // Chosen by argument count (T19): the two shapes share no required key.
  if (arguments.length > 1) return startApp(/** @type {AppManifest} */ (appOrOptions), /** @type {AppOptions} */ (options))
  return mount(/** @type {CreateAppOptions} */ (appOrOptions))
}

/**
 * The two-argument form (C-73, C-74). On failure it undoes its own provide()
 * calls before rejecting, so the caller can retry without destroy() (T22).
 * @param {AppManifest} app
 * @param {AppOptions} options
 * @returns {Promise<App>}
 */
async function startApp(app, options) {
  if (app === null || typeof app !== 'object') {
    throw new TypeError('createApp(app, options): app must be the quiver:app manifest object.')
  }
  if (options === null || typeof options !== 'object') {
    throw new TypeError('createApp(app, options): options must be an object with a target.')
  }
  if (current) throw new Error(ALREADY_MOUNTED)
  const target = resolveTarget(options.target)

  /** @type {(() => void)[]} */
  const undo = []
  try {
    const config = app.config ?? {}
    for (const key of Object.keys(config)) undo.push(provideUndoable(key, config[key]))
    if (!Object.hasOwn(config, 'nav') && app.nav !== undefined) undo.push(provideUndoable('nav', app.nav))

    await initRouter({ routes: app.routes, notFound: app.notFound, base: options.base, middleware: app.middleware })

    const views = app.views ?? {}
    return mount({
      target,
      layouts: { ...app.layouts, ...options.layouts },
      defaultLayout: options.defaultLayout,
      loading: options.loading ?? views.loading,
      error: options.error ?? views.error,
    })
  } catch (error) {
    for (const fn of undo.reverse()) fn()
    throw error
  }
}

/**
 * The one-argument form: mount the route outlet into `target`.
 * @param {CreateAppOptions} options
 * @returns {App}
 */
function mount(options) {
  if (!isRouterReady()) {
    throw new Error('createApp() needs a router. Call in this order: provide(), beforeEach()/afterEach()/onError(), await initRouter(), createApp().')
  }
  if (current) throw new Error(ALREADY_MOUNTED)

  const { target, layouts = {}, loading = BareLoading, error = BareError } = options
  const explicitDefault = options.defaultLayout !== undefined
  const defaultLayout = options.defaultLayout ?? 'default'

  const el = resolveTarget(target)

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

    // The page scope (N160): Page() and Layout() run inside a private component
    // that is itself the outlet's slot value, keyed by path. Arrow runs its
    // onCleanup callbacks when it is dropped (the next navigation's loading view,
    // retry, destroy()), so onCleanup and arrow-use's cleanup work in page and
    // layout bodies, inside a layout too (N64). Reactive reads in their bodies
    // no longer re-run the outlet (N161).
    const Scope = component(() => {
      try {
        return asTemplate(Layout ? Layout(inScope(Page())) : inScope(Page()))
      } catch (err) {
        // Synchronous render error (C-48): show the error view now; the
        // pipeline (or createApp, for the first mount) fires onError.
        reportRenderError(err)
        return asTemplate(errorView(err))
      }
    })
    return Scope().key(state.path)
  }

  // A fresh reactive flag per mount (C-50): destroy() sets it to false so Arrow
  // drops the page scope and runs its onCleanup callbacks (N160).
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
 * `document.title` and the description tag go back to the host page's own (N128).
 * @returns {void}
 */
export function destroy() {
  bumpEpoch()               // 1. drop in-flight loads and hooks
  stopRouter()              // 2–3. navigate listener, guards, afterEach, onError
  restoreMetaDefaults()     // 4. useMeta watchers; host title and description back (N128)
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
