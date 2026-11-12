import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { title: 'Home', nav: { label: 'Home', order: 1 } }

export default function Home() {
  useMeta({ title: 'Home' })
  return html`<h1>Home</h1>`
}
