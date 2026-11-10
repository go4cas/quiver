import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { title: 'About' }

export default function About() {
  useMeta({ title: 'About' })
  return html`<h1>About</h1><p>A Quiver example app.</p>`
}
