import { html } from '@arrow-js/core'
import { useRouter } from '../composables/useRouter.js'

export const meta = {
  layout: 'basic',
  title: '404 – Not Found',
}

function NotFoundPage() {
  const router = useRouter()

  return html`
    <div class="text-center">
      <p class="font-mono text-xs font-semibold uppercase tracking-widest text-brand">404</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Page not found</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">The requested route does not exist.</p>
      <button
        type="button"
        class="mt-6 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        @click="${() => router.go('/')}"
      >
        Back to dashboard
      </button>
    </div>
  `
}

export default NotFoundPage
