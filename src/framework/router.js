import { nextTick } from '@arrow-js/core'
import { routerState } from '../state/routerState.js'
import { clearMeta } from './meta.js'

/**
 * @typedef {{ from: string | null, to: string }} GuardContext
 * @typedef {(ctx: GuardContext) => false | string | void | Promise<false | string | void>} NavigationGuard
 * @typedef {{ default?: any, meta?: Record<string, any> }} PageModule
 */

const pageModules = import.meta.glob('../pages/**/*.js')
const notFoundLoader = pageModules['../pages/not-found.js']

const routeRecords = Object.entries(pageModules)
  .map(([file, loader]) => ({
    file,
    loader,
    path: fileToRoutePath(file),
  }))
  .sort((a, b) => scoreRoute(b.path) - scoreRoute(a.path))

/** @type {NavigationGuard[]} */
const guards = []

/**
 * @param {string} file
 * @returns {string}
 */
export function fileToRoutePath(file) {
  let path = file
    .replace('../pages', '')
    .replace(/\.js$/, '')
    .replace(/\/index$/, '')

  if (!path) path = '/'

  return path.replace(/\[([^\]]+)\]/g, ':$1')
}

/**
 * @param {string} path
 * @returns {number}
 */
export function scoreRoute(path) {
  return path
    .split('/')
    .filter(Boolean)
    .reduce((score, part) => score + (part.startsWith(':') ? 1 : 10), 0)
}

/**
 * @param {string} [path]
 * @returns {string}
 */
export function normalizePath(path = '/') {
  const clean = path.split('?')[0].split('#')[0] || '/'
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1)
  return clean
}

/**
 * @param {string} routePath
 * @param {string} urlPath
 * @returns {Record<string, string> | null} matched params, or null if no match
 */
export function matchPath(routePath, urlPath) {
  const normalizedRoute = normalizePath(routePath)
  const normalizedUrl = normalizePath(urlPath)

  const routeParts = normalizedRoute.split('/').filter(Boolean)
  const urlParts = normalizedUrl.split('/').filter(Boolean)

  if (routeParts.length !== urlParts.length) return null

  /** @type {Record<string, string>} */
  const params = {}

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i]
    const urlPart = urlParts[i]

    if (routePart.startsWith(':')) {
      try {
        params[routePart.slice(1)] = decodeURIComponent(urlPart)
      } catch {
        // Malformed percent-escape (e.g. '%zz') — use the raw segment
        // rather than turning the whole route into an error page.
        params[routePart.slice(1)] = urlPart
      }
      continue
    }

    if (routePart !== urlPart) return null
  }

  return params
}

// Supersession token: rapid navigations run resolveRoute concurrently (the
// Navigation API aborts the *navigation*, not already-running JS). Only the
// most recent call may write routerState after an await.
let resolveEpoch = 0

/**
 * @param {string} [path]
 * @returns {Promise<void>}
 */
export async function resolveRoute(path = window.location.pathname) {
  const epoch = ++resolveEpoch
  const cleanPath = normalizePath(path)

  // The router owns the meta lifecycle: stop the previous page's useMeta
  // watchers so reactive titles don't keep firing after navigation.
  clearMeta()

  Object.assign(routerState, { status: 'loading', path: cleanPath, error: '', page: null, params: {}, meta: {} })

  try {
    /** @type {Record<string, string> | null} */
    let params = null
    const route = routeRecords.find((r) => !r.file.endsWith('/not-found.js') && (params = matchPath(r.path, cleanPath)))
    const module = /** @type {PageModule | undefined} */ (await (route ? route.loader() : notFoundLoader?.()))
    if (epoch !== resolveEpoch) return // superseded by a newer navigation

    if (route && typeof module?.default !== 'function') {
      throw new Error(`${route.file} must default export a page function.`)
    }

    const meta = module?.meta || {}

    Object.assign(routerState, {
      params: params || {},
      page: module?.default ?? null,
      layout: meta.layout || 'basic',
      meta,
      status: route ? 'ready' : 'not-found',
    })
    if (meta.title) document.title = meta.title
  } catch (error) {
    if (epoch !== resolveEpoch) return // superseded by a newer navigation
    Object.assign(routerState, {
      page: null,
      layout: 'basic',
      meta: {},
      error: error instanceof Error ? error.message : String(error),
      status: 'error',
    })
  }
}

// go() is now a thin wrapper — the navigate event handler owns everything.
// AbortError is expected whenever a navigation is preempted by a newer one
// or cancelled by a guard — swallow it so call sites don't leak rejections.
/** @param {string} path */
export function go(path) {
  return window.navigation.navigate(normalizePath(path)).finished?.catch((err) => {
    if (err.name !== 'AbortError') throw err
  })
}

// beforeEach(fn) registers a navigation guard.
// Guard receives { from, to }. Return false to cancel, a path string to redirect.
// Returns an unregister function.
/**
 * @param {NavigationGuard} fn
 * @returns {() => void} unregister function
 */
export function beforeEach(fn) {
  guards.push(fn)
  return () => {
    const idx = guards.indexOf(fn)
    if (idx !== -1) guards.splice(idx, 1)
  }
}

// Runs the guard chain. Returns true to proceed, false to cancel,
// or a path string to redirect.
/**
 * @param {string | null} from
 * @param {string} to
 * @returns {Promise<true | false | string>}
 */
async function runGuards(from, to) {
  for (const guard of guards) {
    const result = await guard({ from, to })
    if (result === false || typeof result === 'string') return result
  }
  return true
}

/** @param {NavigateEvent} event */
function handleNavigate(event) {
  // Skip cross-origin navigations, downloads, etc.
  if (!event.canIntercept) return
  // Let hash-only changes pass through without a route update.
  if (event.hashChange) return
  // Guard-cancel rollback: URL-only correction, the page never changed —
  // don't re-run guards or resolveRoute (which would remount the page).
  if (/** @type {{ rollback?: boolean } | undefined} */ (event.info)?.rollback) return

  const to = normalizePath(new URL(event.destination.url).pathname)
  const from = routerState.path

  event.intercept({
    handler: async () => {
      const result = await runGuards(from, to)
      if (result === false) {
        navigation.navigate(from, { history: 'replace', info: { rollback: true } })
        return
      }
      if (typeof result === 'string') {
        navigation.navigate(normalizePath(result), { history: 'replace' })
        return
      }

      await resolveRoute(to)
      await nextTick()
    },
  })
}

export async function initRouter() {
  if (!window.navigation) {
    throw new Error('Navigation API is not supported in this browser.')
  }

  navigation.addEventListener('navigate', handleNavigate)

  // The navigate event does not fire for the initial page load, so run the
  // guard chain here too. There is no previous page to stay on, so a guard
  // returning false redirects to '/' instead of cancelling. Redirects re-run
  // the guards for the new destination, capped to avoid an infinite loop.
  let to = normalizePath(window.location.pathname)
  for (let i = 0; i < 10; i++) {
    const result = await runGuards(null, to)
    if (result === true) break
    const next = normalizePath(typeof result === 'string' ? result : '/')
    if (next === to) break
    history.replaceState(null, '', next)
    to = next
  }

  return resolveRoute(to)
}

export function destroyRouter() {
  navigation.removeEventListener('navigate', handleNavigate)
}
