import { html } from '@arrow-js/core'

export function LoadingCard() {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div class="text-lg font-semibold">Loading…</div>
        <p class="mt-2 text-sm text-slate-500">Resolving the current route.</p>
      </div>
    </div>
  `
}
