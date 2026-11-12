import { nextTick } from '@arrow-js/core'
import { routerState } from './state.js'
import { captureMetaDefaults, clearMeta, resetMeta } from './meta.js'
import { resolveBase, setBase, stripBase, url } from './base.js'
import {
  compareRoutes, compareSections, matchPath, normalizePath, sectionCovers, validateManifest, validateMiddleware,
} from './match.js'

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
/** @typedef {import('./state.js').RouterState} RouterState */
/**
 * The navigations started on behalf of one go(), retry(), back(), forward() or
 * link click: guard redirects and rollbacks set `next`, so the caller's promise
 * waits for the whole chain (N127).
 * @typedef {{ next: SettleableResult | null }} NavOp
 */
/** @typedef {{ redirects?: number, first?: string, rollback?: boolean, retry?: boolean, op?: NavOp }} NavInfo */
/**
 * One run of the pipeline (the initial load or one intercepted navigation). Only
 * the newest one, `currentNav`, may write state or fire hooks (§2 step 2); a
 * superseded run sees `nav !== currentNav` after an await and stops. What it
 * owes is kept on it, so starting a newer run drops it with it (R14, N171).
 * @typedef {Object} Nav
 * @property {unknown[]} renderErrors render errors the outlet reported while this run was current
 * @property {{ to: string, errors: PipelineError[] } | null} report hooks owed for the initial
 *   navigation until createApp() mounts (C-44)
 */
/**
 * What the guards decided for one navigation, classified once for the initial
 * load and for in-app navigations (R14, N171).
 * @typedef {{ kind: 'superseded' } | { kind: 'proceed' } | { kind: 'cancel' }
 *   | { kind: 'error', error: unknown } | { kind: 'redirect', to: string, href: string }} GuardOutcome
 */

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
/** @type {NavigationGuard[]} global middleware from initRouter(), in order (C-71) */
let globalMiddleware = []
/** @type {{ pattern: string, guards: NavigationGuard[] }[]} sections, outermost first (M-21) */
let sections = []
/** @type {{ fn: AfterEachHook }[]} */
const afterHooks = []
/** @type {{ fn: ErrorHook }[]} */
const errorHooks = []

/** 'off' before initRouter() and after destroy(); 'starting' while the initial navigation runs. */
let phase = /** @type {'off' | 'starting' | 'ready'} */ ('off')
// Bumped by destroy(), so an initRouter() still awaiting its first load knows it was torn down.
let generation = 0
/** @type {Nav | null} the newest navigation; null before initRouter() and after destroy() */
let currentNav = null
/**
 * The last navigation that committed: its history entry and router state. A
 * cancelled navigation goes back to it (N126).
 * @type {{ key: string | undefined, url: string, state: Omit<RouterState, never> } | null}
 */
let settled = null
// True while a navigation has replaced the settled state with 'loading'.
let unsettled = false
// True between a same-document fragment navigation's navigate event and its
// commit, so the settled entry can follow it (N201).
let hashPending = false
// The info objects Quiver passes to the Navigation API. Only these are read as
// rollback/retry/redirect markers, so an app's own `info` is never mistaken for
// one (N129).
/** @type {WeakSet<object>} */
const internal = new WeakSet()

/**
 * @param {NavInfo} info
 * @returns {NavInfo}
 */
function mark(info) {
  internal.add(info)
  return info
}

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

/**
 * Settle on `result` and on every navigation the router started for the same
 * operation (a guard redirect, a rollback), so the promise resolves once the
 * final one finishes. An unrelated navigation that supersedes it ends the
 * chain (N127).
 * @param {SettleableResult} result
 * @param {NavOp} op
 * @returns {Promise<void>}
 */
async function settleChain(result, op) {
  for (let current = result; ;) {
    await settle(current)
    const next = op.next
    if (!next || next === current) return
    current = next
  }
}

/**
 * Start a navigation for an operation: the caller's promise follows it, and a
 * failure is logged rather than left unhandled.
 * @param {NavOp} op
 * @param {SettleableResult} result
 */
function follow(op, result) {
  op.next = result
  settle(result).catch((error) => console.error('[quiver] navigation failed', error))
}

/**
 * @param {(info: NavInfo) => SettleableResult} start
 * @param {NavInfo} [extra]
 * @returns {Promise<void>}
 */
