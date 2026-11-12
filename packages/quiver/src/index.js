// Public entry of @go4cas/quiver: exactly the 13 names in planning/v3/TECH-SPEC.md §1.1.
export { provide, inject } from './context.js'
export { useMeta } from './meta.js'
export { url } from './base.js'
export { initRouter, go, beforeEach, afterEach, onError } from './router.js'
export { useRoute, useRouter } from './route.js'
export { createApp, destroy } from './app.js'

// Shared typedefs (TECH-SPEC §9), re-exported for .d.ts consumers.
/** @typedef {import('./types.js').RouteManifest} RouteManifest */
/** @typedef {import('./types.js').RouteLoader} RouteLoader */
/** @typedef {import('./types.js').PageModule} PageModule */
/** @typedef {import('./types.js').Page} Page */
/** @typedef {import('./types.js').PageMeta} PageMeta */
/** @typedef {import('./types.js').Layout} Layout */
/** @typedef {import('./types.js').LoadingView} LoadingView */
/** @typedef {import('./types.js').ErrorView} ErrorView */
/** @typedef {import('./types.js').ErrorViewProps} ErrorViewProps */
/** @typedef {import('./types.js').InitRouterOptions} InitRouterOptions */
/** @typedef {import('./types.js').CreateAppOptions} CreateAppOptions */
/** @typedef {import('./types.js').AppOptions} AppOptions */
/** @typedef {import('./types.js').App} App */
/** @typedef {import('./types.js').NavigationGuard} NavigationGuard */
/** @typedef {import('./types.js').GuardContext} GuardContext */
/** @typedef {import('./types.js').AfterEachHook} AfterEachHook */
/** @typedef {import('./types.js').AfterEachContext} AfterEachContext */
/** @typedef {import('./types.js').ErrorHook} ErrorHook */
/** @typedef {import('./types.js').ErrorContext} ErrorContext */
/** @typedef {import('./types.js').ErrorPhase} ErrorPhase */
/** @typedef {import('./types.js').RouteStatus} RouteStatus */
/** @typedef {import('./types.js').MetaValue} MetaValue */
/** @typedef {import('./types.js').AppManifest} AppManifest */
/** @typedef {import('./types.js').MiddlewareManifest} MiddlewareManifest */
/** @typedef {import('./types.js').NavItem} NavItem */
