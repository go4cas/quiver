import { component, html } from '@arrow-js/core'
import { url, useRoute } from '@go4cas/quiver'

// Link recipe: a plain anchor with a reactive active state. The Navigation API already
// intercepts same-origin clicks, so there is no @click handler, and Cmd/Ctrl/
// middle-click open a new tab as usual (D18). url() adds the app's base path.
// Props:
//   to       base-relative target path, e.g. '/users', or an http(s):, mailto: or tel: URL
//   children ArrowTemplate or string for link content
//   class    base class string (the active link gets aria-current="page" for CSS)

// Schemes a Link may point at (audit S04, N144). url() passes every absolute URL
// through, because asset URLs need that; a link built from data must not become
// javascript: or data:, so Link checks the scheme itself.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * The href for `to`: a relative path gets the base from url(); an absolute URL
 * passes only with an http(s), mailto or tel scheme. Anything else is null.
 * Browsers drop leading spaces and control characters and tabs or newlines inside
 * a URL, so the scheme is read the same way.
 * @param {string} to
 * @returns {string | null}
 */
export function linkHref(to) {
  const value = String(to)
  const cleaned = value.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '')
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(cleaned)
  if (scheme) return SAFE_SCHEMES.has(scheme[1].toLowerCase() + ':') ? value : null
  // Protocol-relative (//host) and backslash forms reach another origin over the
  // page's own scheme; leave those to a full https: URL.
  if (/^[/\\]{2}/.test(cleaned)) return null
  return url(value)
}

export const Link = component(/** @param {{ to: string, children?: any, class?: string }} props */ ({ to, children, class: cls = '' }) => {
  const route = useRoute()
  const href = linkHref(to)
  if (href === null) console.warn(`[link] refused href ${JSON.stringify(to)}: use a path, or an http(s):, mailto: or tel: URL`)
  const isActive = () =>
    route.path() === to || (to !== '/' && route.path().startsWith(to + '/'))

  return html`
    <a
      href="${href ?? false}"
      class="${cls}"
      aria-current="${() => (isActive() ? 'page' : false)}"
    >${children}</a>
  `
})
