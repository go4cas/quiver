import { component, html } from '@arrow-js/core'
import { go, useRoute } from '@go4cas/quiver'

// Link — navigation anchor with reactive active state.
// Props:
//   to       — target path string
//   children — ArrowTemplate or string for link content
//   class    — base class string (active item gets aria-current="page" for CSS targeting)
export const Link = component(/** @param {{ to: string, children?: any, class?: string }} props */ ({ to, children, class: cls = '' }) => {
  const route = useRoute()
  const isActive = () =>
    route.path() === to || (to !== '/' && route.path().startsWith(to + '/'))

  return html`
    <a
      href="${to}"
      class="${cls}"
      aria-current="${() => (isActive() ? 'page' : false)}"
      @click="${/** @param {Event} e */ (e) => { e.preventDefault(); go(to) }}"
    >${children}</a>
  `
})
