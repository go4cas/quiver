import { html, reactive } from '@arrow-js/core'
import { useToast }   from '../composables/useToast.js'
import { toastState } from '../state/toastState.js'

export const meta = {
  layout: 'menu',
  title: 'Toasts',
}

const POSITIONS = [
  'bottom-right',
  'bottom-center',
  'bottom-left',
  'top-right',
  'top-center',
  'top-left',
]

function ToastsPage() {
  const toast = useToast()
  const form  = reactive({ position: 'bottom-right', duration: 4000, dismissible: true })

  const fire = (type) => {
    const messages = {
      success: 'Changes saved successfully.',
      error:   'Something went wrong. Please try again.',
      warning: 'Your session expires in 5 minutes.',
      info:    'A new version is available.',
    }
    toast[type](messages[type], {
      duration:    form.duration,
      dismissible: form.dismissible,
    })
  }

  return html`
    <div class="space-y-10">
      <div>
        <h1 class="text-2xl font-bold text-fg">Toasts</h1>
        <p class="mt-1 text-sm text-fg-soft">Global notifications via <code class="font-mono">useToast</code> and <code class="font-mono">toastState</code>.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-xs text-brand">useToast()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">add()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">dismiss()</span>
          <span class="rounded-full bg-surface-inset px-2.5 py-0.5 font-mono text-xs text-fg-faint">configure()</span>
        </div>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-panel border border-line bg-surface-raised p-6 shadow-panel">
          <h2 class="mb-4 text-sm font-semibold text-fg">Trigger</h2>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-control bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              @click="${() => fire('success')}"
            >Success</button>
            <button
              type="button"
              class="rounded-control bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              @click="${() => fire('error')}"
            >Error</button>
            <button
              type="button"
              class="rounded-control bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              @click="${() => fire('warning')}"
            >Warning</button>
            <button
              type="button"
              class="rounded-control bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              @click="${() => fire('info')}"
            >Info</button>
          </div>
          <p class="mt-4 font-mono text-xs text-fg-faint">
            ${() => toastState.toasts.length
              ? `${toastState.toasts.length} active`
              : 'none active'}
          </p>
        </div>

        <div class="rounded-panel border border-line bg-surface-raised p-6 shadow-panel">
          <h2 class="mb-4 text-sm font-semibold text-fg">Options</h2>
          <div class="space-y-3">
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium text-fg-soft">Duration (ms · 0 = permanent)</span>
              <input
                type="number"
                min="0"
                step="500"
                class="rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-sm text-fg focus:border-brand focus:outline-none"
                value="${() => form.duration}"
                @input="${(e) => { form.duration = Number(e.target.value) }}"
              />
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium text-fg-soft">Position</span>
              <select
                class="rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-sm text-fg focus:border-brand focus:outline-none"
                @change="${(e) => { form.position = e.target.value }}"
              >
                ${POSITIONS.map((p) =>
                  html`<option value="${p}" ${p === form.position ? 'selected' : ''}>${p}</option>`
                )}
              </select>
            </label>

            <label class="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-line accent-brand"
                ${() => form.dismissible ? 'checked' : ''}
                @change="${(e) => { form.dismissible = e.target.checked }}"
              />
              <span class="text-sm text-fg-soft">Dismissible</span>
            </label>
          </div>

          <button
            type="button"
            class="mt-4 rounded-control bg-surface-inset px-4 py-2 text-sm font-semibold text-fg-soft hover:bg-line"
            @click="${() => toastState.configure({ position: form.position, duration: form.duration, dismissible: form.dismissible })}"
          >Configure defaults</button>
        </div>
      </div>
    </div>
  `
}

export default ToastsPage
