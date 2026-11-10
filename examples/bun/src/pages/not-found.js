import { html } from '@arrow-js/core'
import { url, useMeta, useRoute } from '@go4cas/quiver'

export default function NotFound() {
  useMeta({ title: 'Not found' })
  const route = useRoute()
  return html`<h1>Page not found</h1><p>Nothing at <code>${() => route.path()}</code>. <a href="${url('/')}">Go home</a></p>`
}