function run(start, extra) {
  /** @type {NavOp} */
  const op = { next: null }
  return settleChain(start(mark({ ...extra, op })), op)
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
  return run((info) => navigation.navigate(url(path), { info }))
}

/** @returns {Promise<void>} re-runs the pipeline for the current URL (C-46) */
export function retry() {
  assertRouter()
  return run((info) => navigation.reload({ info }), { retry: true })
}

/**
 * Back or forward one entry; resolves when the traversal and any redirect or
 * rollback it causes finish.
 * @param {-1 | 1} direction
 * @returns {Promise<void>}
 */
export function traverse(direction) {
  return run((info) => (direction < 0 ? navigation.back({ info }) : navigation.forward({ info })))
}

// ---------------------------------------------------------------- pipeline (§2)

/**
 * Step 3's guards for `to`, in order (C-71, T20): `beforeEach` guards, global
 * middleware, then the sections covering the route `to` matches, outermost
 * first. Matching uses the sorted routes of step 4 and loads nothing; a path
 * that matches no route (not-found) gets global middleware only.
 * @param {string} to
 * @returns {NavigationGuard[]}
 */
function guardsFor(to) {
  const list = [...guards.map((g) => g.fn), ...globalMiddleware]
  if (sections.length) {
    const route = records.find((r) => matchPath(r.pattern, to))
    if (route) {
      for (const section of sections) {
        if (sectionCovers(section.pattern, route.pattern)) list.push(...section.guards)
      }
    }
  }
  return list
}

/**
 * @param {Nav} nav
 * @param {string | null} from
 * @param {string} to
 * @returns {Promise<true | false | string | null>} null when a newer navigation took over,
 *   so a superseded navigation calls no further guards (N126)
 */
async function runGuards(nav, from, to) {
  for (const fn of guardsFor(to)) {
    const result = await fn({ from, to })
    if (nav !== currentNav) return null
    if (result === false || typeof result === 'string') return result
  }
  return true
}

/**
 * The href for a guard's redirect. It must stay a base-relative path in this
 * app: an absolute URL, `//host`, or a path that leaves the base is a guard
 * error, not a navigation (N129).
 * @param {string} target
 * @returns {string}
 */
function redirectHref(target) {
  const href = url(target)
  /** @type {URL | null} */
  let dest = null
  try {
    dest = new URL(href, window.location.href)
  } catch {}
  if (!dest || dest.origin !== window.location.origin || stripBase(dest.pathname) === null) {
    throw new Error(`A guard redirected to "${target}". Redirects must be base-relative paths inside the app; use go() for other URLs.`)
  }
  return href
}

/** @type {GuardOutcome} */
const SUPERSEDED = { kind: 'superseded' }
/** @type {GuardOutcome} */
const PROCEED = { kind: 'proceed' }
/** @type {GuardOutcome} */
const CANCEL = { kind: 'cancel' }

/**
 * Steps 2–3: run the guards for `to` and classify their decision. `false`
 * cancels back to the last committed route; with none yet (the initial load, or
 * a navigation during startup) there is no page to stay on, so it goes to '/'
 * (C-16). A redirect to the path being navigated to proceeds, so the cap only
 * catches real cycles (N66). A redirect must stay inside the app (N129).
 * @param {Nav} nav
 * @param {string | null} from
 * @param {string} to
 * @param {number} redirects redirect hops already taken
 * @param {string} first the path the chain started from, for the cap's message
 * @returns {Promise<GuardOutcome>}
 */
async function decide(nav, from, to, redirects, first) {
  /** @type {true | false | string | null} */
  let result
  try {
    result = await runGuards(nav, from, to)
  } catch (error) {
    return nav === currentNav ? { kind: 'error', error } : SUPERSEDED
  }
  if (result === null) return SUPERSEDED
  if (result === true) return PROCEED
  if (result === false) {
    if (settled) return CANCEL
    result = '/'
  }
  const next = normalizePath(result)
  if (next === to) return PROCEED
  /** @type {string} */
  let href
  try {
    href = redirectHref(result)
  } catch (error) {
    return { kind: 'error', error }
  }
  if (redirects >= MAX_REDIRECTS) {
    return { kind: 'error', error: new Error(`Too many redirects (${MAX_REDIRECTS}) from "${first}".`) }
  }
  return { kind: 'redirect', to: next, href }
}

