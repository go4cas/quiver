import { reactive } from '@arrow-js/core'

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 * @typedef {{ id: string, message: string, type: ToastType, duration: number, dismissible: boolean }} Toast
 */

// Auto-dismiss timers by toast id — cleared on manual dismiss so a stale
// timer never fires against a toast that is already gone.
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timers = new Map()

export const toastState = reactive({
  toasts:     /** @type {Toast[]} */ ([]),
  dismissing: /** @type {string[]} */ ([]),
  /**
   * @param {string} message
   * @param {{ type?: ToastType, duration?: number, dismissible?: boolean }} [opts]
   * @returns {string} toast id
   */
  // Defaults live here — edit them to change every toast in the app.
  add(message, { type = 'info', duration = 4000, dismissible = true } = {}) {
    const id = crypto.randomUUID()
    this.toasts.push({ id, message, type, duration, dismissible })
    if (duration > 0) timers.set(id, setTimeout(() => this.dismiss(id), duration))
    return id
  },

  /** @param {string} id */
  dismiss(id) {
    if (this.dismissing.includes(id)) return
    clearTimeout(timers.get(id))
    timers.delete(id)
    this.dismissing = [...this.dismissing, id]
    setTimeout(() => {
      this.toasts     = this.toasts.filter((t) => t.id !== id)
      this.dismissing = this.dismissing.filter((d) => d !== id)
    }, 200)
  },
})
