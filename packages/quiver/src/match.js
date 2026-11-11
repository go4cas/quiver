// Route patterns: normalising, matching, sorting and manifest validation
// (TECH-SPEC §3, M-1…M-7). Pure functions, no state.

/**
 * Strip query and hash, and a trailing slash except on '/'.
 * @param {string} [path]
 * @returns {string}
 */
export function normalizePath(path = '/') {
  const clean = path.split('?')[0].split('#')[0] || '/'
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1)
  return clean
}

/**
 * 2.x specificity score: a static segment is worth 10, a parameter 1.
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
 * Sort order for route patterns (M-6): higher score first; ties broken segment by
 * segment, a static segment beating a parameter; then by key in code-unit order.
 * Key order in the manifest never affects the result.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareRoutes(a, b) {
  const score = scoreRoute(b) - scoreRoute(a)
  if (score) return score
  const as = a.split('/').filter(Boolean)
  const bs = b.split('/').filter(Boolean)
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    const ap = as[i].startsWith(':')
    const bp = bs[i].startsWith(':')
    if (ap !== bp) return ap ? 1 : -1
  }
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The one representation of a static segment (R05, N135): percent-escapes
 * decoded, then Unicode NFC. So `release notes` and `release%20notes`, or `café`,
 * `caf%C3%A9` and a decomposed `cafe\u0301`, are the same segment. A segment
 * with a malformed escape (`100%`) is kept as written. Takes one segment, never
 * a path, so a decoded `%2F` can't split it.
 * @param {string} segment
 * @returns {string}
 */
export function canonicalSegment(segment) {
  let text = segment
  if (segment.includes('%')) {
    try {
      text = decodeURIComponent(segment)
    } catch {
      // Malformed escape: compare the segment as written.
    }
  }
  return text.normalize('NFC')
}

/**
 * Two keys for a pattern, with static segments canonical: `route` keeps parameter
 * names, `shape` erases them. Equal `route`s are one route spelled twice; equal
 * `shape`s differ only in parameter names (M-4). Shared with the scanner.
 * @param {string} pattern
 * @returns {{ route: string, shape: string }}
 */
export function routeKeys(pattern) {
  const segments = pattern.split('/').filter(Boolean)
  const canonical = segments.map((s) => (s.startsWith(':') ? [s] : ['', canonicalSegment(s)]))
  return {
    route: JSON.stringify(canonical),
    shape: JSON.stringify(canonical.map((c) => (c.length === 1 ? null : c[1]))),
  }
}

/**
 * Static segments match on their canonical form (canonicalSegment), so a key
 * written literally (`/café`) or percent-encoded (`/caf%C3%A9`) matches the
 * encoded pathname the browser reports. Parameters are decoded on their own and
 * not normalised.
 * @param {string} routePath
 * @param {string} urlPath
 * @returns {Record<string, string> | null} matched params, or null if no match
 */
export function matchPath(routePath, urlPath) {
  const routeParts = normalizePath(routePath).split('/').filter(Boolean)
  const urlParts = normalizePath(urlPath).split('/').filter(Boolean)

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
        // Malformed percent-escape (e.g. '%zz'): use the raw segment
        // rather than turning the whole route into an error page.
        params[routePart.slice(1)] = urlPart
      }
      continue
    }

    if (routePart !== urlPart && canonicalSegment(routePart) !== canonicalSegment(urlPart)) return null
  }

  return params
}

const PARAM_NAME = /^[A-Za-z_$][\w$]*$/

/**
 * Validate a route manifest and the notFound loader (M-1…M-5). Throws a
 * TypeError naming the offending key.
 * @param {unknown} routes
 * @param {unknown} notFound
 */
export function validateManifest(routes, notFound) {
  if (routes === null || typeof routes !== 'object' || Array.isArray(routes) ||
      (Object.getPrototypeOf(routes) !== Object.prototype && Object.getPrototypeOf(routes) !== null)) {
    throw new TypeError('initRouter(): routes must be a plain object mapping patterns to loaders.')
  }

  /** @type {Map<string, string>} canonical route → first key spelling it */
  const same = new Map()
  /** @type {Map<string, string>} shape (params erased) → first key with that shape */
  const shapes = new Map()

  for (const [key, loader] of Object.entries(routes)) {
    const bad = (/** @type {string} */ why) => new TypeError(`initRouter(): route "${key}" ${why}`)

    if (typeof loader !== 'function') throw bad('must map to a loader function.')
    if (!key.startsWith('/')) throw bad('must start with "/".')
    if (key.length > 1 && key.endsWith('/')) throw bad('must not end with "/".')
    if (key.includes('//')) throw bad('must not contain an empty segment ("//").')
    if (/[?#]/.test(key)) throw bad('must not contain "?" or "#".')
    if (key.includes('*')) throw bad('must not contain a wildcard ("*").')

    const names = new Set()
    for (const segment of key.split('/').filter(Boolean)) {
      if (!segment.startsWith(':')) continue
      const name = segment.slice(1)
      if (!PARAM_NAME.test(name)) throw bad(`has an invalid parameter name "${segment}".`)
      if (names.has(name)) throw bad(`repeats the parameter "${segment}".`)
      names.add(name)
    }

    const { route, shape } = routeKeys(key)
    const twin = same.get(route)
    if (twin !== undefined) throw bad(`is the same route as "${twin}" (static segments are compared decoded), so one could never match.`)
    same.set(route, key)
    const other = shapes.get(shape)
    if (other !== undefined) throw bad(`differs from "${other}" only in parameter names, so one could never match.`)
    shapes.set(shape, key)
  }

  if (notFound !== undefined && typeof notFound !== 'function') {
    throw new TypeError('initRouter(): notFound must be a loader function.')
  }
}
