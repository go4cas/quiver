import { component, html } from '@arrow-js/core'
import { toastState }      from '../state/toastState.js'

// Styles: ToastContainer.css (classes q-toasts, q-toast, q-toast__*).
export const ToastContainer = component(() =>
  html`
    <div class="q-toasts">
      ${() => toastState.toasts.map((toast) =>
        html`
          <div
            class="q-toast q-panel"
            role="alert"
            data-type="${toast.type}"
            data-state="${() => toastState.dismissing.includes(toast.id) ? 'closing' : 'open'}"
          >
            <span class="q-toast__message">${toast.message}</span>
            ${toast.dismissible
              ? html`
                  <button
                    type="button"
                    class="q-toast__dismiss"
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
