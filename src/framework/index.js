// Leaf modules first: app.js transitively imports layouts/components/state,
// and state modules import createStore from this barrel. Evaluating store.js
// (and context/meta) before app.js keeps that cycle harmless in environments
// without cross-module function hoisting (e.g. Vitest's SSR transform).
export { createStore } from './store.js'
export { provide, inject } from './context.js'
export { useMeta } from './meta.js'
export { createApp } from './app.js'
