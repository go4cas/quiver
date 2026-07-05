import { nextTick } from '@arrow-js/core'
import { routerState } from '../state/routerState.js'

const pageModules = import.meta.glob('../pages/**/*.js')

const routeRecords = Object.entries(pageModules)
  .map(([file, loader]) => ({
    file,
    loader,
    path: fileToRoutePath(file),
  }))
  .sort((a, b) => scoreRoute(b.path) - scoreRoute(a.path))

const guards = []

export function fileToRoutePath(file) {
  let path = file
    .replace('../pages', '')
    .replace(/\.js$/, '')
    .replace(/\/index$/, '')

  if (!path) path = '/'

  return path.replace(/\[([^\]]+)\]/g, ':$1')
}

export function scoreRoute(path) {
  if (path === '/') return 0

  return path
    .split('/')
    .filter(Boolean)
    .reduce((score, part) => score + (part.startsWith(':') ? 1 : 10), 0)
}

export function normalizePath(path = '/') {
  const clean = path.split('?')[0].split('#')[0] || '/'
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1)
  return clean
}

export function matchPath(routePath, urlPath) {
  const normalizedRoute = normalizePath(routePath)
  const normalizedUrl = normalizePath(urlPath)

  if (normalizedRoute === '/' && normalizedUrl === '/') return {}

  const routeParts = normalizedRoute.split('/').filter(Boolean)
  const urlParts = normalizedUrl.split('/').filter(Boolean)

  if (routeParts.length !== urlParts.length) return null

  const params = {}

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i]
    const urlPart = urlParts[i]

    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(urlPart)
      continue
    }

    if (routePart !== urlPart) return null
  }

  return params
}

export async function resolveRoute(path = window.location.pathname) {
  const cleanPath = normalizePath(path)

  routerState.status = 'loading'
  routerState.path = cleanPath
  routerState.error = ''
  routerState.page = null
  routerState.params = {}
  routerState.meta = {}

  try {
    for (const route of routeRecords) {
      if (route.file.endsWith('/not-found.js')) continue

      const params = matchPath(route.path, cleanPath)

      if (params) {
        const module = await route.loader()
        const page = module.default

        if (typeof page !== 'function') {
          throw new Error(`${route.file} must default export a page function.`)
        }

        const pageMeta = module.meta || {}

        routerState.params = params
        routerState.page = page
        routerState.layout = pageMeta.layout || page.layout || 'basic'
        routerState.meta = pageMeta
        routerState.status = 'ready'
        if (pageMeta.title) document.title = pageMeta.title
        return
      }
    }

    const notFoundModule = await pageModules['../pages/not-found.js']?.()
    const notFoundMeta = notFoundModule?.meta || {}

    routerState.page = notFoundModule?.default ?? null
    routerState.layout = notFoundMeta.layout || routerState.page?.layout || 'basic'
    routerState.meta = notFoundMeta
    routerState.status = 'not-found'
    if (notFoundMeta.title) document.title = notFoundMeta.title
  } catch (error) {
    routerState.page = null
    routerState.layout = 'basic'
    routerState.meta = {}
    routerState.error = error instanceof Error ? error.message : String(error)
    routerState.status = 'error'
  }
}

// go() is now a thin wrapper — the navigate event handler owns everything.
export function go(path) {
  return window.navigation.navigate(normalizePath(path)).finished
}

// beforeEach(fn) registers a navigation guard.
// Guard receives { from, to }. Return false to cancel, a path string to redirect.
// Returns an unregister function.
export function beforeEach(fn) {
  guards.push(fn)
  return () => {
    const idx = guards.indexOf(fn)
    if (idx !== -1) guards.splice(idx, 1)
  }
}

// Runs the guard chain. Returns true to proceed, false to cancel,
// or a path string to redirect.
async function runGuards(from, to) {
  for (const guard of guards) {
    const result = await guard({ from, to })
    if (result === false || typeof result === 'string') return result
  }
  return true
}

function handleNavigate(event) {
  // Skip cross-origin navigations, downloads, etc.
  if (!event.canIntercept) return
  // Let hash-only changes pass through without a route update.
  if (event.hashChange) return

  const to = normalizePath(new URL(event.destination.url).pathname)
  const from = routerState.path

  event.intercept({
    handler: async () => {
      const result = await runGuards(from, to)
      if (result === false) {
        navigation.navigate(from, { history: 'replace' })
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

export function getRouteRecords() {
  return routeRecords.map(({ file, path }) => ({ file, path }))
}
