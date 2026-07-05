import { reactive } from '@arrow-js/core'

/**
 * @typedef {Object} RouterState
 * @property {string} path
 * @property {Record<string, string>} params
 * @property {(((...args: any[]) => unknown) & { layout?: string }) | null} page
 * @property {string} layout
 * @property {'idle' | 'loading' | 'ready' | 'not-found' | 'error'} status
 * @property {string} error
 * @property {Record<string, any>} meta
 */

export const routerState = reactive(/** @type {RouterState} */ ({
  path: window.location.pathname || '/',
  params: {},
  page: null,
  layout: 'basic',
  status: 'idle',
  error: '',
  meta: {},
}))
