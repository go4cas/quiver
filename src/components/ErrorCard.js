import { html } from '@arrow-js/core'
import { go } from '../framework/router.js'

export function ErrorCard(message = 'Something went wrong.') {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-surface p-6">
      <div class="max-w-md rounded-panel border border-red-200 bg-surface-raised p-8 text-center shadow-panel dark:border-red-900">
        <div class="text-lg font-semibold text-red-700 dark:text-red-400">Route error</div>
        <p class="mt-2 text-sm text-fg-soft">${message}</p>
        <button
          type="button"
          class="mt-5 rounded-control bg-fg px-4 py-2 text-sm font-semibold text-surface-raised hover:opacity-80"
          @click="${() => go('/')}"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  `
}
