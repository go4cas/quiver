import { html } from '@arrow-js/core'
import { url } from '@go4cas/quiver'

/** @typedef {import('@go4cas/quiver').Layout} Layout */

/** @type {Layout} */
export const MainLayout = (content) => html`
  <nav>
    <a href="${url('/')}">Home</a>
    <a href="${url('/about')}">About</a>
    <a href="${url('/users/1')}">User 1</a>
  </nav>
  <main>${content}</main>
`
