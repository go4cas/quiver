import { createStore } from '../framework/index.js'

export const toastState = createStore((reactive) =>
  reactive({
    toasts: [],
    config: {
      position:    'bottom-right',
      duration:    4000,
      dismissible: true,
    },

    configure(opts) {
      this.config = { ...this.config, ...opts }
    },

    add(message, opts = {}) {
      const id          = crypto.randomUUID()
      const duration    = opts.duration    ?? this.config.duration
      const dismissible = opts.dismissible ?? this.config.dismissible
      this.toasts.push({ id, message, type: opts.type ?? 'info', duration, dismissible })
      if (duration > 0) setTimeout(() => this.dismiss(id), duration)
      return id
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  })
)
