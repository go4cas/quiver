import { watch } from '@arrow-js/core'

// Stop functions for any watchers created by the current page's useMeta() call.
// Cleared and replaced on each navigation so stale watchers don't accumulate.
let activeStops = []

// useMeta({ title, description }) — call at the top of any page function.
// Pass static strings for one-shot assignment, or arrow functions for reactive updates.
export function useMeta({ title, description } = {}) {
  activeStops.forEach((stop) => stop())
  activeStops = []

  if (title) {
    if (typeof title === 'function') {
      const [, stop] = watch(() => { document.title = title() })
      activeStops.push(stop)
    } else {
      document.title = title
    }
  }

  if (description) {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    if (typeof description === 'function') {
      const [, stop] = watch(() => { meta.setAttribute('content', description()) })
      activeStops.push(stop)
    } else {
      meta.setAttribute('content', description)
    }
  }
}
