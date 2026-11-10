import { html } from '@arrow-js/core'
import { useMeta, useRoute } from '@go4cas/quiver'

/** @type {Record<string, string>} */
const USERS = { 1: 'Ada Lovelace', 2: 'Alan Turing' }

export const meta = { title: 'User' }

export default function User() {
  const route = useRoute()
  const name = () => USERS[route.params().id]
  useMeta({ title: () => name() ?? 'User not found' })
  return html`<h1>${() => name() ?? 'User not found'}</h1><p>Route parameter <code>id</code> is ${() => route.params().id}.</p>`
}
