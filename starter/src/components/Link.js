import { component, html } from '@arrow-js/core'
import { url, useRoute } from '@go4cas/quiver'

// Link recipe: a plain anchor with a reactive active state. The Navigation API already
// intercepts same-origin clicks, so there is no @click handler, and Cmd/Ctrl/
// middle-click open a new tab as usual (D18). url() adds the app's base path.
// Props:
//   to       base-relative target path, e.g. '/users', or an http(s):, mailto: or tel: URL
//   children ArrowTemplate or string for link content
//   class    base class string (the current page's link gets aria-current="page",
//            and it and every link to a section above it get data-active, for CSS)

// Schemes a Link may point at (audit S04, N144). url() passes every absolute URL
// through, because asset URLs need that; a link built from data must not become
// javascript: or data:, so Link checks the scheme itself.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Where a Link goes: the href to render, and for an internal target its
 * base-relative path as canonical segments (null for an external URL).
 * @typedef {{ href: string, segments: string[] | null }} LinkTarget
 */

/**
 * One static path segment in the form the router matches on (canonicalSegment in
 * core's match.js, R05/N135): percent-escapes decoded, then Unicode NFC. A
 * malformed escape is kept as written.
 * @param {string} segment
 * @returns {string}
 */
function canonical(segment) {
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
 * @param {string} path a base-relative, percent-encoded pathname
 * @returns {string[]}
 */
function segmentsOf(path) {
  return path.split('/').filter(Boolean).map(canonical)
}

/**
 * Resolve `to` once, the way the browser will (audit S32-02, N220). A target with
 * a scheme is external: its parsed protocol must be http(s), mailto or tel. Any
 * other target is internal: it gets the base from url(), and the URL the browser
 * resolves from that href (against `document.baseURI`, so a `<base>` element
 * counts) must be on this origin and inside the base. Browsers drop leading
 * spaces and control characters and tabs or newlines inside a URL, so the scheme
 * is read the same way. Anything else is null.
 * @param {string} to
 * @returns {LinkTarget | null}
 */
export function resolveLink(to) {
  const value = String(to)
  const cleaned = value.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '')
  try {
    if (/^[a-z][a-z\d+.-]*:/i.test(cleaned)) {
      const dest = new URL(value, document.baseURI)
      return SAFE_SCHEMES.has(dest.protocol) ? { href: value, segments: null } : null
    }
    // Protocol-relative (//host) and backslash forms reach another origin over the
    // page's own scheme; leave those to a full https: URL.
    if (/^[/\\]{2}/.test(cleaned)) return null
    const href = url(value)
    const dest = new URL(href, document.baseURI)
    const base = new URL(url('/'), document.baseURI).pathname
    if (dest.origin !== window.location.origin) return null
    if (dest.pathname === base.slice(0, -1)) return { href, segments: [] }
    if (!dest.pathname.startsWith(base)) return null
    return { href, segments: segmentsOf(dest.pathname.slice(base.length)) }
  } catch {
    return null
  }
}

/**
 * The href for `to` (see resolveLink), or null when Link refuses it.
 * @param {string} to
 * @returns {string | null}
 */
export function linkHref(to) {
  return resolveLink(to)?.href ?? null
}

/**
 * How the current path relates to a link's target (R32-07): 'page' when they are
 * the same route, 'section' when the target is a section above it (never for
 * `/`), else null. Both sides compare as canonical segments, so `/release notes`
 * matches `/release%20notes`, and the target's query and hash don't count.
 * @param {string[]} target canonical segments of the link's path
 * @param {string} current the router's base-relative path
 * @returns {'page' | 'section' | null}
 */
export function activeState(target, current) {
  const path = segmentsOf(current)
  if (target.length > path.length) return null
  if (!target.every((segment, i) => segment === path[i])) return null
  if (target.length === path.length) return 'page'
  return target.length > 0 ? 'section' : null
}

export const Link = component(/** @param {{ to: string, children?: any, class?: string }} props */ ({ to, children, class: cls = '' }) => {
  const route = useRoute()
  const target = resolveLink(to)
  if (target === null) console.warn(`[link] refused href ${JSON.stringify(to)}: use a path inside the app, or an http(s):, mailto: or tel: URL`)
  const segments = target?.segments ?? null
  const active = () => (segments ? activeState(segments, route.path()) : null)

  return html`
    <a
      href="${target ? target.href : false}"
      class="${cls}"
      aria-current="${() => (active() === 'page' ? 'page' : false)}"
      data-active="${() => active() ?? false}"
    >${children}</a>
  `
})