/** A navigation committed: remember it as the one a cancel goes back to. */
function markSettled() {
  unsettled = false
  const entry = navigation.currentEntry
  settled = { key: entry?.key, url: entry?.url ?? window.location.href, state: { ...routerState } }
}

/**
 * A fragment navigation the browser handled itself (a `#top` link,
 * `location.hash = …`) committed: the page didn't change, so the settled
 * route now lives on the new entry and a cancel goes back to it, fragment
 * included (N201).
 */
function onEntryChange() {
  if (!hashPending) return
  hashPending = false
  const entry = navigation.currentEntry
  if (!settled || !entry?.url) return
  if (withoutHash(entry.url) !== withoutHash(settled.url)) return
  settled.key = entry.key
  settled.url = entry.url
}

/** @param {string} href @returns {string} */
const withoutHash = (href) => href.split('#')[0]

/**
 * A guard cancelled: put back the last committed route and its history entry.
 * With a precommit handler a cancelled push or replace never committed, so
 * there is nothing to put back unless an earlier navigation had started
 * loading (N201). Without one, a traversal or a push goes back to that entry,
 * so no history entry is added or rewritten; a replace puts its URL back in
 * place (N126). The browser has already dropped the Forward entries of a
 * committed push (N201).
 * @param {NavOp} op
 */
function rollback(op) {
  const target = /** @type {NonNullable<typeof settled>} */ (settled)
  if (unsettled) {
    // A superseded navigation had started loading: show the committed route again.
    unsettled = false
    Object.assign(routerState, target.state)
    resetMeta(target.state.meta)
  }
  const current = navigation.currentEntry
  const info = mark({ rollback: true })
  if (target.key !== undefined && current?.key !== target.key &&
      navigation.entries().some((entry) => entry.key === target.key)) {
    follow(op, navigation.traverseTo(target.key, { info }))
  } else if (current?.url !== target.url) {
    follow(op, navigation.navigate(target.url, { history: 'replace', info }))
  }
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
  resetMeta()
  markSettled()
  return [{ error, phase }]
}

/**
 * Steps 4–6: load the route for `to` and commit it.
 * @param {Nav} nav
 * @param {string} to
 * @returns {Promise<PipelineError[] | null>} errors to report, or null when superseded
 */
async function load(nav, to) {
  clearMeta()
  unsettled = true
  Object.assign(routerState, { status: 'loading', path: to, params: {}, meta: {}, page: null, layout: '', error: null })

  /** @type {Record<string, string> | null} */
  let params = null
  const route = records.find((r) => (params = matchPath(r.pattern, to)))
  const loader = route ? route.loader : notFoundLoader

  if (!loader) {
    routerState.status = 'not-found'
    resetMeta()
    markSettled()
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
    if (nav !== currentNav) return null
    return commitError(error, 'load', to)
  }
  if (nav !== currentNav) return null

  const meta = module.meta || {}
  Object.assign(routerState, {
    params: params || {},
    page: module.default,
    layout: typeof meta.layout === 'string' ? meta.layout : '',
    meta,
    status: route ? 'ready' : 'not-found',
  })
  resetMeta(meta)
  markSettled()
  return []
}

/**
 * Start a navigation. It supersedes the previous one, and whatever that one was
 * still owed (render errors, the initial report) goes with it.
 * @returns {Nav}
 */
function begin() {
  currentNav = { renderErrors: [], report: null }
  return currentNav
}

/**
 * Steps 7–8 for an in-app navigation: let Arrow render, collect render errors,
 * make sure the error view is in the DOM, then fire hooks.
 * @param {Nav} nav
 * @param {string | null} from
 * @param {string} to
 * @param {PipelineError[]} errors
 */
async function renderAndReport(nav, from, to, errors) {
  await nextTick()
  if (nav !== currentNav) return
  if (nav.renderErrors.length) {
    for (const error of nav.renderErrors) errors.push({ error, phase: 'render' })
    await nextTick() // the outlet re-renders into the error view (C-26)
    if (nav !== currentNav) return
  }
  fireHooks(from, to, errors)
}

/**
 * The outlet reports a synchronous Page()/Layout() throw here (C-48).
 * @param {unknown} error
 */
