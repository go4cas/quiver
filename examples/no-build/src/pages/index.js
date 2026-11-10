import { html } from '@arrow-js/core'
import { url, useMeta } from '@go4cas/quiver'

export const meta = { title: 'Home' }

export default function Home() {
  useMeta({ title: 'Home' })
  return html`
    <h1>Home</h1>
    <p>Three routes, one layout, no styling. Every link goes through <code>url()</code>, so the app runs at any base path.</p>
    <ul>
      <li><a href="${url('/users/1')}">Ada</a></li>
      <li><a href="${url('/users/2')}">Alan</a></li>
    </ul>
  `
}
