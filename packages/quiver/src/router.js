import { nextTick } from '@arrow-js/core'
import { routerState } from './state.js'
import { clearMeta } from './meta.js'
import { resolveBase, setBase, stripBase, url } from './base.js'
import { compareRoutes, matchPath, normalizePath, validateManifest } from './match.js'

/** @typedef {import('./types.js').RouteLoader} RouteLoader */
/** @typedef {import('./types.js').RouteManifest} RouteManifest */
/** @typedef {import('./types.js').PageModule} PageModule */
/** @typedef {import('./types.js').InitRouterOptions} InitRouterOptions */
/** @typedef {import('./types.js').NavigationGuard} NavigationGuard */
/** @typedef {import('./types.js').AfterEachHook} AfterEachHook */
/** @typedef {import('./types.js').ErrorHook} ErrorHook */
/** @typedef {import('./types.js').ErrorPhase} ErrorPhase */
/** @typedef {import('./types.js').FinalStatus} FinalStatus */
/** @typedef {{ error: unknown, phase: ErrorPhase }} PipelineError */
/** @typedef {{ redirects?: number, first?: string, rollback?: boolean, retry?: boolean }} NavInfo */

const MAX_REDIRECTS = 10
const NO_NAVIGATION_API =
  'Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+). See https://go4cas.github.io/quiver/guide/routing#browser-support'
const NOT_INITIALISED = 'Quiver router is not initialised. Call initRouter() first.'

/** @type {{ pattern: string, loader: RouteLoader }[]} most specific first (M-6) */
let records = []
/** @type {RouteLoader | undefined} */
let notFoundLoader

/** @type {{ fn: NavigationGuard }[]} */
const guards = []
/** @type {{ fn: AfterEachHook }[]} */
const afterHooks = []
/** @type {{ fn: ErrorHook }[]} */
const errorHooks = []

/** 'off' before initRouter() and after destroy(); 'starting' while the initial navigation runs. */
let phase = /** @type {'off' | 'starting' | 'ready'} */ ('off')
// Bumped by destroy(), so an initRouter() still awaiting its first load knows it was torn down.
let generation = 0
// Supersession token (§2 step 2): only the newest navigation may write state or fire hooks.
let navEpoch = 0
/** @type {unknown[]} render errors reported by the outlet during the current navigation */
let renderErrors = []
/** @type {{ to: string, errors: PipelineError[] } | null} hooks owed for the initial navigation (C-44) */
let initialReport = null

// ---------------------------------------------------------------- registration

/**
 * @template F
 * @param {{ fn: F }[]} list
 * @param {F} fn
 * @returns {() => void} idempotent unregister
 */
function register(list, fn) {
  const entry = { fn }
  list.push(entry)
  return () => {
    const i = list.indexOf(entry)
    if (i !== -1) list.splice(i, 1)
  }
}

/**
 * Register a navigation guard. It receives base-relative `{ from, to }`; return
 * `false` to cancel, a path string to redirect, anything else to proceed.
 * @param {NavigationGuard} fn
 * @returns {() => void} unregister
 */
export function beforeEach(fn) {
  return register(guards, fn)
}

/**
 * Run `fn({ from, to, status })` after every navigation that commits.
 * @param {AfterEachHook} fn
 * @returns {() => void} unregister
 */
export function afterEach(fn) {
  return register(afterHooks, fn)
}

/**
 * Run `fn({ error, from, to, phase })` after a guard, load or render error has
 * reached the error view.
 * @param {ErrorHook} fn
 * @returns {() => void} unregister
 */
export function onError(fn) {
  return register(errorHooks, fn)
}

/**
 * Call each handler with `ctx`, in registration order, over a copy (C-33).
 * A throwing handler is logged and the rest still run (C-34).
 * @template C
 * @param {{ fn: (ctx: C) => void }[]} list
 * @param {C} ctx
 * @param {string} name
 */