export function reportRenderError(error) {
  currentNav?.renderErrors.push(error)
  Object.assign(routerState, { status: 'error', error: () => error, page: null, layout: '', meta: {} })
  // Drop what the failed render's useMeta() set, watchers included (N128).
  resetMeta()
  if (settled) settled.state = { ...routerState }
}

/** @returns {unknown[]} render errors collected since the current navigation began */
export function takeRenderErrors() {
  return currentNav ? currentNav.renderErrors.splice(0) : []
}

/**
 * @param {string | null} from
 * @param {string} to
 * @param {NavInfo | undefined} info
 * @param {NavOp} op
 */
async function pipeline(from, to, info, op) {
  const nav = begin()
  const redirects = info?.redirects ?? 0
  const first = info?.first ?? to

  const outcome = await decide(nav, from, to, redirects, first)
  if (nav !== currentNav) return

  /** @type {PipelineError[] | null} */
  let errors
  switch (outcome.kind) {
    case 'superseded':
      return
    case 'cancel':
      // Go back to the last committed route and entry, query and hash
      // included, without re-running anything (2.x, N126).
      rollback(op)
      return
    case 'redirect':
      // The redirect target runs its own pipeline and fires the hooks; the
      // caller's go() waits for it (N127).
      follow(op, navigation.navigate(outcome.href, { history: 'replace', info: mark({ redirects: redirects + 1, first, op }) }))
      return
    case 'error':
      errors = commitError(outcome.error, 'guard', to)
      break
    default:
      errors = await load(nav, to)
      if (!errors) return
  }
  await renderAndReport(nav, from, to, errors)
}

/** A cancelled navigation that never committed rejects with this, so settle() ignores it. */
const aborted = () => new DOMException('A guard cancelled the navigation.', 'AbortError')

/**
 * Whether the guards for `event` can run before it commits (N201): a push or a
 * replace, in a browser with the Navigation API's precommit handlers. A
 * traversal or a reload, or a browser without them, commits first and is
 * rolled back on cancel (N126).
 * @param {NavigateEvent} event
 * @returns {boolean}
 */
function canPrecommit(event) {
  return typeof (/** @type {any} */ (globalThis).NavigationPrecommitController) === 'function' &&
    event.cancelable && (event.navigationType === 'push' || event.navigationType === 'replace')
}

/**
 * Steps 2–3 before the navigation commits (N201): run the guards and follow
 * redirects inside the same navigation, so a push stays one entry. A cancel
 * aborts it, so the URL, the history entries and the current position don't
 * change; only a route still loading for an earlier navigation is put back.
 * @param {Nav} nav
 * @param {string | null} from
 * @param {string} to
 * @param {NavInfo | undefined} info
 * @param {NavOp} op
 * @param {{ redirect: (url: string) => void }} controller
 * @returns {Promise<{ to: string, error?: unknown, failed: boolean }>}
 */
async function guardBeforeCommit(nav, from, to, info, op, controller) {
  const first = info?.first ?? to
  let hops = info?.redirects ?? 0
  /** @type {string | null} */
  let href = null
  for (;;) {
    const outcome = await decide(nav, from, to, hops, first)
    if (nav !== currentNav || outcome.kind === 'superseded') throw aborted()
    if (outcome.kind === 'cancel') {
      rollback(op)
      throw aborted()
    }
    if (outcome.kind === 'redirect') {
      to = outcome.to
      href = outcome.href
      hops++
      continue
    }
    if (href !== null) controller.redirect(href)
    return outcome.kind === 'error' ? { to, error: outcome.error, failed: true } : { to, failed: false }
  }
}

/**
 * Steps 4–8 after a precommit-guarded navigation committed.
 * @param {Nav} nav
 * @param {string | null} from
 * @param {{ to: string, error?: unknown, failed: boolean }} plan
 */
async function afterCommit(nav, from, plan) {
  if (nav !== currentNav) return
  const errors = plan.failed ? commitError(plan.error, 'guard', plan.to) : await load(nav, plan.to)
  if (!errors) return
  await renderAndReport(nav, from, plan.to, errors)
}

