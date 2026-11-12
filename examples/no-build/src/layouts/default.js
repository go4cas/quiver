import { html } from '@arrow-js/core'
import { url } from '@go4cas/quiver'

// layouts/default.js: the layout for every page without `meta.layout` (D38).
/** @param {import('@arrow-js/core').ArrowRenderable} content */
export default function DefaultLayout(content) {
  return html`
    <nav>
      <a href="${url('/')}">Home</a>
      <a href="${url('/about')}">About</a>
      <a href="${url('/users/1')}">User 1</a>
    </nav>
    <main>${content}</main>
  `
}
