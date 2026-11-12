import { html } from '@arrow-js/core'
import { useMeta } from '@go4cas/quiver'

export const meta = { title: 'Sign in' }

export default function Login() {
  useMeta({ title: 'Sign in' })
  return html`<h1>Sign in</h1>`
}