function callEach(list, ctx, name) {
  for (const { fn } of [...list]) {
    try {
      fn(ctx)
    } catch (err) {
      console.error(`[quiver] ${name} handler threw`, err)
    }
  }
}

/**
 * @param {string | null} from
 * @param {string} to
 * @param {PipelineError[]} errors
 */
export function fireHooks(from, to, errors) {
  for (const { error, phase } of errors) callEach(errorHooks, { error, from, to, phase }, 'onError')
  const status = /** @type {FinalStatus} */ (routerState.status)
  callEach(afterHooks, { from, to, status }, 'afterEach')
}

// ---------------------------------------------------------------- navigation helpers

/**
 * The part of the DOM's `NavigationResult` that settle() reads, declared here
 * because the emitted .d.ts must not name `NavigationResult`: TypeScript 5.x's
 * DOM lib doesn't have it, so consumers without skipLibCheck got TS2304 (N124).
 * @typedef {{ committed?: Promise<unknown>, finished?: Promise<unknown> }} SettleableResult
 */

/**
 * Settle on a Navigation API result: resolve when it finishes, swallow
 * AbortError (a newer navigation or a guard won), rethrow anything else.
 * @param {SettleableResult | undefined} result
 * @returns {Promise<void>}
 */
export function settle(result) {
  result?.committed?.catch(() => {})
  return Promise.resolve(result?.finished).then(
    () => {},
    (err) => {
      if (err?.name !== 'AbortError') throw err
    },
  )
}

/** Throws unless initRouter() has been called (and destroy() hasn't since). */
export function assertRouter() {
  if (phase === 'off') throw new Error(NOT_INITIALISED)
}

/**
 * Navigate to a base-relative path (query and hash kept) or an absolute URL.
 * @param {string} path
 * @returns {Promise<void>} settles when the navigation and its afterEach handlers finish
 */
export function go(path) {
  assertRouter()
  return settle(navigation.navigate(url(path)))
}

/** @returns {Promise<void>} re-runs the pipeline for the current URL (C-46) */
export function retry() {
  assertRouter()
  return settle(navigation.reload({ info: { retry: true } }))
}

// ---------------------------------------------------------------- pipeline (§2)

/**
 * @param {string | null} from
 * @param {string} to
 * @returns {Promise<true | false | string>}
 */
async function runGuards(from, to) {
  for (const { fn } of [...guards]) {
    const result = await fn({ from, to })
    if (result === false || typeof result === 'string') return result
  }
  return true
}

/**
 * Step 6: record an error and return it for the hooks.
 * @param {unknown} error
 * @param {ErrorPhase} phase
 * @param {string} to
 * @returns {PipelineError[]}
 */
function commitError(error, phase, to) {
  Object.assign(routerState, { status: 'error', error: () => error, path: to, params: {}, page: null, layout: '', meta: {} })
  return [{ error, phase }]
}

/**
 * Steps 4–6: load the route for `to` and commit it.
 * @param {number} epoch
 * @param {string} to
 * @returns {Promise<PipelineError[] | null>} errors to report, or null when superseded
 */
async function load(epoch, to) {
  clearMeta()
  Object.assign(routerState, { status: 'loading', path: to, params: {}, meta: {}, page: null, layout: '', error: null })

  /** @type {Record<string, string> | null} */
  let params = null
  const route = records.find((r) => (params = matchPath(r.pattern, to)))
  const loader = route ? route.loader : notFoundLoader

  if (!loader) {
    routerState.status = 'not-found'
    return []
  }

  /** @type {PageModule} */
  let module
  try {
    module = await loader()
    if (typeof module?.default !== 'function') {
      throw new Error(route
        ? `Route "${route.pattern}" must default export a page function.`
        : 'The notFound page must default export a page function.')
    }
  } catch (error) {
    if (epoch !== navEpoch) return null
    return commitError(error, 'load', to)
  }
  if (epoch !== navEpoch) return null

  const meta = module.meta || {}
  Object.assign(routerState, {
    params: params || {},
    page: module.default,
    layout: typeof meta.layout === 'string' ? meta.layout : '',
    meta,
    status: route ? 'ready' : 'not-found',
  })
  if (typeof meta.title === 'string' && meta.title) document.title = meta.title
  return []
}

