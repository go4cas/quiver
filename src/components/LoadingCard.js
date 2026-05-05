import { html } from '@arrow-js/core'

export function LoadingCard() {
  return html`
    <div class="flex min-h-screen items-center justify-center bg-surface p-6">
      <div class="rounded-panel border border-line bg-surface-raised p-8 text-center shadow-panel">
        <div class="text-lg font-semibold text-fg">Loading…</div>
        <p class="mt-2 text-sm text-fg-soft">Resolving the current route.</p>
      </div>
    </div>
  `
}
