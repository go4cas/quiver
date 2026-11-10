export { useFetch } from './useFetch.js'
export { useStorage } from './useStorage.js'
export { useMediaQuery } from './useMediaQuery.js'
export { useEventListener } from './useEventListener.js'

// Type-only re-exports for .d.ts consumers (N97), e.g. the UseFetchReturn type.

/** @typedef {import('./useFetch.js').UseFetchOptions} UseFetchOptions */
/** @typedef {import('./useFetch.js').UseFetchReturn} UseFetchReturn */
/** @template T @typedef {import('./useStorage.js').Serializer<T>} Serializer */
/** @template T @typedef {import('./useStorage.js').UseStorageOptions<T>} UseStorageOptions */
/** @template T @typedef {import('./useStorage.js').UseStorageReturn<T>} UseStorageReturn */
/** @typedef {import('./useMediaQuery.js').UseMediaQueryReturn} UseMediaQueryReturn */
/** @typedef {import('./useEventListener.js').ListenerTarget} ListenerTarget */
/** @typedef {import('./useEventListener.js').UseEventListenerReturn} UseEventListenerReturn */
