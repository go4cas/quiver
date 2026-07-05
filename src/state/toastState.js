import { createStore } from '../framework/index.js'

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 * @typedef {{ id: string, message: string, type: ToastType, duration: number, dismissible: boolean }} Toast
 */

// Auto-dismiss timers by toast id — cleared on manual dismiss so a stale
// timer never fires against a toast that is already gone.
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timers = new Map()

export const toastState = createStore((reactive) =>
  reactive({
    toasts:     /** @type {Toast[]} */ ([]),
    dismissing: /** @type {string[]} */ ([]),
    config: {
      position:    'bottom-right',
      duration:    4000,
      dismissible: true,
    },

    /** @param {{ position?: string, duration?: number, dismissible?: boolean }} opts */
    configure(opts) {
      this.config = { ...this.config, ...opts }
    },

    /**
     * @param {string} message
     * @param {{ type?: ToastType, duration?: number, dismissible?: boolean }} [opts]
     * @returns {string} toast id
     */
    add(message, opts = {}) {
      const id          = crypto.randomUUID()
      const duration    = opts.duration    ?? this.config.duration
      const dismissible = opts.dismissible ?? this.config.dismissible
      this.toasts.push({ id, message, type: opts.type ?? 'info', duration, dismissible })
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
)
