import { component, html, nextTick, reactive } from '@arrow-js/core'

// Toasts recipe: toastState (the store), useToast() (the API pages call) and
// ToastContainer (mount it once, e.g. in each layout). Styles: Toasts.css
// (classes q-toasts, q-toast, q-toast__*). Uses only @arrow-js/core, so it
// works in any Arrow app, with or without Quiver.

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 * @typedef {{ id: string, message: string, type: ToastType, duration: number, dismissible: boolean }} Toast
 * @typedef {{ duration?: number, dismissible?: boolean }} ToastOptions
 */

// Auto-dismiss timers by toast id, cleared on manual dismiss so a stale timer
// never fires against a toast that is already gone.
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timers = new Map()

export const toastState = reactive({
  toasts:     /** @type {Toast[]} */ ([]),
  dismissing: /** @type {string[]} */ ([]),

  /**
   * Shows a toast. Defaults live here: edit them to change every toast in the app.
   * `duration: 0` keeps the toast until it is dismissed.
   * @param {string} message
   * @param {{ type?: ToastType } & ToastOptions} [opts]
   * @returns {string} toast id
   */
  add(message, { type = 'info', duration = 4000, dismissible = true } = {}) {
    const id = crypto.randomUUID()
    this.toasts.push({ id, message, type, duration, dismissible })
    if (duration > 0) timers.set(id, setTimeout(() => this.dismiss(id), duration))
    return id
  },

  /**
   * Starts the exit: marks the toast `data-state="closing"`, waits for its exit
   * animation, then removes it. With no animation (reduced motion, or the CSS
   * not loaded) it is removed at once (D31).
   * @param {string} id
   * @returns {Promise<void>} resolves once the toast is removed
   */
  async dismiss(id) {
    if (this.dismissing.includes(id) || !this.toasts.some((t) => t.id === id)) return
    clearTimeout(timers.get(id))
    timers.delete(id)
    this.dismissing = [...this.dismissing, id]
    await exitAnimations(id)
    this.toasts     = this.toasts.filter((t) => t.id !== id)
    this.dismissing = this.dismissing.filter((d) => d !== id)
  },
})

/**
 * Waits for the animations running on a closing toast's element.
 * @param {string} id
 */
async function exitAnimations(id) {
  // Arrow applies data-state="closing" on its next flush, so look once it has.
  await nextTick()
  if (typeof document === 'undefined') return
  // Assumes one ToastContainer on the page (the layouts mount one each), so the first match is the toast.
  const el = document.querySelector(`.q-toast[data-id="${id}"]`)
  const animations = el && typeof el.getAnimations === 'function' ? el.getAnimations() : []
  // A cancelled animation rejects `finished`; the toast still goes.
  await Promise.all(animations.map((a) => a.finished.catch(() => {})))
}

/**
 * Toast notifications. Call it anywhere; each method returns the toast id.
 * @returns {{
 *   success: (msg: string, opts?: ToastOptions) => string,
 *   error: (msg: string, opts?: ToastOptions) => string,
 *   warning: (msg: string, opts?: ToastOptions) => string,
 *   info: (msg: string, opts?: ToastOptions) => string,
 *   dismiss: (id: string) => Promise<void>,
 * }}
 */
export function useToast() {
  return {
    success: (msg, opts) => toastState.add(msg, { ...opts, type: 'success' }),
    error:   (msg, opts) => toastState.add(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => toastState.add(msg, { ...opts, type: 'warning' }),
    info:    (msg, opts) => toastState.add(msg, { ...opts, type: 'info' }),
    dismiss: (id)        => toastState.dismiss(id),
  }
}

/** Renders the toast stack. Mount it once per page (the layouts recipe does). */
export const ToastContainer = component(() =>
  html`
    <div class="q-toasts">
      ${() => toastState.toasts.map((toast) =>
        html`
          <div
            class="q-toast q-panel"
            role="alert"
            data-id="${toast.id}"
            data-type="${toast.type}"
            data-state="${() => toastState.dismissing.includes(toast.id) ? 'closing' : 'open'}"
          >
            <span class="q-toast__message">${toast.message}</span>
            ${() => toast.dismissible
              ? html`
                  <button
                    type="button"
                    class="q-toast__dismiss"
                    aria-label="Dismiss"
                    @click="${() => toastState.dismiss(toast.id)}"
                  >✕</button>
                `
              : html``}
          </div>
        `.key(toast.id)
      )}
    </div>
  `
)