/** Start a navigation: bump the epoch and drop anything owed to an older one. */
function begin() {
  renderErrors = []
  initialReport = null
  return ++navEpoch
}

/**
 * Steps 7–8 for an in-app navigation: let Arrow render, collect render errors,
 * make sure the error view is in the DOM, then fire hooks.
 * @param {number} epoch
 * @param {string | null} from
 * @param {string} to
 * @param {PipelineError[]} errors
 */
async function renderAndReport(epoch, from, to, errors) {
  await nextTick()
  if (epoch !== navEpoch) return
  if (renderErrors.length) {
    for (const error of renderErrors) errors.push({ error, phase: 'render' })
    await nextTick() // the outlet re-renders into the error view (C-26)
    if (epoch !== navEpoch) return
  }
  fireHooks(from, to, errors)
}

/**
 * The outlet reports a synchronous Page()/Layout() throw here (C-48).
 * @param {unknown} error
 */
export function reportRenderError(error) {
  renderErrors.push(error)
  Object.assign(routerState, { status: 'error', error: () => error, page: null, layout: '', meta: {} })
}

/** @returns {unknown[]} render errors collected since the current navigation began */
export function takeRenderErrors() {
  const errors = renderErrors
  renderErrors = []
  return errors
}

/**
 * @param {string | null} from
 * @param {string} to
 * @param {NavInfo | undefined} info
 * @param {string | undefined} fromUrl  the full URL to put back if a guard cancels
 */
async function pipeline(from, to, info, fromUrl) {
  const epoch = begin()
  const redirects = info?.redirects ?? 0
  const first = info?.first ?? to

  /** @type {PipelineError[] | null} */
  let errors = null
  /** @type {true | false | string} */
  let result = true
  try {
    result = await runGuards(from, to)
  } catch (error) {
    if (epoch !== navEpoch) return
    errors = commitError(error, 'guard', to)
  }
  if (epoch !== navEpoch) return

  if (!errors && result === false) {
    // Cancel: put the previous URL back, query and hash included, without
    // re-running anything (2.x).
    settle(navigation.navigate(fromUrl ?? url(from ?? '/'), { history: 'replace', info: { rollback: true } }))
    return
  }
  // A redirect to the path being navigated to proceeds, as on the initial load
  // (C-16), so the redirect cap only catches real cycles (N66).
  if (!errors && typeof result === 'string' && normalizePath(result) !== to) {
    if (redirects >= MAX_REDIRECTS) {
      errors = commitError(new Error(`Too many redirects (${MAX_REDIRECTS}) from "${first}".`), 'guard', to)
    } else {
      // The redirect target runs its own pipeline and fires the hooks.
      settle(navigation.navigate(url(result), { history: 'replace', info: { redirects: redirects + 1, first } }))
      return
    }
  }

  if (!errors) {
    errors = await load(epoch, to)
    if (!errors) return
  }
  await renderAndReport(epoch, from, to, errors)
}

/** @param {NavigateEvent} event */
function handleNavigate(event) {
  if (!event.canIntercept) return
  if (event.hashChange) return
  if (event.downloadRequest != null) return
  if (event.formData != null) return // a form POST is left to the browser
  const info = /** @type {NavInfo | undefined} */ (event.info)
  // A reload that isn't retry() (location.reload(), Vite's full reload) is a real
  // document reload, as it is without Quiver (N73).
  if (event.navigationType === 'reload' && !info?.retry) return
  // Guard-cancel rollback: a URL-only correction, the page never changed.
  // Intercept with no handler, so the URL changes without a document load and
  // without running the pipeline (N72).
  if (info?.rollback) {
    event.intercept()
    return
  }

  const relative = stripBase(new URL(event.destination.url).pathname)
  if (relative === null) return // outside the base: a normal document load (R3)

  const to = normalizePath(relative)
  const from = routerState.path || null
  // Still the previous entry: intercept() hasn't committed the new URL yet.
  const fromUrl = navigation.currentEntry?.url ?? undefined
  event.intercept({ handler: () => pipeline(from, to, info, fromUrl) })
}

