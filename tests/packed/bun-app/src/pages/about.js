import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { title: 'About', nav: { label: 'About', order: 2 } }

export default function About() {
  useMeta({ title: 'About' })
  return html`<h1>About</h1>`
}
