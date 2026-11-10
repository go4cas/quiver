import { component, html } from '@arrow-js/core'
import { url, useRoute } from '@go4cas/quiver'

// Link recipe: a plain anchor with a reactive active state. The Navigation API already
// intercepts same-origin clicks, so there is no @click handler, and Cmd/Ctrl/
// middle-click open a new tab as usual (D18). url() adds the app's base path.
// Props:
//   to       base-relative target path, e.g. '/users'
//   children ArrowTemplate or string for link content
//   class    base class string (the active link gets aria-current="page" for CSS)
export const Link = component(/** @param {{ to: string, children?: any, class?: string }} props */ ({ to, children, class: cls = '' }) => {
  const route = useRoute()
  const isActive = () =>
    route.path() === to || (to !== '/' && route.path().startsWith(to + '/'))

  return html`
    <a
      href="${url(to)}"
      class="${cls}"
      aria-current="${() => (isActive() ? 'page' : false)}"
    >${children}</a>
  `
})
