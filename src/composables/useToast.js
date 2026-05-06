import { toastState } from '../state/toastState.js'

export function useToast() {
  return {
    success: (msg, opts) => toastState.add(msg, { ...opts, type: 'success' }),
    error:   (msg, opts) => toastState.add(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => toastState.add(msg, { ...opts, type: 'warning' }),
    info:    (msg, opts) => toastState.add(msg, { ...opts, type: 'info' }),
    dismiss: (id)        => toastState.dismiss(id),
  }
}
