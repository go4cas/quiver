import { html } from '@arrow-js/core'
import { go } from '../framework/router.js'

export function ErrorCard(message = 'Something went wrong.') {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div class="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
        <div class="text-lg font-semibold text-rose-700">Route error</div>
        <p class="mt-2 text-sm text-slate-600">${message}</p>
        <button
          type="button"
          class="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          @click="${() => go('/')}"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  `
}
