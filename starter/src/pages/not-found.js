import { html } from '@arrow-js/core'
import { useRouter } from '@go4cas/quiver'

export const meta = {
  title: '404 – Not Found',
}

function NotFoundPage() {
  const router = useRouter()

  return html`
    <div class="not-found">
      <p class="not-found__code q-accent">404</p>
      <h1 class="not-found__title">Page not found</h1>
      <p class="not-found__text">The requested route does not exist.</p>
      <button
        type="button"
        class="btn not-found__action" data-variant="primary"
        @click="${() => router.go('/')}"
      >
        Back to dashboard
      </button>
    </div>
  `
}

export default NotFoundPage
