// The app's base path (TECH-SPEC C-13, C-20, C-22). Private to core: apps see
// base-relative paths everywhere, and only url() and rendered hrefs carry the base.

// Leading and trailing slash. '/' before initRouter() and after destroy().
let base = '/'

/** @returns {string} */
export function getBase() {
  return base
}

/** @param {string} value already resolved by resolveBase() */
export function setBase(value) {
  base = value
}

/**
 * Resolve the base path (D22): an explicit option wins; otherwise the directory
 * of `<base href>` when a `<base>` element exists; otherwise '/'. Never derived
 * from `document.baseURI` alone, which is the page URL when there is no `<base>`.
 * @param {string} [option]
 * @returns {string} absolute pathname with leading and trailing slash
 */
export function resolveBase(option) {
  if (option !== undefined) {
    if (typeof option !== 'string' || !option.startsWith('/')) {
      throw new TypeError(`initRouter(): base must be an absolute pathname starting with "/", got ${JSON.stringify(option)}.`)
    }
    return option.endsWith('/') ? option : option + '/'
  }
  const el = /** @type {HTMLBaseElement | null} */ (document.querySelector('base[href]'))
  if (el) {
    const pathname = new URL(el.href).pathname
    return pathname.slice(0, pathname.lastIndexOf('/') + 1)
  }
  return '/'
}

/**
 * The base-relative path for a raw (percent-encoded) pathname, or null when it
 * is outside the base. The base without its trailing slash counts as inside (D23).
 * @param {string} pathname
 * @param {string} [b] the base to strip; defaults to the current one
 * @returns {string | null}
 */
export function stripBase(pathname, b = base) {
  if (b === '/') return pathname
  if (pathname.startsWith(b)) return '/' + pathname.slice(b.length)
  if (pathname === b.slice(0, -1)) return '/'
  return null
}

/**
 * Base-aware href for a base-relative path. Query and hash are kept; absolute
 * URLs (`https:`, `mailto:`, `//host`) are returned unchanged.
 * @param {string} path
 * @returns {string}
 */
export function url(path) {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return path
  return base + (path.startsWith('/') ? path.slice(1) : path)
}