/** @param {NavigateEvent} event */
function handleNavigate(event) {
  if (!event.canIntercept) return
  if (event.hashChange) {
    // The browser scrolls to the fragment itself; remember to follow the entry (N201).
    hashPending = true
    return
  }
  if (event.downloadRequest != null) return
  if (event.formData != null) return // a form POST is left to the browser
  const info = /** @type {NavInfo | undefined} */ (internal.has(event.info) ? event.info : undefined)
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
  // The route on screen, not one still loading for a superseded navigation (N126).
  const from = settled?.state.path || null
  const op = info?.op ?? { next: null }
  if (canPrecommit(event)) {
    const nav = begin()
    /** @type {{ to: string, error?: unknown, failed: boolean } | null} */
    let plan = null
    // `precommitHandler` isn't in every TypeScript DOM lib yet.
    const options = {
      precommitHandler: async (/** @type {{ redirect: (url: string) => void }} */ controller) => {
        plan = await guardBeforeCommit(nav, from, to, info, op, controller)
      },
      handler: async () => {
        if (plan) await afterCommit(nav, from, plan)
      },
    }
    event.intercept(/** @type {NavigationInterceptOptions} */ (options))
    return
  }
  event.intercept({ handler: () => pipeline(from, to, info, op) })
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

  const { routes, notFound, base, middleware } = options ?? /** @type {Partial<InitRouterOptions>} */ ({})
  validateManifest(routes, notFound)
  validateMiddleware(middleware)
  const resolvedBase = resolveBase(base)

  const relative = stripBase(window.location.pathname, resolvedBase)
  if (relative === null) {
    throw new Error(`Current URL "${window.location.pathname}" is outside base "${resolvedBase}".`)
  }

  setBase(resolvedBase)
  captureMetaDefaults()
  records = Object.entries(/** @type {RouteManifest} */ (routes))
    .map(([pattern, loader]) => ({ pattern, loader }))
    .sort((a, b) => compareRoutes(a.pattern, b.pattern))
  notFoundLoader = notFound
  globalMiddleware = [...(middleware?.global ?? [])]
  sections = Object.entries(middleware?.sections ?? {})
    .map(([pattern, list]) => ({ pattern, guards: [...list] }))
    .sort((a, b) => compareSections(a.pattern, b.pattern))
  phase = 'starting'
  const gen = generation

  navigation.addEventListener('navigate', handleNavigate)
  navigation.addEventListener('currententrychange', onEntryChange)

  // The navigate event doesn't fire for the initial load, so run the guards
  // here, following redirects by rewriting the URL in place.
  const nav = begin()
  let to = normalizePath(relative)
  const first = to
  /** @type {PipelineError[] | null} */
  let errors = null

  for (let hops = 0; ; hops++) {
    const outcome = await decide(nav, null, to, hops, first)
    if (nav !== currentNav) break
    if (outcome.kind === 'redirect') {
      history.replaceState(history.state, '', outcome.href)
      to = outcome.to
      continue
    }
    if (outcome.kind === 'error') errors = commitError(outcome.error, 'guard', to)
    break
  }

  if (nav === currentNav && !errors) errors = await load(nav, to)
  if (gen !== generation) return // destroy() ran while loading

  if (nav === currentNav && errors) nav.report = { to, errors }
  phase = 'ready'
}

/** @returns {boolean} true once initRouter() has resolved */
export function isRouterReady() {
  return phase === 'ready'
}

/** @returns {{ to: string, errors: PipelineError[] } | null} the initial navigation's report, once */
export function takeInitialReport() {
  const report = currentNav?.report ?? null
  if (currentNav) currentNav.report = null
  return report
}

/** Step 1 of destroy(): drop in-flight loads and hooks. */
export function bumpEpoch() {
  currentNav = null
  generation++
}

/** Steps 2–3 of destroy(): stop listening, clear guards, middleware (C-72) and hooks. */
export function stopRouter() {
  if (phase !== 'off' && typeof navigation !== 'undefined') {
    navigation.removeEventListener('navigate', handleNavigate)
    navigation.removeEventListener('currententrychange', onEntryChange)
  }
  guards.length = 0
  globalMiddleware = []
  sections = []
  afterHooks.length = 0
  errorHooks.length = 0
}

/** Step 8 of destroy(): forget the manifest and mark the router as not initialised. */
export function resetRouter() {
  records = []
  notFoundLoader = undefined
  currentNav = null
  settled = null
  unsettled = false
  hashPending = false
  phase = 'off'
}
