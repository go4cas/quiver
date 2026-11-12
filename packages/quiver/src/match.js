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
 * One rule a route pattern must follow: `code` names the rule, `test` is true
 * when the pattern breaks it.
 * @typedef {{ code: string, test: (pattern: string) => boolean }} PatternRule
 */

/**
 * The structural rules every route pattern follows, however the manifest was
 * made (M-2, M-3, S-3), in the order they are checked. `validateManifest` and
 * the scanner both use them and word their own diagnostics for each code (R14,
 * N170).
 * @type {readonly PatternRule[]}
 */
export const PATTERN_RULES = Object.freeze([
  { code: 'leading-slash', test: (p) => !p.startsWith('/') },
  { code: 'trailing-slash', test: (p) => p.length > 1 && p.endsWith('/') },
  { code: 'empty-segment', test: (p) => p.includes('//') },
  { code: 'query-or-hash', test: (p) => /[?#]/.test(p) },
  { code: 'wildcard', test: (p) => p.includes('*') },
])

/**
 * The first rule a pattern breaks, or null when it is valid: the rules in
 * PATTERN_RULES, then `extra` (a front end's own rules), then the parameter
 * rules (`param-name`, `param-repeat`, with the offending `segment`).
 * @param {string} pattern
 * @param {readonly PatternRule[]} [extra]
 * @returns {{ code: string, segment: string } | null}
 */
export function patternIssue(pattern, extra = []) {
  for (const rule of [...PATTERN_RULES, ...extra]) {
    if (rule.test(pattern)) return { code: rule.code, segment: '' }
  }
  const names = new Set()
  for (const segment of pattern.split('/').filter(Boolean)) {
    if (!segment.startsWith(':')) continue
    const name = segment.slice(1)
    if (!PARAM_NAME.test(name)) return { code: 'param-name', segment }
    if (names.has(name)) return { code: 'param-repeat', segment }
    names.add(name)
  }
  return null
}

/**
 * Collision check shared by the manifest and the scanner (M-4, S-4): `add()`
 * records a pattern for `owner` (a manifest key, a page file) and returns the
 * earlier owner it collides with, or null. `same` means one route spelled twice
 * (static segments compared canonically), `shape` means patterns that differ
 * only in parameter names. A colliding pattern is not recorded.
 * @template T
 * @returns {{ add: (pattern: string, owner: T) => { code: 'same' | 'shape', other: T } | null }}
 */
export function routeSet() {
  /** @type {Map<string, T>} canonical route → first owner */
  const routes = new Map()
  /** @type {Map<string, T>} shape (params erased) → first owner */
  const shapes = new Map()
  return {
    add(pattern, owner) {
      const { route, shape } = routeKeys(pattern)
      if (routes.has(route)) return { code: 'same', other: /** @type {T} */ (routes.get(route)) }
      if (shapes.has(shape)) return { code: 'shape', other: /** @type {T} */ (shapes.get(shape)) }
      routes.set(route, owner)
      shapes.set(shape, owner)
      return null
    },
  }
}

/** @type {Record<string, (segment: string) => string>} validateManifest's wording per rule */
const MANIFEST_MESSAGES = {
  'leading-slash': () => 'must start with "/".',
  'trailing-slash': () => 'must not end with "/".',
  'empty-segment': () => 'must not contain an empty segment ("//").',
  'query-or-hash': () => 'must not contain "?" or "#".',
  wildcard: () => 'must not contain a wildcard ("*").',
  'param-name': (segment) => `has an invalid parameter name "${segment}".`,
  'param-repeat': (segment) => `repeats the parameter "${segment}".`,
}

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

  /** @type {ReturnType<typeof routeSet<string>>} */
  const seen = routeSet()

  for (const [key, loader] of Object.entries(routes)) {
    const bad = (/** @type {string} */ why) => new TypeError(`initRouter(): route "${key}" ${why}`)

    if (typeof loader !== 'function') throw bad('must map to a loader function.')
    const issue = patternIssue(key)
    if (issue) throw bad(MANIFEST_MESSAGES[issue.code](issue.segment))

    const clash = seen.add(key, key)
    if (clash?.code === 'same') throw bad(`is the same route as "${clash.other}" (static segments are compared decoded), so one could never match.`)
    if (clash) throw bad(`differs from "${clash.other}" only in parameter names, so one could never match.`)
  }

  if (notFound !== undefined && typeof notFound !== 'function') {
    throw new TypeError('initRouter(): notFound must be a loader function.')
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

/**
 * Validate `initRouter`'s middleware (C-70): `global` an array of functions,
 * `sections` a plain object whose keys are valid patterns (M-21) mapping to
 * arrays of functions. Throws a TypeError naming the key or index.
 * @param {unknown} middleware
 */
export function validateMiddleware(middleware) {
  if (middleware === undefined) return
  if (!isPlainObject(middleware)) {
    throw new TypeError('initRouter(): middleware must be a plain object { global?, sections? }.')
  }
  /**
   * @param {unknown} list
   * @param {string} name
   */
  const checkList = (list, name) => {
    if (!Array.isArray(list)) throw new TypeError(`initRouter(): ${name} must be an array of guard functions.`)
    list.forEach((fn, i) => {
      if (typeof fn !== 'function') throw new TypeError(`initRouter(): ${name}[${i}] must be a function.`)
    })
  }
  if (middleware.global !== undefined) checkList(middleware.global, 'middleware.global')
  const { sections } = middleware
  if (sections === undefined) return
  if (!isPlainObject(sections)) {
    throw new TypeError('initRouter(): middleware.sections must be a plain object mapping patterns to guard arrays.')
  }
  for (const [key, list] of Object.entries(sections)) {
    const issue = patternIssue(key)
    if (issue) throw new TypeError(`initRouter(): middleware section "${key}" ${MANIFEST_MESSAGES[issue.code](issue.segment)}`)
    checkList(list, `middleware.sections["${key}"]`)
  }
}

/**
 * Whether the section pattern `section` covers the route pattern `route` (M-21):
 * the section's segments are a prefix of the route's, static segments compared
 * canonically and any two parameter segments equal. `'/'` covers every route.
 * @param {string} section
 * @param {string} route
 * @returns {boolean}
 */
export function sectionCovers(section, route) {
  const outer = section.split('/').filter(Boolean)
  const inner = route.split('/').filter(Boolean)
  if (outer.length > inner.length) return false
  return outer.every((seg, i) => {
    const other = inner[i]
    if (seg.startsWith(':') || other.startsWith(':')) return seg.startsWith(':') && other.startsWith(':')
    return seg === other || canonicalSegment(seg) === canonicalSegment(other)
  })
}

/**
 * Sort order for sections (M-21): fewer segments first (outermost), then by key
 * in code-unit order.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSections(a, b) {
  const depth = a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length
  if (depth) return depth
  return a < b ? -1 : a > b ? 1 : 0
}