// ---------------------------------------------------------------- lifecycle

/**
 * Start the router: validate the manifest, resolve the base, listen for
 * navigations and load the current URL. Resolves once the route has loaded;
 * guard, load and not-found outcomes are reported when createApp() mounts.
 * @param {InitRouterOptions} options
 * @returns {Promise<void>}
 */
export async function initRouter(options) {
  if (typeof window === 'undefined' || !window.navigation) throw new Error(NO_NAVIGATION_API)
  if (phase !== 'off') throw new Error('initRouter() was already called. Call destroy() first.')

  const { routes, notFound, base } = options ?? /** @type {Partial<InitRouterOptions>} */ ({})
  validateManifest(routes, notFound)
  const resolvedBase = resolveBase(base)

  const relative = stripBase(window.location.pathname, resolvedBase)
  if (relative === null) {
    throw new Error(`Current URL "${window.location.pathname}" is outside base "${resolvedBase}".`)
  }

  setBase(resolvedBase)
  records = Object.entries(/** @type {RouteManifest} */ (routes))
    .map(([pattern, loader]) => ({ pattern, loader }))
    .sort((a, b) => compareRoutes(a.pattern, b.pattern))
  notFoundLoader = notFound
  phase = 'starting'
  const gen = generation

  navigation.addEventListener('navigate', handleNavigate)

  // The navigate event doesn't fire for the initial load, so run the guards
  // here. There is no previous page to stay on: false redirects to '/'.
  const epoch = begin()
  let to = normalizePath(relative)
  const first = to
  /** @type {PipelineError[] | null} */
  let errors = null

  for (let hops = 0; ; hops++) {
    /** @type {true | false | string} */
    let result
    try {
      result = await runGuards(null, to)
    } catch (error) {
      if (epoch !== navEpoch) break
      errors = commitError(error, 'guard', to)
      break
    }
    if (epoch !== navEpoch || result === true) break
    const target = result === false ? '/' : result
    const next = normalizePath(target)
    if (next === to) break // 2.x: a redirect to the current path proceeds
    if (hops === MAX_REDIRECTS) {
      errors = commitError(new Error(`Too many redirects (${MAX_REDIRECTS}) from "${first}".`), 'guard', to)
      break
    }
    history.replaceState(history.state, '', url(target))
    to = next
  }

  if (epoch === navEpoch && !errors) errors = await load(epoch, to)
  if (gen !== generation) return // destroy() ran while loading

  if (epoch === navEpoch && errors) initialReport = { to, errors }
  phase = 'ready'
}

/** @returns {boolean} true once initRouter() has resolved */
export function isRouterReady() {
  return phase === 'ready'
}

/** @returns {{ to: string, errors: PipelineError[] } | null} the initial navigation's report, once */
export function takeInitialReport() {
  const report = initialReport
  initialReport = null
  return report
}

/** Step 1 of destroy(): drop in-flight loads and hooks. */
export function bumpEpoch() {
  navEpoch++
  generation++
}

/** Steps 2–3 of destroy(): stop listening, clear guards and hooks. */
export function stopRouter() {
  if (phase !== 'off' && typeof navigation !== 'undefined') {
    navigation.removeEventListener('navigate', handleNavigate)
  }
  guards.length = 0
  afterHooks.length = 0
  errorHooks.length = 0
}

/** Step 8 of destroy(): forget the manifest and mark the router as not initialised. */
export function resetRouter() {
  records = []
  notFoundLoader = undefined
  renderErrors = []
  initialReport = null
  phase = 'off'
}
