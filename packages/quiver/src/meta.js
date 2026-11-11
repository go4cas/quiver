import { watch } from '@arrow-js/core'

// Stop functions for any watchers created by the current page's useMeta() call.
// Cleared and replaced on each navigation so stale watchers don't accumulate.
/** @type {Array<() => void>} */
let activeStops = []

/** @typedef {import('./types.js').MetaValue} MetaValue */

// Stops any watchers registered by the previous page's useMeta() call.
// The router calls this on every navigation, so reactive titles never
// leak onto pages that don't use useMeta themselves.
export function clearMeta() {
  activeStops.forEach((stop) => stop())
  activeStops = []
}

// The host page's own title and description, captured by initRouter() (N128).
/** @type {{ title: string, description: string | null } | null} */
let defaults = null

const descriptionTag = () => document.querySelector('meta[name="description"]')

/** Remember the host page's title and description as the defaults. */
export function captureMetaDefaults() {
  defaults = { title: document.title, description: descriptionTag()?.getAttribute('content') ?? null }
}

/**
 * A navigation committed: stop the old page's watchers and put back the
 * defaults, then the page's static `meta.title`. useMeta() in the page that
 * renders next overrides them. A description tag the host page didn't have is
 * removed (N128).
 * @param {{ title?: unknown }} [meta]
 */
export function resetMeta(meta) {
  clearMeta()
  if (!defaults) return
  document.title = typeof meta?.title === 'string' && meta.title ? meta.title : defaults.title
  const tag = descriptionTag()
  if (defaults.description === null) tag?.remove()
  else if (tag) tag.setAttribute('content', defaults.description)
  else setDescription(defaults.description)
}

/** destroy(): put the defaults back and forget them. */
export function restoreMetaDefaults() {
  resetMeta()
  defaults = null
}

/** @param {string} content @returns {Element} */
function setDescription(content) {
  let tag = descriptionTag()
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
  return tag
}

// useMeta({ title, description }) — call at the top of any page function.
// Pass static strings for one-shot assignment, or arrow functions for reactive updates.
/**
 * @param {{ title?: MetaValue, description?: MetaValue }} [config]
 * @returns {void}
 */
export function useMeta({ title, description } = {}) {
  clearMeta()

  if (title) {
    if (typeof title === 'function') {
      const [, stop] = watch(() => { document.title = title() })
      activeStops.push(stop)
    } else {
      document.title = title
    }
  }

  if (description) {
    if (typeof description === 'function') {
      const meta = setDescription('')
      const [, stop] = watch(() => { meta.setAttribute('content', description()) })
      activeStops.push(stop)
    } else {
      setDescription(description)
    }
  }
}
