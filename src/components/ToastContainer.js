import { component, html } from '@arrow-js/core'
import { toastState }      from '../state/toastState.js'

/** @type {Record<string, string>} */
const POSITION = {
  'top-left':      'top-4 left-4',
  'top-center':    'top-4 left-1/2 -translate-x-1/2',
  'top-right':     'top-4 right-4',
  'bottom-left':   'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right':  'bottom-4 right-4',
}

const TYPE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  error:   'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  info:    'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
}

export const ToastContainer = component(() =>
  html`
    <div class="${() => `fixed z-50 flex flex-col gap-2 pointer-events-none ${POSITION[toastState.config.position] ?? POSITION['bottom-right']}`}">
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
