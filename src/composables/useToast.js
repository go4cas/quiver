import { toastState } from '../state/toastState.js'

/** @typedef {{ duration?: number, dismissible?: boolean }} ToastOptions */

/**
 * Toast notification dispatcher. Each method returns the toast id.
 * @returns {{
 *   success: (msg: string, opts?: ToastOptions) => string,
 *   error: (msg: string, opts?: ToastOptions) => string,
 *   warning: (msg: string, opts?: ToastOptions) => string,
 *   info: (msg: string, opts?: ToastOptions) => string,
 *   dismiss: (id: string) => void,
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
