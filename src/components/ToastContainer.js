import { component, html } from '@arrow-js/core'
import { toastState }      from '../state/toastState.js'

const TYPE = {
  success: 'border-success/30 bg-success-tint text-success',
  error:   'border-error/30 bg-error-tint text-error',
  warning: 'border-warning/30 bg-warning-tint text-warning',
  info:    'border-info/30 bg-info-tint text-info',
}

export const ToastContainer = component(() =>
  html`
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      ${() => toastState.toasts.map((toast) =>
        html`
          <div
            class="${() => `pointer-events-auto flex w-80 items-start gap-3 rounded-panel border px-4 py-3 text-sm shadow-float ${TYPE[toast.type] ?? TYPE.info} ${toastState.dismissing.includes(toast.id) ? 'animate-toast-out' : 'animate-toast-in'}`}"
            role="alert"
          >
            <span class="flex-1">${toast.message}</span>
            ${toast.dismissible
              ? html`
                  <button
                    type="button"
                    class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss"
                    @click="${() => toastState.dismiss(toast.id)}"
                  >✕</button>
                `
              : ''}
          </div>
        `.key(toast.id)
      )}
    </div>
  `
)
